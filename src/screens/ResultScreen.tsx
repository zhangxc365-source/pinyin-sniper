import { PlayerStats, FeedbackData, GameSettings } from '../types';
import { motion } from 'motion/react';
import { Trophy, RefreshCcw, Home, ChevronRight, CheckCircle2, XCircle, Headphones, Cloud } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect, useMemo } from 'react';
import { speakWithGemini } from '../services/geminiService';

interface ResultScreenProps {
  settings: GameSettings;
  stats1: PlayerStats;
  stats2?: PlayerStats;
  feedback: FeedbackData[];
  onHome: () => void;
  onRestart: () => void;
  onNext: () => void;
}

export default function ResultScreen({ settings, stats1, stats2, feedback, onHome, onRestart, onNext }: ResultScreenProps) {
  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  const winnersP1 = useMemo(() => {
    if (!stats2) return true;
    // Health priority: Running out of lives is an automatic loss
    if (stats1.health > 0 && stats2.health <= 0) return true;
    if (stats2.health > 0 && stats1.health <= 0) return false;
    // If both have health or both have 0 health, compare scores
    return stats1.score >= stats2.score;
  }, [stats1, stats2]);

  const uniqueFeedback = useMemo(() => {
    const seen = new Set();
    return feedback.filter(f => {
      const id = f.word.id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [feedback]);

  const speak = (text: string) => {
    speakWithGemini(text);
  };

  return (
    <div className="h-screen bg-sky-200 p-6 flex flex-col items-center relative overflow-hidden">
      {/* Decorative Clouds */}
      <div className="absolute top-10 left-10 text-white/40"><Cloud size={80} fill="currentColor" /></div>
      <div className="absolute top-20 right-10 text-white/30"><Cloud size={120} fill="currentColor" /></div>
      
      {/* Decorative Balloons */}
      <motion.div 
        animate={{ y: [0, -20, 0] }} 
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute top-1/2 left-4 w-8 h-10 bg-purple-400 rounded-full opacity-40"
      />
      <motion.div 
        animate={{ y: [0, -30, 0] }} 
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute bottom-1/4 right-4 w-10 h-12 bg-green-400 rounded-full opacity-40"
      />

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center mb-6 z-10 shrink-0"
      >
        <Trophy className="w-16 h-16 text-yellow-500 mb-2 drop-shadow-md" />
        <h2 className="text-3xl font-black text-sky-800 uppercase italic tracking-tighter">Mission Completed</h2>
      </motion.div>

      <div className={`grid ${stats2 ? 'grid-cols-2' : 'grid-cols-1'} gap-6 w-full max-w-4xl mb-6 shrink-0`}>
        <StatCard 
          title={stats2 ? "PLAYER 1" : "TOTAL SCORE"} 
          stats={stats1} 
          isWinner={winnersP1}
          primaryColor="text-sky-600"
          showKO={!!stats2}
        />
        {stats2 && (
          <StatCard 
            title="PLAYER 2" 
            stats={stats2} 
            isWinner={!winnersP1}
            primaryColor="text-orange-500"
            showKO={true}
          />
        )}
      </div>

      {/* Pinyin Summary List (Scrollable) */}
      <div className="w-full max-w-4xl bg-white/60 rounded-[40px] p-8 mb-6 shadow-sm border-2 border-white/40 flex flex-col min-h-0 flex-1">
        <h3 className="text-xl font-black text-sky-800 mb-4 uppercase tracking-widest flex items-center gap-2 shrink-0">
          <ChevronRight className="w-6 h-6 text-sky-500" /> Pinyin Summary
        </h3>
        
        <div className="overflow-y-auto flex-1 rounded-[24px] pr-2 custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white/80 backdrop-blur-sm z-10">
              <tr className="border-b border-sky-100 text-sky-600/60 uppercase text-[10px] font-bold tracking-widest">
                <th className="py-4 px-4 whitespace-nowrap">Audio</th>
                <th className="py-4 px-4 whitespace-nowrap">Character</th>
                <th className="py-4 px-4 whitespace-nowrap">Pinyin</th>
                <th className="py-4 px-4 text-right">Meaning</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 font-medium">
              {uniqueFeedback.map((f, i) => (
                <tr key={i} className="border-b border-sky-50/50 hover:bg-white/40 transition-colors">
                  <td className="py-4 px-4">
                    <button 
                      onClick={() => speak(f.word.char)}
                      className="p-2 bg-sky-100 text-sky-600 rounded-lg hover:bg-sky-200"
                    >
                      <Headphones className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="py-4 px-4 text-2xl font-serif">{f.word.char}</td>
                  <td className="py-4 px-4 text-sky-600 font-bold text-lg">{f.word.pinyin}</td>
                  <td className="py-4 px-4 text-right text-slate-400 italic">{f.word.en}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {uniqueFeedback.length === 0 && (
            <div className="text-center py-10 text-slate-400 italic">No words captured this session</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-4xl pb-6 shrink-0">
        <ActionButton 
          onClick={onHome} 
          icon={<Home />} 
          label="HOME (主页)" 
          color="bg-slate-500" 
        />
        <ActionButton 
          onClick={onRestart} 
          icon={<RefreshCcw />} 
          label="PLAY AGAIN (再玩一次)" 
          color="bg-orange-500" 
        />
        <ActionButton 
          onClick={onNext} 
          icon={<ChevronRight />} 
          label="NEXT LEVEL (下一关)" 
          color="bg-green-500" 
          primary
        />
      </div>
    </div>
  );
}

function StatCard({ title, stats, isWinner, primaryColor, showKO }: any) {
  const isKO = showKO && stats.health <= 0;
  
  return (
    <div className={`relative bg-white p-10 rounded-[40px] shadow-sm flex flex-col items-center overflow-hidden border-4 transition-all ${isWinner ? 'border-yellow-400 scale-105' : 'border-white opacity-90'}`}>
      {isWinner && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-400 py-1 font-black text-[10px] text-yellow-900 uppercase tracking-[0.3em] shadow-sm text-center">
          WINNER
        </div>
      )}
      
      {isKO && (
        <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center pointer-events-none">
          <div className="rotate-[-12deg] border-8 border-red-500 px-6 py-2 rounded-xl text-red-500 font-black text-6xl opacity-40">K.O.</div>
        </div>
      )}

      <div className="text-slate-300 font-black text-xs uppercase tracking-[0.2em] mb-4 mt-2">{title}</div>
      <div className={`text-8xl font-black ${isKO ? 'text-slate-300 line-through' : primaryColor}`}>
        {stats.score}
      </div>
      
      {isKO && <div className="text-red-500 font-bold text-[10px] mt-1 uppercase tracking-widest">Out of Hearts</div>}
    </div>
  );
}

function ActionButton({ onClick, icon, label, color, primary }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex-1 ${color} text-white py-5 rounded-[28px] font-black text-xl shadow-[0_6px_0_rgb(0,0,0,0.1)] flex items-center justify-center gap-3 transition-all ${primary ? 'ring-8 ring-green-100' : ''}`}
    >
      {icon} {label}
    </motion.button>
  );
}
