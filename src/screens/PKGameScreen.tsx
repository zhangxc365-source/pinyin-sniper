import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GameSettings, PlayerStats, Word, FeedbackData } from '../types';
import { BALLOON_COLORS } from '../constants';
import { getLessonWords, generateDistractors, generateDistractorsWords } from '../data/vocabulary';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Pause, Play, Headphones, Home, Trophy, Target, RotateCcw } from 'lucide-react';
import Balloon from '../components/ui/Balloon';
import confetti from 'canvas-confetti';
import { speakWithGemini, initAudio } from '../services/geminiService';

interface PKGameScreenProps {
  settings: GameSettings;
  onFinish: (stats1: PlayerStats, stats2: PlayerStats, feedback: FeedbackData[]) => void;
  onHome: () => void;
}

const initialPlayerStats = (): PlayerStats => ({
  score: 0,
  health: 3,
  correctAnswers: 0,
  wrongAnswers: 0,
  missedAnswers: 0,
  accuracy: 0,
  inventory: { hints: 3, scopes: 0, iceGuns: 0 },
  consecutiveCorrect: 0
});

export default function PKGameScreen({ settings, onFinish, onHome }: PKGameScreenProps) {
  const [player1, setPlayer1] = useState<PlayerStats>(initialPlayerStats());
  const [player2, setPlayer2] = useState<PlayerStats>(initialPlayerStats());
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [balloons, setBalloons] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [remainingIds, setRemainingIds] = useState<string[]>([]);
  const [p1Lockout, setP1Lockout] = useState(false);
  const [p2Lockout, setP2Lockout] = useState(false);
  const remainingIdsRef = useRef<string[]>([]);

  // Sync ref with state
  useEffect(() => {
    remainingIdsRef.current = remainingIds;
  }, [remainingIds]);

  const vocab = useMemo(() => getLessonWords(settings.level, settings.lesson), [settings.level, settings.lesson]);

  const playAudio = useCallback((input: Word | string) => {
    speakWithGemini(input);
  }, []);

  const spawnBalloons = useCallback(() => {
    let pool = vocab.filter(w => remainingIdsRef.current.includes(w.id));
    if (pool.length === 0) {
      pool = vocab;
    }
    
    const target = pool[Math.floor(Math.random() * pool.length)];
    setRemainingIds(prev => {
      const next = prev.filter(id => id !== target.id);
      const updated = next.length === 0 ? vocab.map(w => w.id) : next;
      remainingIdsRef.current = updated;
      return updated;
    });

    setCurrentWord(target);
    playAudio(target);

    let options: { content: string, pinyin: string, isCorrect: boolean }[] = [];

    if (settings.challengeMode === 'PINYIN') {
      const distractors = generateDistractors(target.pinyin, 6);
      options = [
        { content: target.pinyin, pinyin: target.pinyin, isCorrect: true },
        ...distractors.map(d => ({ content: d, pinyin: d, isCorrect: false }))
      ];
    } else {
      const distractors = generateDistractorsWords(target, 6);
      options = [
        { content: target.char, pinyin: target.pinyin, isCorrect: true },
        ...distractors.map(d => ({ content: d.char, pinyin: d.pinyin, isCorrect: false }))
      ];
    }

    options.sort(() => Math.random() - 0.5);
    
    // Pick 7 unique colors
    const colors = [...BALLOON_COLORS].sort(() => Math.random() - 0.5).slice(0, 7);

    // Per-side Jittered Grid: Specifically avoids inner edge (Center UI) and outer edges
    const generateSafePositions = (playerNum: 1 | 2) => {
      const cells: { x: number; y: number }[] = [];
      const cols = 3; 
      const rows = 4; // Fewer rows since we have 7 balloons
      
      // X Margins: Constant to keep toward side centers
      const xStart = playerNum === 1 ? 22 : 32;
      const xEnd = playerNum === 1 ? 68 : 78;
      
      // Y Margins: Shifted up (approx 1cm = ~8-10%)
      const yStart = 8;
      const yEnd = 64; // Raised bottom limit (was 80)

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          cells.push({
            x: xStart + c * (xEnd - xStart) / (cols - 1),
            y: yStart + r * (yEnd - yStart) / (rows - 1)
          });
        }
      }

      // We have 12 slots. Pick 7 and add small jitter.
      return cells.sort(() => Math.random() - 0.5).slice(0, 7).map(pos => ({
        x: pos.x + (Math.random() - 0.5) * 4,
        y: pos.y + (Math.random() - 0.5) * 4
      }));
    };

    const p1Positions = generateSafePositions(1);
    const p2Positions = generateSafePositions(2);

    setBalloons(options.map((opt, i) => ({ 
      content: opt.content, 
      pinyin: opt.pinyin, 
      isCorrect: opt.isCorrect, 
      colorClass: colors[i],
      p1Pos: p1Positions[i],
      p2Pos: p2Positions[i],
      id: `${i}-${Date.now()}` 
    })));
  }, [vocab, playAudio, settings.challengeMode, setRemainingIds]);

  useEffect(() => {
    const ids = vocab.map(w => w.id);
    setRemainingIds(ids);
    remainingIdsRef.current = ids;
    
    // Unlock engine
    initAudio();

    // Initial spawn
    if (ids.length > 0) {
      spawnBalloons();
    }
  }, [vocab]); // Only re-run when the vocabulary actually changes

  useEffect(() => {
    if (isPaused || isGameOver) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, isGameOver]);

  const handleEnd = useCallback(() => {
    if (isGameOver) {
      onFinish(player1, player2, feedback);
    }
  }, [onFinish, player1, player2, feedback, isGameOver]);

  useEffect(() => {
    if (isGameOver) {
      handleEnd();
    }
  }, [isGameOver, handleEnd]);

  useEffect(() => {
    if ((player1.health <= 0 || player2.health <= 0) && !isGameOver) {
      setIsGameOver(true);
    }
  }, [player1.health, player2.health, isGameOver]);

  const handleRestart = () => {
    setPlayer1(initialPlayerStats());
    setPlayer2(initialPlayerStats());
    setTimeLeft(60);
    setIsPaused(false);
    setIsGameOver(false);
    setFeedback([]);
    setP1Lockout(false);
    setP2Lockout(false);
    
    const ids = vocab.map(w => w.id);
    setRemainingIds(ids);
    remainingIdsRef.current = ids;
    spawnBalloons();
  };

  const handleShoot = (playerNum: 1 | 2, pinyin: string, isCorrect: boolean) => {
    if (!currentWord || isPaused || isGameOver) return;
    if (playerNum === 1 && p1Lockout) return;
    if (playerNum === 2 && p2Lockout) return;

    if (isCorrect) {
      confetti({
        particleCount: 20,
        spread: 50,
        origin: { x: playerNum === 1 ? 0.25 : 0.75, y: 0.5 }
      });
      if (playerNum === 1) {
        setPlayer1(p => ({ ...p, score: p.score + 10, correctAnswers: p.correctAnswers + 1 }));
      } else {
        setPlayer2(p => ({ ...p, score: p.score + 10, correctAnswers: p.correctAnswers + 1 }));
      }
      setFeedback(f => [...f, { word: currentWord, userPinyin: pinyin, isCorrect: true }]);
      spawnBalloons(); // Move to next word immediately on any success
    } else {
      // Misclick Penalty
      if (playerNum === 1) {
        setP1Lockout(true);
        setPlayer1(p => ({ ...p, score: Math.max(0, p.score - 5), health: p.health - 1, wrongAnswers: p.wrongAnswers + 1 }));
        setTimeout(() => setP1Lockout(false), 1000);
      } else {
        setP2Lockout(true);
        setPlayer2(p => ({ ...p, score: Math.max(0, p.score - 5), health: p.health - 1, wrongAnswers: p.wrongAnswers + 1 }));
        setTimeout(() => setP2Lockout(false), 1000);
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-sky-300 overflow-hidden">
      {/* P1 Side */}
      <PlayerSection 
        playerNum={1} 
        stats={player1} 
        balloons={balloons} 
        onShoot={(p: string, isCorrect: boolean) => handleShoot(1, p, isCorrect)} 
        isPaused={isPaused}
        locked={p1Lockout}
      />

      {/* Center Divider / Shared UI */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-4 bg-white/80 p-4 rounded-full shadow-2xl border-4 border-white backdrop-blur">
        <div className="text-2xl font-black text-sky-800">{timeLeft}s</div>
        <button 
          onClick={() => currentWord && playAudio(currentWord)}
          className="w-16 h-16 bg-sky-500 rounded-full flex items-center justify-center text-white"
        >
          <Headphones />
        </button>
        <button onClick={() => setIsPaused(!isPaused)} className="text-sky-600">
          {isPaused ? <Play fill="currentColor" /> : <Pause fill="currentColor" />}
        </button>
      </div>

      {/* P2 Side */}
      <PlayerSection 
        playerNum={2} 
        stats={player2} 
        balloons={balloons} 
        onShoot={(p: string, isCorrect: boolean) => handleShoot(2, p, isCorrect)} 
        isPaused={isPaused} 
        locked={p2Lockout}
      />

      <AnimatePresence>
        {isPaused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-sky-900/60 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-8 text-center"
          >
            <h2 className="text-6xl font-black text-white mb-12 italic uppercase tracking-tighter">Paused</h2>
            <div className="grid grid-cols-1 gap-4 w-full max-w-md">
              <button 
                onClick={() => setIsPaused(false)}
                className="bg-green-500 text-white p-5 rounded-3xl font-black text-2xl shadow-lg flex items-center justify-center gap-3 transition-transform hover:scale-105 active:scale-95"
              >
                <Play className="fill-white" /> CONTINUE (继续)
              </button>
              <button 
                onClick={handleRestart}
                className="bg-orange-500 text-white p-5 rounded-3xl font-black text-2xl shadow-lg flex items-center justify-center gap-3 transition-transform hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                <RotateCcw /> RESTART (重新开始)
              </button>
              <button 
                onClick={onHome}
                className="bg-white text-sky-800 p-5 rounded-3xl font-black text-2xl flex items-center justify-center gap-3 transition-transform hover:scale-105 active:scale-95"
              >
                <Home /> HOME (主页)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayerSection({ playerNum, stats, balloons, onShoot, isPaused, locked }: any) {
  return (
    <div className={`relative flex-1 h-1/2 md:h-full border-sky-400/50 ${playerNum === 1 ? 'md:border-r-4' : ''} overflow-hidden transition-all duration-300 ${locked ? 'bg-red-900/20 grayscale scale-[0.98]' : ''}`}>
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <motion.div 
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-red-500 font-black text-4xl italic drop-shadow-lg"
          >
            LOCKOUT!
          </motion.div>
        </div>
      )}

      <div className="absolute top-6 left-6 right-6 flex justify-between z-10">
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <Heart key={i} className={`w-6 h-6 transition-transform ${i < stats.health ? 'text-red-500 fill-red-500' : 'text-slate-300 scale-75'}`} />
          ))}
        </div>
        <div className="bg-white/80 px-4 py-1 rounded-full font-black text-sky-800">P{playerNum}: {stats.score}</div>
      </div>
      
      <div className={`relative h-full w-full pointer-events-auto transition-opacity ${locked ? 'opacity-30' : 'opacity-100'}`}>
        {!isPaused && balloons.map((b: any) => (
          <div 
            key={`${b.id}`}
            className="absolute p-4 -translate-x-1/2 -translate-y-1/2"
            style={{ 
              left: `${playerNum === 1 ? b.p1Pos.x : b.p2Pos.x}%`, 
              top: `${playerNum === 1 ? b.p1Pos.y : b.p2Pos.y}%` 
            }}
          >
            <Balloon 
              id={`pk-${playerNum}-${b.id}`}
              content={b.content}
              pinyin={b.pinyin}
              colorClass={b.colorClass}
              isVisible={true}
              isCorrect={b.isCorrect}
              onClick={(_, p) => !locked && onShoot(p, b.isCorrect)}
              isSmall={true}
            />
          </div>
        ))}
      </div>

      {/* Player Identity Label */}
      <div className="absolute bottom-4 left-4 opacity-30 text-5xl font-black text-white pointer-events-none">PLAYER {playerNum}</div>
    </div>
  );
}

function PropButton({ icon, count, onClick, color }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`relative w-20 h-20 ${color} text-white rounded-[20px] flex items-center justify-center shadow-lg group`}
    >
      {icon}
      <div className="absolute -top-2 -right-2 bg-white text-slate-800 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-sm font-black shadow-md">
        {count}
      </div>
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity rounded-[20px]" />
    </motion.button>
  );
}
