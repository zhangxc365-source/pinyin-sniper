import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Play, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { VOCABULARY } from '../data/vocabulary';
import { AUDIO_SLICES, AudioSlices } from '../data/audioSlices';

const AUDIO_FILES = [
  { file: '男/YCTL1-L8男.mp3', level: 1, startLsn: 1, endLsn: 8, gender: 'male' },
  { file: '男/YCT1L9-L11男.mp3', level: 1, startLsn: 9, endLsn: 11, gender: 'male' },
  { file: '男/YCT2L1-L11男.mp3', level: 2, startLsn: 1, endLsn: 11, gender: 'male' },
  { file: '男/YCT3L1-L11男.mp3', level: 3, startLsn: 1, endLsn: 11, gender: 'male' },
  { file: '男/YCT4L1-L11男.mp3', level: 4, startLsn: 1, endLsn: 11, gender: 'male' },
  { file: '男/YCT5L1-L6男.mp3', level: 5, startLsn: 1, endLsn: 6, gender: 'male' },
  { file: '男/YCT5L7-L12.mp3', level: 5, startLsn: 7, endLsn: 12, gender: 'male' },
  { file: '男/YCT5L13-L14男.mp3', level: 5, startLsn: 13, endLsn: 14, gender: 'male' },
  { file: '男/YCT6L1-L5男.mp3', level: 6, startLsn: 1, endLsn: 5, gender: 'male' },
  { file: '男/YCT6L6-L9男.mp3', level: 6, startLsn: 6, endLsn: 9, gender: 'male' },
  { file: '女/YCTL1-L8女.mp3', level: 1, startLsn: 1, endLsn: 8, gender: 'female' },
  { file: '女/YCT1L9-L11女.mp3', level: 1, startLsn: 9, endLsn: 11, gender: 'female' },
  { file: '女/YCT2L1-L11女.mp3', level: 2, startLsn: 1, endLsn: 11, gender: 'female' },
  { file: '女/YCT3L1-L11女.mp3', level: 3, startLsn: 1, endLsn: 11, gender: 'female' },
  { file: '女/YCT4L1-L11女.mp3', level: 4, startLsn: 1, endLsn: 11, gender: 'female' },
  { file: '女/YCT5L1-L6女.mp3', level: 5, startLsn: 1, endLsn: 6, gender: 'female' },
  { file: '女/YCT5L7-L12女.mp3', level: 5, startLsn: 7, endLsn: 12, gender: 'female' },
  { file: '女/YCT5L13-L14女.mp3', level: 5, startLsn: 13, endLsn: 14, gender: 'female' },
  { file: '女/YCT6L1-L6女.mp3', level: 6, startLsn: 1, endLsn: 6, gender: 'female' },
  { file: '女/YCT6L7-L12女.mp3', level: 6, startLsn: 7, endLsn: 12, gender: 'female' },
  { file: '女/YCT6L13-L14女.mp3', level: 6, startLsn: 13, endLsn: 14, gender: 'female' },
];

export default function AudioSyncScreen({ onBack }: { onBack: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState<AudioSlices>(AUDIO_SLICES);
  const [error, setError] = useState<string | null>(null);

  const analyzeFile = async (item: typeof AUDIO_FILES[0]) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // 1. Fetch file as blob
    const response = await fetch(`/audio/${item.file}`);
    if (!response.ok) throw new Error(`Could not load ${item.file}`);
    const blob = await response.blob();
    
    // 2. Convert to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });
    const audioData = await base64Promise;

    // 3. Get words
    const words = VOCABULARY
      .filter(v => v.level === item.level && v.lesson >= item.startLsn && v.lesson <= item.endLsn)
      .map(v => v.char);

    const prompt = `
      The attached audio file contains spoken Chinese words.
      Expected words (in order): ${words.join(", ")}
      Identify each word's start time and duration in seconds.
      Important: Return only valid JSON in this format:
      { "word": { "file": "${item.file}", "start": 1.2, "duration": 0.8 } }
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { data: audioData, mimeType: "audio/mp3" } }
          ]
        }
      ]
    });

    const text = result.text || "{}";
    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || '{}';
    return JSON.parse(jsonStr);
  };

  const startSync = async () => {
    setIsProcessing(true);
    setError(null);
    const newResults = { ...results };

    try {
      for (let i = 0; i < AUDIO_FILES.length; i++) {
        const item = AUDIO_FILES[i];
        setStatus(`Analyzing ${item.file} (${i + 1}/${AUDIO_FILES.length})...`);
        setProgress(((i) / AUDIO_FILES.length) * 100);
        
        try {
          const fileResults = await analyzeFile(item);
          for (const [word, data] of Object.entries(fileResults)) {
            if (!newResults[word]) newResults[word] = {};
            (newResults[word] as any)[item.gender] = data;
          }
          setResults({ ...newResults });
        } catch (e) {
          console.error(`Error with ${item.file}:`, e);
          // Continue with next file
        }
      }
      setProgress(100);
      setStatus('Complete!');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    const code = `export const AUDIO_SLICES: AudioSlices = ${JSON.stringify(results, null, 2)};`;
    navigator.clipboard.writeText(code);
    alert('JSON copied to clipboard! Please ask the AI to update src/data/audioSlices.ts with this content.');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 overflow-y-auto">
      <div className="flex items-center mb-12">
        <button onClick={onBack} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 mr-4">
          <ArrowLeft />
        </button>
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">AI Audio Sync</h1>
          <p className="text-slate-400">Automated Audio Slicing & Mapping</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="bg-slate-800 p-8 rounded-[32px] border border-white/5">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Play className="text-green-400" /> Start Analysis
            </h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              This tool will use the Gemini API to "listen" to your uploaded audio files and identify the exact timing of each vocabulary word. 
              This is a one-time process.
            </p>
            
            {isProcessing ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-sky-400">
                  <span>{status}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.5)]"
                  />
                </div>
              </div>
            ) : (
              <button 
                onClick={startSync}
                className="w-full bg-sky-600 hover:bg-sky-500 p-6 rounded-3xl font-black text-xl flex items-center justify-center gap-4 transition-all shadow-xl active:scale-95"
              >
                <Loader2 className={isProcessing ? "animate-spin" : "hidden"} />
                RUN BATCH ANALYSIS
              </button>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl flex items-center gap-3 text-red-200">
                <AlertCircle /> {error}
              </div>
            )}
          </div>

          <div className="bg-slate-800 p-8 rounded-[32px] border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Save className="text-sky-400" /> Export Data
              </h2>
              <button 
                onClick={copyToClipboard}
                className="text-xs font-bold uppercase tracking-widest bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition-all"
              >
                Copy Code
              </button>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl h-[400px] overflow-auto custom-scrollbar font-mono text-[10px] text-sky-300/80">
              <pre>{JSON.stringify(results, null, 2)}</pre>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 p-8 rounded-[32px] border border-white/5 overflow-hidden flex flex-col">
          <h2 className="text-xl font-bold mb-6">File Status</h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {AUDIO_FILES.map((file, idx) => {
               const isDone = Object.values(results).some((w: any) => w.male?.file === file.file || w.female?.file === file.file);
               return (
                <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between ${isDone ? 'bg-green-500/10 border-green-500/20' : 'bg-slate-700/30 border-white/5 opacity-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isDone ? 'bg-green-500' : 'bg-slate-500'}`} />
                    <span className="text-sm font-medium">{file.file}</span>
                  </div>
                  {isDone && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                </div>
               );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
