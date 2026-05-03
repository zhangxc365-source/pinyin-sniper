import { useMemo, useEffect } from 'react';
import { GameSettings, Word } from '../types';
import { getLessonWords } from '../data/vocabulary';
import { motion } from 'motion/react';
import { Play, ArrowLeft, Headphones } from 'lucide-react';
import { speakWithGemini, warmUpAudio, initAudio } from '../services/geminiService';

interface PrepScreenProps {
  settings: GameSettings;
  onStart: () => void;
  onBack: () => void;
}

export default function PrepScreen({ settings, onStart, onBack }: PrepScreenProps) {
  const words = useMemo(() => getLessonWords(settings.level, settings.lesson), [settings.level, settings.lesson]);

  // Pre-fetch all words in this lesson as soon as the prep screen opens
  useEffect(() => {
    if (words.length > 0) {
      warmUpAudio(words);
    }
  }, [words]);

  const handleStart = async () => {
    // Unlock Audio on this user gesture
    await initAudio();
    onStart();
  };

  const speak = (text: string) => {
    speakWithGemini(text);
  };

  return (
    <div className="flex flex-col min-h-screen bg-sky-200 p-6 overflow-hidden">
      <div className="flex items-center mb-8">
        <div className="flex items-center">
          <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm text-sky-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="ml-4">
            <h2 className="text-3xl font-black text-sky-800 tracking-tight leading-none">PREPARATION</h2>
            <div className="text-sky-600 font-bold uppercase text-sm mt-1">YCT {settings.level} • Lesson {settings.lesson}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white/50 rounded-[48px] p-8 overflow-y-auto custom-scrollbar mb-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {words.length > 0 ? (
            words.map((word) => (
              <motion.div
                layout
                key={word.id}
                className="bg-white p-6 rounded-[32px] shadow-sm border-2 border-white flex flex-col items-center justify-center text-center group cursor-pointer hover:border-sky-300 transition-all min-h-[160px]"
                onClick={() => speak(word.char)}
              >
                <div className="text-3xl font-bold text-sky-600 mb-2">{word.pinyin}</div>
                <div className="text-4xl font-black text-slate-800 mb-2 font-serif">{word.char}</div>
                <div className="text-xs font-bold text-slate-400 uppercase leading-tight max-w-[120px]">
                  {word.en}
                </div>
                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity bg-sky-100 p-2 rounded-full absolute bottom-4">
                  <Headphones className="w-4 h-4 text-sky-600" />
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-sky-600/50">
              <Headphones className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-xl font-black uppercase tracking-widest">No words found for this lesson yet.</p>
            </div>
          )}
        </div>
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStart}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-5 rounded-3xl font-black text-2xl shadow-[0_6px_0_rgba(0,100,0,0.2)] flex items-center justify-center gap-4 transition-all"
        >
          START GAME <Play className="w-8 h-8 fill-white" />
        </motion.button>
      </div>
    </div>
  );
}
