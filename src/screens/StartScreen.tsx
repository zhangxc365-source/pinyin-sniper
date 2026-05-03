import { GameMode } from '../types';
import { motion } from 'motion/react';
import { Target, Users, BookOpen, Cloud, RefreshCcw } from 'lucide-react';

interface StartScreenProps {
  onStart: (mode: GameMode) => void;
  onShowInst: () => void;
}

export default function StartScreen({ onStart, onShowInst }: StartScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-sky-200 relative overflow-hidden">
      {/* Decorative Clouds */}
      <motion.div 
        animate={{ x: [-20, 20, -20] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 left-10 text-white/40"
      >
        <Cloud size={100} fill="currentColor" />
      </motion.div>
      <motion.div 
        animate={{ x: [20, -20, 20] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute top-40 right-20 text-white/30"
      >
        <Cloud size={150} fill="currentColor" />
      </motion.div>
      <motion.div 
        animate={{ x: [-10, 10, -10] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-40 left-20 text-white/20"
      >
        <Cloud size={80} fill="currentColor" />
      </motion.div>

      {/* Decorative Balloons */}
      <motion.div 
        animate={{ y: [-10, 10, -10], rotate: [-5, 5, -5] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute top-1/4 right-1/4 w-12 h-16 bg-red-400 rounded-full opacity-60"
      />
      <motion.div 
        animate={{ y: [10, -10, 10], rotate: [5, -5, 5] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute bottom-1/4 left-1/4 w-10 h-14 bg-yellow-400 rounded-full opacity-60"
      />

      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-16 z-10"
      >
        <h1 className="text-8xl font-black text-sky-700 drop-shadow-lg mb-4 uppercase tracking-widest font-sans">Pinyin Sniper</h1>
        <p className="text-7xl font-bold text-sky-600">拼音狙击手</p>
      </motion.div>

      <div className="flex flex-col gap-8 w-full max-w-lg z-10">
        <MenuButton 
          onClick={() => onStart('SOLO')} 
          color="bg-orange-500 hover:bg-orange-600"
          icon={<Target className="w-8 h-8" />}
          label="单人模式"
          subLabel="SOLO MODE"
        />
        <MenuButton 
          onClick={() => onStart('PK')} 
          color="bg-red-500 hover:bg-red-600"
          icon={<Users className="w-8 h-8" />}
          label="对战模式"
          subLabel="PK MODE"
        />
        <MenuButton 
          onClick={onShowInst} 
          color="bg-sky-500 hover:bg-sky-600"
          icon={<BookOpen className="w-8 h-8" />}
          label="游戏说明"
          subLabel="INTRODUCTION"
        />
      </div>


      {/* Removed bottom text per request */}
    </div>
  );
}

function MenuButton({ onClick, color, icon, label, subLabel }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${color} text-white p-6 rounded-[32px] shadow-[0_10px_0_rgb(0,0,0,0.1)] flex items-center gap-6 transition-colors`}
    >
      <div className="bg-white/20 p-4 rounded-2xl">{icon}</div>
      <div className="text-left">
        <div className="text-3xl font-black leading-tight">{subLabel}</div>
        <div className="text-lg font-bold opacity-80 font-sans tracking-wider">{label}</div>
      </div>
    </motion.button>
  );
}
