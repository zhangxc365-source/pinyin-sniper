import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GameSettings, PlayerStats, Word, FeedbackData } from '../types';
import { BALLOON_COLORS } from '../constants';
import { getLessonWords, getReviewWords, generateDistractors, generateDistractorsWords, SENTENCES } from '../data/vocabulary';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Pause, Play, HelpCircle, ShieldAlert, Snowflake, RotateCcw, Home, FastForward, Timer, Headphones, CheckCircle2, XCircle } from 'lucide-react';
import Balloon from '../components/ui/Balloon';
import confetti from 'canvas-confetti';
import { speakWithGemini, getSmartHint, initAudio } from '../services/geminiService';

interface GameScreenProps {
  settings: GameSettings;
  onFinish: (stats: PlayerStats, stats2?: PlayerStats, feedback?: FeedbackData[]) => void;
  onPause: () => void;
  onHome: () => void;
}

interface ActiveBalloon {
  id: string;
  content: string; // Char or Pinyin
  pinyin: string; // The match key
  isCorrect: boolean;
  x: number;
  y: number;
  colorClass: string;
}

export default function GameScreen({ settings, onFinish, onPause, onHome }: GameScreenProps) {
  // Game State
  const [stats, setStats] = useState<PlayerStats>({
    score: 0,
    health: 3,
    correctAnswers: 0,
    wrongAnswers: 0,
    missedAnswers: 0,
    accuracy: 0,
    inventory: { hints: 1, scopes: 0, iceGuns: 0 },
    consecutiveCorrect: 0
  });
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  
  // Audio & Word State
  const vocab = useMemo(() => getLessonWords(settings.level, settings.lesson), [settings.level, settings.lesson]);
  const reviewVocab = useMemo(() => getReviewWords(settings.level, settings.lesson), [settings.level, settings.lesson]);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [balloons, setBalloons] = useState<ActiveBalloon[]>([]);
  const [gameFeedback, setGameFeedback] = useState<FeedbackData[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [smartHint, setSmartHint] = useState<string | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [remainingIds, setRemainingIds] = useState<string[]>([]);
  const remainingIdsRef = useRef<string[]>([]);

  // Sync ref with state
  useEffect(() => {
    remainingIdsRef.current = remainingIds;
  }, [remainingIds]);

  // Crosshair
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const speak = useCallback((word: Word) => {
    speakWithGemini(word); 
  }, []);

  const spawnBalloons = useCallback(() => {
    if (!vocab.length) return;
    
    let target: Word;
    let pool = vocab.filter(w => remainingIdsRef.current.includes(w.id));
    
    if (pool.length === 0) {
      // Reset pool
      pool = vocab;
      const resetIds = vocab.map(w => w.id);
      setRemainingIds(resetIds);
      remainingIdsRef.current = resetIds;
    }
    
    target = pool[Math.floor(Math.random() * pool.length)];
    setRemainingIds(prev => {
      const updated = prev.filter(id => id !== target.id);
      remainingIdsRef.current = updated;
      return updated;
    });
    
    setCurrentWord(target);
    setShowHint(false);
    setSmartHint(null);
    speak(target);

    let options: { content: string, pinyin: string, isCorrect: boolean }[] = [];

    if (settings.challengeMode === 'PINYIN') {
      const distractors = generateDistractors(target.pinyin, 7);
      options = [
        { content: target.pinyin, pinyin: target.pinyin, isCorrect: true },
        ...distractors.map(d => ({ content: d, pinyin: d, isCorrect: false }))
      ];
    } else {
      // CHAR MODE
      const distractors = generateDistractorsWords(target, 7);
      options = [
        { content: target.char, pinyin: target.pinyin, isCorrect: true },
        ...distractors.map(d => ({ content: d.char, pinyin: d.pinyin, isCorrect: false }))
      ];
    }

    options.sort(() => Math.random() - 0.5);

    // Pick 8 unique colors
    const colors = [...BALLOON_COLORS].sort(() => Math.random() - 0.5).slice(0, 8);

    // Dynamic Orbital Distribution with Strict Collision Avoidance
    const generateSoloPositions = () => {
      const positions: { x: number; y: number }[] = [];
      const sectors = 8;
      const minDistance = 28; // Increased strict separation distance
      
      for (let i = 0; i < sectors; i++) {
        let found = false;
        let attempts = 0;

        while (!found && attempts < 200) {
          const baseAngle = (i * (360 / sectors)) * (Math.PI / 180);
          const angleOffset = (Math.random() - 0.5) * 0.6;
          const angle = baseAngle + angleOffset;
          
          const rx = 35 + Math.random() * 12;
          const ry = 30 + Math.random() * 10;
          
          let x = 46 + Math.cos(angle) * rx;
          let y = 30 + Math.sin(angle) * ry;
          
          // Apply jitter before safety check
          x += (Math.random() - 0.5) * 6;
          y += (Math.random() - 0.5) * 6;

          x = Math.max(12, Math.min(84, x));
          y = Math.max(10, Math.min(70, y));

          const isSafe = positions.every(p => {
            const dx = p.x - x;
            const dy = p.y - y;
            // Enhanced distance check to account for drift margin
            return Math.sqrt(dx * dx + dy * dy) > minDistance;
          });

          if (isSafe) {
            positions.push({ x, y });
            found = true;
          }
          attempts++;
        }

        if (!found) {
          // Robust fallback mapping
          positions.push({ x: 10 + i * 11, y: 15 + (i % 2) * 45 });
        }
      }
      
      return positions.sort(() => Math.random() - 0.5);
    };

    const soloPositions = generateSoloPositions();

    const newBalloons = options.map((opt, i) => ({
      id: `ball-${i}-${Date.now()}`,
      content: opt.content,
      pinyin: opt.pinyin,
      isCorrect: opt.isCorrect,
      x: soloPositions[i].x,
      y: soloPositions[i].y,
      colorClass: colors[i]
    }));

    setBalloons(newBalloons);
  }, [vocab, reviewVocab, speak, settings.challengeMode]);

  // Initial Spawn
  useEffect(() => {
    const ids = vocab.map(w => w.id);
    setRemainingIds(ids);
    
    // Unlock engine
    initAudio();

    // Initial spawn
    if (ids.length > 0) {
      spawnBalloons();
    }
  }, [vocab]); // Only re-run when level/lesson changes

  // Timer & Game Loop
  useEffect(() => {
    if (isPaused || isFrozen || isGameOver) return;

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
  }, [isPaused, isFrozen, isGameOver]);

  const handleEnd = useCallback(() => {
    if (isGameOver) {
      const accuracy = stats.correctAnswers / (stats.correctAnswers + stats.wrongAnswers + stats.missedAnswers || 1);
      onFinish({ ...stats, accuracy: accuracy * 100 }, undefined, gameFeedback);
    }
  }, [onFinish, stats, gameFeedback, isGameOver]);

  useEffect(() => {
    if (isGameOver) {
      handleEnd();
    }
  }, [isGameOver, handleEnd]);

  useEffect(() => {
    if (stats.health <= 0 && !isGameOver) {
      setIsGameOver(true);
    }
  }, [stats.health, isGameOver]);

  const handleRestart = () => {
    setStats({
      score: 0,
      health: 3,
      correctAnswers: 0,
      wrongAnswers: 0,
      missedAnswers: 0,
      accuracy: 0,
      inventory: { hints: 1, scopes: 0, iceGuns: 0 },
      consecutiveCorrect: 0
    });
    setTimeLeft(60);
    setIsPaused(false);
    setIsGameOver(false);
    setIsFrozen(false);
    setGameFeedback([]);
    
    const ids = vocab.map(w => w.id);
    setRemainingIds(ids);
    remainingIdsRef.current = ids;
    spawnBalloons();
  };

  const handleShoot = (balId: string, pinyin: string) => {
    if (!currentWord || isPaused || isGameOver) return;

    const isCorrect = pinyin === currentWord.pinyin;
    
    if (isCorrect) {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { x: mousePos.x / window.innerWidth, y: mousePos.y / window.innerHeight }
      });

      const newStats = {
        ...stats,
        score: stats.score + 10,
        correctAnswers: stats.correctAnswers + 1,
        consecutiveCorrect: stats.consecutiveCorrect + 1,
      };

      // Scope reward
      if (newStats.consecutiveCorrect % 3 === 0) {
        newStats.inventory.scopes += 1;
      }

      setStats(newStats);
      setGameFeedback(prev => [...prev, { word: currentWord, userPinyin: pinyin, isCorrect: true }]);
      
      // Delay next spawn for effect
      setTimeout(spawnBalloons, 1000);
    } else {
      setStats(prev => ({
        ...prev,
        score: Math.max(0, prev.score - 5),
        health: prev.health - 1,
        wrongAnswers: prev.wrongAnswers + 1,
        consecutiveCorrect: 0
      }));
      setGameFeedback(prev => [...prev, { word: currentWord, userPinyin: pinyin, isCorrect: false }]);
      // Word repeats if wrong (or moves to next if we want harder)
      // Requested: "選錯或未被選擇的詞語反复出現直至選對或倒计时结束"
    }
  };

  const useHint = async () => {
    if (stats.inventory.hints > 0 && !showHint && currentWord) {
      setStats(prev => ({
        ...prev,
        inventory: { ...prev.inventory, hints: prev.inventory.hints - 1 }
      }));
      setShowHint(true);
      const hint = await getSmartHint(currentWord.char, currentWord.pinyin, currentWord.en);
      setSmartHint(hint || null);
    }
  };

  const useScope = () => {
    if (stats.inventory.scopes > 0) {
      const wrongBalloons = balloons.filter(b => !b.isCorrect);
      const toRemove = wrongBalloons.sort(() => Math.random() - 0.5).slice(0, 2);
      const toRemoveIds = toRemove.map(b => b.id);
      
      setBalloons(prev => prev.filter(b => !toRemoveIds.includes(b.id)));
      setStats(prev => ({
        ...prev,
        inventory: { ...prev.inventory, scopes: prev.inventory.scopes - 1 }
      }));
    }
  };

  const [isPracticeOpen, setIsPracticeOpen] = useState(false);

  const useIceGun = () => {
    if (stats.inventory.iceGuns > 0 && !isFrozen) {
      setIsFrozen(true);
      setStats(prev => ({
        ...prev,
        inventory: { ...prev.inventory, iceGuns: prev.inventory.iceGuns - 1 }
      }));
      setTimeout(() => setIsFrozen(false), 5000);
    } else if (stats.inventory.iceGuns === 0) {
      setIsPaused(true);
      setIsPracticeOpen(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex flex-col immersive-bg overflow-hidden cursor-none"
    >
      {/* Top Header */}
      <div className="relative z-20 flex justify-between items-center p-6 top-bar-immersive h-[80px]">
        <div className="flex items-center gap-4">
          <div className="timer-box-immersive text-white flex items-center gap-2 shadow-sm font-bold text-[32px]">
            <Timer className={`w-8 h-8 ${timeLeft < 10 ? 'animate-pulse text-red-200' : ''}`} />
            <span>{timeLeft}s</span>
          </div>
          
          <div className="flex gap-2 ml-4">
            {[...Array(3)].map((_, i) => (
              <Heart 
                key={i} 
                className={`w-9 h-9 transition-all drop-shadow-[0_0_10px_rgba(255,0,0,0.5)] ${i < stats.health ? 'text-ui-red fill-ui-red' : 'text-[#555] grayscale'}`} 
              />
            ))}
          </div>
        </div>

        <div className="text-white text-[28px] font-black uppercase">
          Score: {stats.score.toLocaleString()}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setIsPaused(!isPaused)} className="w-[50px] h-[50px] bg-white rounded-xl flex items-center justify-center font-bold shadow-[0_4px_0_#ddd] text-sky-600 transition-transform active:translate-y-1 active:shadow-none">
            {isPaused ? <Play className="w-6 h-6 fill-sky-600" /> : <Pause className="w-6 h-6 fill-sky-600" />}
          </button>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Central Audio Button/Prompt */}
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-50">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => currentWord && speak(currentWord)}
            className={`w-[120px] h-[120px] speaker-icon-immersive flex items-center justify-center ${isPaused ? 'opacity-50' : ''}`}
          >
            <Headphones className="w-14 h-14 text-ui-gold" />
          </motion.button>
          
          <AnimatePresence>
            {showHint && currentWord && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 bg-white/95 px-8 py-3 rounded-[24px] shadow-xl text-center max-w-[280px] border-2 border-sky-100"
              >
                <div className="text-[20px] font-black text-sky-600 mb-1">
                  {settings.challengeMode === 'PINYIN' ? currentWord.char : currentWord.pinyin}
                </div>
                {smartHint && (
                  <div className="text-[14px] font-bold text-slate-500 italic leading-tight">
                    "{smartHint}"
                  </div>
                )}
                {!smartHint && <div className="text-[10px] animate-pulse text-sky-300">Gemini is thinking...</div>}
              </motion.div>
            )}
          </AnimatePresence>
          {!showHint && <div className="mt-2 text-[18px] font-bold text-[#333] uppercase bg-white px-4 py-1 rounded-full whitespace-nowrap">Click to Listen (点击收听)</div>}
        </div>

        {/* Balloons */}
        {!isPaused && balloons.map((b) => (
          <div 
            key={b.id} 
            className="absolute transition-all duration-300 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
          >
            <Balloon 
              id={b.id} 
              content={b.content} 
              pinyin={b.pinyin}
              colorClass={b.colorClass}
              isVisible={true} 
              isCorrect={b.isCorrect}
              onClick={handleShoot}
            />
          </div>
        ))}
      </div>

      {/* Bottom Inventory */}
      <div className="relative z-20 p-6 flex justify-center gap-8 item-bar-immersive h-[120px] items-center">
        <PropButton 
          icon={<HelpCircle className="w-8 h-8" />} 
          label="Hint (提示卡)" 
          count={stats.inventory.hints} 
          onClick={useHint} 
        />
        <PropButton 
          icon={<ShieldAlert className="w-8 h-8" />} 
          label="Scope (倍镜)" 
          count={stats.inventory.scopes} 
          onClick={useScope} 
          disabled={stats.inventory.scopes === 0}
        />
        <PropButton 
          icon={<Snowflake className="w-8 h-8" />} 
          label={`Freeze (冰冻枪)${isFrozen ? ' [ACT]' : ''}`} 
          count={stats.inventory.iceGuns} 
          onClick={useIceGun} 
          disabled={isFrozen}
        />
      </div>

      <WordPracticeModal 
        isOpen={isPracticeOpen} 
        vocab={vocab}
        challengeMode={settings.challengeMode}
        onClose={() => {
          setIsPracticeOpen(false);
          setIsPaused(false);
        }}
        onSuccess={() => {
          setStats(prev => ({
            ...prev,
            inventory: { ...prev.inventory, iceGuns: prev.inventory.iceGuns + 1 }
          }));
          setIsPracticeOpen(false);
          setIsPaused(false);
        }}
      />

      {/* Crosshair Cursor */}
      <div 
        className="pointer-events-none fixed z-[200] w-[60px] h-[60px] border-2 border-ui-red rounded-full flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
        style={{ left: mousePos.x, top: mousePos.y }}
      >
        <div className="w-full h-[2px] bg-ui-red absolute" />
        <div className="h-full w-[2px] bg-ui-red absolute" />
      </div>

      {/* Pause Menu Overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-sky-900/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
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

      {/* Ice Freeze Effect Overlay */}
      <AnimatePresence>
        {isFrozen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-50 bg-blue-300"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PropButton({ icon, label, count, onClick, disabled }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`relative group w-[160px] h-[90px] flex flex-col items-center justify-center transition-all item-slot-immersive ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'item-slot-active-immersive'}`}
    >
      <div className="text-sky-600 mb-1">{icon}</div>
      <div className="text-[12px] font-bold text-[#666] uppercase">{label}</div>
      <div className="absolute -top-[10px] -right-[10px] bg-ui-red text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-[14px] border-2 border-white shadow-sm z-30">
        {count}
      </div>
    </motion.button>
  );
}

function WordPracticeModal({ isOpen, vocab, challengeMode, onClose, onSuccess }: any) {
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [options, setOptions] = useState<{ text: string; isCorrect: boolean }[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');

  const generateChallenge = useCallback(() => {
    if (!vocab.length) return;
    const target = vocab[Math.floor(Math.random() * vocab.length)];
    setCurrentWord(target);
    
    // Distractors from same vocab pool
    const otherWords = vocab.filter((w: Word) => w.id !== target.id);
    const distractors = otherWords
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((w: Word) => ({ text: w.en, isCorrect: false }));
    
    const allOptions = [
      { text: target.en, isCorrect: true },
      ...distractors
    ].sort(() => Math.random() - 0.5);
    
    setOptions(allOptions);
    setStatus('IDLE');
  }, [vocab]);

  useEffect(() => {
    if (isOpen) {
      generateChallenge();
    }
  }, [isOpen, generateChallenge]);

  const handleOptionClick = (isCorrect: boolean) => {
    if (status !== 'IDLE') return;
    
    if (isCorrect) {
      setStatus('CORRECT');
      setTimeout(onSuccess, 1500);
    } else {
      setStatus('WRONG');
      setTimeout(generateChallenge, 1500);
    }
  };

  if (!isOpen || !currentWord) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-[300] bg-sky-900/90 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <div className="bg-white w-full max-w-lg rounded-[48px] p-10 shadow-2xl relative overflow-hidden">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
          <XCircle size={32} />
        </button>
        <div className="text-center mb-8">
          <div className="inline-block bg-sky-100 text-sky-600 px-4 py-1 rounded-full text-sm font-black uppercase mb-4 tracking-widest">
            ICE GUN CHALLENGE • 词语练习
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase leading-tight">Choose the correct meaning</h2>
          <p className="text-slate-500 font-bold uppercase text-xs">选择正确的含义</p>
        </div>

        <div className="flex flex-col items-center mb-10">
          <div className="bg-sky-50 w-full p-8 rounded-[32px] border-4 border-dashed border-sky-100 flex flex-col items-center">
            <div className="text-7xl font-black text-sky-600 mb-2 drop-shadow-sm">
              {challengeMode === 'PINYIN' ? currentWord.pinyin : currentWord.char}
            </div>
            <div className="h-1 w-20 bg-sky-200 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {options.map((opt, idx) => (
            <motion.button
              key={idx}
              whileHover={ status === 'IDLE' ? { scale: 1.02 } : {} }
              whileTap={ status === 'IDLE' ? { scale: 0.98 } : {} }
              onClick={() => handleOptionClick(opt.isCorrect)}
              className={`p-5 rounded-3xl font-black text-xl flex items-center justify-between border-2 transition-all ${
                status === 'IDLE' 
                  ? 'bg-white border-slate-100 text-slate-700 hover:border-sky-400 hover:bg-sky-50 shadow-sm' 
                  : opt.isCorrect 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'bg-white border-slate-100 text-slate-300'
              }`}
            >
              <span className="uppercase">{opt.text}</span>
              {status === 'CORRECT' && opt.isCorrect && <CheckCircle2 size={28} className="text-white" />}
              {status === 'WRONG' && !opt.isCorrect && <XCircle size={28} className="text-white opacity-0" />}
            </motion.button>
          ))}
        </div>

        <div className="mt-8 text-center h-8">
          <AnimatePresence>
            {status === 'CORRECT' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-green-500 font-black text-2xl uppercase italic">
                Awesome! (太棒了!)
              </motion.div>
            )}
            {status === 'WRONG' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 font-black text-2xl uppercase italic">
                Try again! (再试一次!)
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-sky-50 rounded-full -z-10 opacity-60" />
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-blue-50 rounded-full -z-10 opacity-40" />
      </div>
    </motion.div>
  );
}

