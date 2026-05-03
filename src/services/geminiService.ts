import { GoogleGenAI } from "@google/genai";
import { Word } from "../types";
import { AUDIO_MANIFEST } from "../data/audioManifest";

let aiInstance: GoogleGenAI | null = null;

/**
 * Returns the Gemini client if a valid API key is available.
 * Does not throw if the key is missing or initialization fails.
 */
const getGeminiClient = () => {
  if (aiInstance) return aiInstance;
  
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'undefined' || key.trim() === '') {
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey: key });
    return aiInstance;
  } catch (err) {
    console.error("Failed to initialize Gemini AI client:", err);
    return null;
  }
};

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
 * Resolves a URL based on the application's base path for GitHub Pages compatibility.
 */
export const resolveAudioUrl = (path: string) => {
  if (!path) return '';
  const baseUrl = (import.meta as any).env.BASE_URL;
  // If baseline URL is / and path is /audio/..., return /audio/...
  if (baseUrl === '/') return path;
  
  // Strip leading slash from path to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Plays audio for a given word using local .wav assets from the manifest.
 * NO FALLBACK TO AI per user request.
 */
export const speakWithGemini = async (input: string | Word) => {
  if (!input) return;
  
  const text = typeof input === 'string' ? input : input.char;
  const level = typeof input === 'string' ? 1 : input.level;
  const audioFromWord = typeof input === 'string' ? null : input.audio;
  
  if (!text.trim() && !audioFromWord) return;

  const player = getAudioPlayer();

  if (audioFromWord) {
    const fullPath = resolveAudioUrl(audioFromWord);
    try {
      player.src = fullPath;
      await player.play();
      return;
    } catch (e) {
      console.warn(`Error playing custom audio field: ${fullPath}`, e);
    }
  }

  // Find the file in the manifest for the given level
  const levelFiles = AUDIO_MANIFEST[level] || [];
  const foundFile = levelFiles.find(f => f.includes(text));

  if (foundFile) {
    const basePath = level === 1 ? '' : `YCT${level}/`;
    const fullPath = resolveAudioUrl(`${basePath}${foundFile}`);
    
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
    const ai = getGeminiClient();
    if (!ai) return `Think about "${en}"! (AI Hint Unavailable)`;

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
    const ai = getGeminiClient();
    if (!ai) return "太棒了！继续加油学习！(AI Analysis Unavailable)";

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
