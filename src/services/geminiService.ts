import { GoogleGenAI } from "@google/genai";
import { Word } from "../types";
import { AUDIO_MANIFEST } from "../data/audioManifest";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Global state
let globalAudio: HTMLAudioElement | null = null;

const getAudioPlayer = () => {
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.load();
  }
  return globalAudio;
};

/**
 * Unlocks audio on user gesture
 */
export const initAudio = async () => {
  const player = getAudioPlayer();
  player.src = "data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAAoA";
  await player.play().catch(() => {});
};

/**
 * Pre-fetch audio - disabled per user request
 */
export const warmUpAudio = async (words: (string | Word)[]) => {
  console.info("Audio warming disabled: Only local assets allowed.");
};

/**
 * Plays audio for a given word using local .wav assets from the manifest.
 * NO FALLBACK TO AI per user request.
 */
export const speakWithGemini = async (input: string | Word) => {
  if (!input) return;
  
  const text = typeof input === 'string' ? input : input.char;
  const level = typeof input === 'string' ? 1 : input.level;
  
  if (!text.trim()) return;

  const player = getAudioPlayer();

  // Find the file in the manifest for the given level
  const levelFiles = AUDIO_MANIFEST[level] || [];
  const foundFile = levelFiles.find(f => f.includes(text));

  if (foundFile) {
    const basePath = level === 1 ? '/' : `/YCT${level}/`;
    const fullPath = `${basePath}${foundFile}`;
    
    try {
      player.src = fullPath;
      await player.play();
      return; 
    } catch (e) {
      console.warn(`Error playing audio: ${fullPath}`, e);
    }
  } else {
    console.warn(`Truly missing audio for: ${text} in Level ${level}`);
  }
};

/**
 * AI Powered Game Assistant Features
 */

export const getSmartHint = async (char: string, pinyin: string, en: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an encouraging Chinese teacher for kids. Give a very short (1 sentence) fun mnemonic or clue to help a child recognize the word "${char}" (${pinyin} - ${en}). No pinyin in the clue, just simple Chinese or English.`,
    });
    return response.text;
  } catch (err) {
    return `Think about "${en}"!`;
  }
};

export const getGameAnalysis = async (wrongWords: {char: string, en: string}[], score: number) => {
  try {
    const wordList = wrongWords.map(w => w.char).join(', ');
    const prompt = wrongWords.length > 0 
      ? `The student scored ${score} but struggled with these words: ${wordList}. Give a short (max 40 words) encouraging and specific study tip in Chinese.`
      : `The student scored ${score} and got everything right! Give a short (max 40 words) enthusiastic praise in Chinese.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (err) {
    return "太棒了！继续加油学习！";
  }
}
