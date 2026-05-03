import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight, Languages, Type } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChallengeMode } from '../types';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface LevelSelectScreenProps {
  onSelect: (level: number, lesson: number, mode: ChallengeMode) => void;
  onBack: () => void;
}

export default function LevelSelectScreen({ onSelect, onBack }: LevelSelectScreenProps) {
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedLesson, setSelectedLesson] = useState(1);
  const [selectedMode, setSelectedMode] = useState<ChallengeMode>('CHAR');

  const levels = [1, 2, 3, 4, 5, 6];
  const maxLesson = (selectedLevel === 5 || selectedLevel === 6) ? 15 : 12;
  const lessons = Array.from({ length: maxLesson }, (_, i) => i + 1);

  return (
    <div className="flex flex-col min-h-screen bg-sky-200 p-6 overflow-y-auto">
      <div className="flex items-center mb-8">
        <button 
          onClick={onBack}
          className="p-3 bg-white rounded-2xl shadow-sm text-sky-600 hover:text-sky-800 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-3xl font-black text-sky-800 ml-4 uppercase">Select Level</h2>
      </div>

      <div className="flex-1 flex flex-col gap-6 max-w-4xl mx-auto w-full pb-8">
        {/* Level Selection Section */}
        <div className="bg-white/50 p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-black text-sky-700 uppercase tracking-wider">LEVEL</h3>
            <span className="bg-sky-500 text-white px-4 py-1 rounded-full font-bold">YCT {selectedLevel}</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {levels.map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setSelectedLevel(lvl);
                  // Reset lesson if it exceeds new max
                  const newMax = (lvl === 5 || lvl === 6) ? 15 : 12;
                  if (selectedLesson > newMax) setSelectedLesson(newMax);
                }}
                className={cn(
                  "py-4 rounded-2xl font-black text-xl transition-all shadow-sm",
                  selectedLevel === lvl 
                    ? "bg-sky-600 text-white scale-105 shadow-md" 
                    : "bg-white text-sky-600 hover:bg-sky-50"
                )}
              >
                YCT {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Lesson Selection Section */}
        <div className="bg-white/50 p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-black text-sky-700 uppercase tracking-wider">LESSON</h3>
            <span className="bg-orange-500 text-white px-4 py-1 rounded-full font-bold uppercase whitespace-nowrap">
              {selectedLesson === maxLesson ? 'Review (全部复习)' : `LESSON ${selectedLesson}`}
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {lessons.map((lsn) => (
              <button
                key={lsn}
                onClick={() => setSelectedLesson(lsn)}
                className={cn(
                  "py-4 rounded-2xl font-bold transition-all shadow-sm text-center",
                  selectedLesson === lsn
                    ? "bg-orange-500 text-white scale-105 shadow-md"
                    : "bg-white text-orange-600 hover:bg-orange-50"
                )}
              >
                <div className="text-sm opacity-70 uppercase font-black">{lsn === maxLesson ? 'All' : 'Lesson'}</div>
                <div className="text-2xl leading-none font-black">{lsn === maxLesson ? '复习' : lsn}</div>
                {lsn === maxLesson && <div className="text-[10px] opacity-70 font-bold uppercase">Review</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Selection Section */}
        <div className="bg-white/50 p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-black text-sky-700 uppercase tracking-wider">CHALLENGE MODE</h3>
            <span className="bg-purple-500 text-white px-4 py-1 rounded-full font-bold uppercase">
              {selectedMode === 'CHAR' ? 'CHARACTER MODE' : 'PINYIN MODE'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedMode('CHAR')}
              className={cn(
                "p-4 rounded-2xl flex items-center gap-4 transition-all shadow-sm",
                selectedMode === 'CHAR'
                  ? "bg-purple-600 text-white scale-105 shadow-md"
                  : "bg-white text-purple-600 hover:bg-purple-50"
              )}
            >
              <div className={cn("p-2 rounded-xl", selectedMode === 'CHAR' ? "bg-white/20" : "bg-purple-100")}>
                <Languages size={24} />
              </div>
              <div className="text-left">
                <div className="font-black text-lg uppercase">Chinese Character</div>
                <div className="text-xs opacity-80 font-bold">汉字模式</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedMode('PINYIN')}
              className={cn(
                "p-4 rounded-2xl flex items-center gap-4 transition-all shadow-sm",
                selectedMode === 'PINYIN'
                  ? "bg-purple-600 text-white scale-105 shadow-md"
                  : "bg-white text-purple-600 hover:bg-purple-50"
              )}
            >
              <div className={cn("p-2 rounded-xl", selectedMode === 'PINYIN' ? "bg-white/20" : "bg-purple-100")}>
                <Type size={24} />
              </div>
              <div className="text-left">
                <div className="font-black text-lg uppercase">Pinyin Only</div>
                <div className="text-xs opacity-80 font-bold">拼音模式</div>
              </div>
            </button>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(selectedLevel, selectedLesson, selectedMode)}
          className="mt-2 bg-green-500 hover:bg-green-600 text-white py-5 rounded-3xl font-black text-2xl shadow-[0_6px_0_rgb(0,0,0,0.1)] flex items-center justify-center gap-3 transition-colors uppercase"
        >
          Confirm <ChevronRight className="w-8 h-8" />
        </motion.button>
      </div>
    </div>
  );
}
