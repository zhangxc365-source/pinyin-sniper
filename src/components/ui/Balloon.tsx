import { motion } from 'motion/react';
import { useState, useEffect, useMemo } from 'react';

import { BALLOON_COLORS } from '../../constants';

interface BalloonProps {
  id: string;
  content: string; // The text to display (Char or Pinyin)
  pinyin: string; // The match key used for shooting logic
  colorClass?: string;
  onClick: (id: string, pinyin: string) => void;
  isCorrect: boolean; // For visual feedback if scope is used
  isVisible: boolean;
  onExplodeComplete?: (id: string) => void;
  isSmall?: boolean;
}

export default function Balloon({ id, content, pinyin, colorClass, onClick, isVisible, onExplodeComplete, isSmall }: BalloonProps) {
  const [isPopped, setIsPopped] = useState(false);

  useEffect(() => {
    if (!isVisible) setIsPopped(true);
  }, [isVisible]);

  const handlePop = () => {
    if (isPopped) return;
    setIsPopped(true);
    onClick(id, pinyin);
  };

  const finalColor = colorClass || BALLOON_COLORS[Math.floor(id.charCodeAt(id.length - 1) % BALLOON_COLORS.length)];

  const drift = useMemo(() => {
    const initialRotate = (Math.random() - 0.5) * 6; // Very subtle starting tilt
    return {
      x: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10],
      y: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10],
      rotate: [initialRotate - 1, initialRotate + 1, initialRotate - 1], // Very subtle sway
      duration: 6 + Math.random() * 4
    };
  }, []);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={isPopped ? { scale: 1.5, opacity: 0 } : { scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ rotate: drift.rotate[0] }}
      className={`absolute flex items-center justify-center ${isSmall ? 'p-4' : 'p-6'}`}
      onAnimationComplete={() => {
        if (isPopped && onExplodeComplete) {
          onExplodeComplete(id);
        }
      }}
    >
      {!isPopped ? (
        <motion.div
          animate={{
            x: drift.x,
            y: drift.y,
            rotate: drift.rotate,
          }}
          transition={{
            duration: drift.duration,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          onClick={handlePop}
          className={`relative cursor-crosshair ${isSmall ? 'w-28 h-40' : 'w-36 h-48'} ${finalColor} rounded-[50%_50%_50%_50%_/_60%_60%_40%_40%] shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.2)] flex items-center justify-center group`}
        >
          {/* Balloon string */}
          <div className={`absolute top-[90%] left-1/2 -translate-x-1/2 ${isSmall ? 'w-0.5 h-16' : 'w-0.5 h-20'} bg-slate-400/30 -z-10`} />
          
          <div className={`bg-white/80 ${isSmall ? 'px-2 py-1 rounded-xl' : 'px-2.5 py-1.5 rounded-2xl'} shadow-sm`}>
            <span className={`${isSmall ? 'text-2xl' : 'text-3xl'} font-black text-slate-800 drop-shadow-sm select-none`}>{content}</span>
          </div>
          
          {/* Shine effect */}
          <div className={`absolute top-4 left-5 ${isSmall ? 'w-6 h-12 blur-[2px]' : 'w-7 h-14 blur-[3px]'} bg-white/30 rounded-full -rotate-12`} />
        </motion.div>
      ) : (
        <div className="text-4xl">💥</div>
      )}
    </motion.div>
  );
}
