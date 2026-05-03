import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// Mapping of files to their YCT level and lesson ranges
const AUDIO_FILES = [
  // Male
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
  // Female
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

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY Missing");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Load vocabulary
  const vocabContent = fs.readFileSync(path.join(process.cwd(), "src/data/vocabulary.ts"), "utf-8");
  // Simple regex to extract word objects
  const vocabRegex = /{ char: '(.+?)', .+? level: (\d+), lesson: (\d+) }/g;
  const vocabulary: any[] = [];
  let match;
  while ((match = vocabRegex.exec(vocabContent)) !== null) {
    vocabulary.push({ char: match[1], level: parseInt(match[2]), lesson: parseInt(match[3]) });
  }

  const results: any = {};

  for (const item of AUDIO_FILES) {
    console.log(`Analyzing: ${item.file}...`);
    const filePath = path.join(process.cwd(), "public/audio", item.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    const wordsInFile = vocabulary
      .filter(v => v.level === item.level && v.lesson >= item.startLsn && v.lesson <= item.endLsn)
      .map(v => v.char);

    if (wordsInFile.length === 0) {
      console.warn(`No words found for range: YCT${item.level} L${item.startLsn}-${item.endLsn}`);
      continue;
    }

    const audioBuffer = fs.readFileSync(filePath);
    const audioBase64 = audioBuffer.toString("base64");

    const prompt = `
      The attached audio file contains spoken Chinese words from the YCT vocabulary list.
      I will provide a list of words that are expected to appear in this audio, in the order they are spoken.
      Words: ${wordsInFile.join(", ")}

      Your task:
      1. For each word in the list, identify where it is spoken in the audio.
      2. Provide the start time and duration (in seconds) for each word.
      3. Important: The audio contains words one by one, usually with brief pauses.
      4. Format the output as a JSON mapping: 
         { "word": { "file": "${item.file}", "start": 1.5, "duration": 0.8 } }

      Output only valid JSON.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { data: audioBase64, mimeType: "audio/mp3" } },
            ],
          },
        ],
      });

      const text = response.text || "{}";
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      const jsonStr = text.substring(jsonStart, jsonEnd);
      
      try {
        const fileResults = JSON.parse(jsonStr);
        for (const [word, data] of Object.entries(fileResults)) {
          if (!results[word]) results[word] = {};
          results[word][item.gender] = data;
        }
      } catch (e) {
        console.error(`Failed to parse JSON for ${item.file}:`, text);
      }
    } catch (error) {
      console.error(`Error analyzing ${item.file}:`, error);
    }
  }

  fs.writeFileSync(path.join(process.cwd(), "scripts/audio_slices.json"), JSON.stringify(results, null, 2));
  console.log("Analysis complete. Results saved to scripts/audio_slices.json");
}

main();
