import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

async function analyze() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found in process.env");
    // List available keys for debugging (without values)
    console.log("Available env keys:", Object.keys(process.env).filter(k => !k.includes("SECRET") && !k.includes("KEY")));
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const audioBuffer = fs.readFileSync(path.join(process.cwd(), "public/audio/Yct1-3.mp3"));
  const audioBase64 = audioBuffer.toString("base64");

  const prompt = `
    This audio contains Chinese vocabulary for YCT levels 1, 2, and 3.
    The words can be in any order. 
    Identify each word spoken and provide its start time and duration in seconds.
    Format the output as a JSON object where the key is the Chinese character(s) and the value is { "file": "Yct1-3.mp3", "start": number, "duration": number }.
    
    Only return the raw JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Flash 3 supports multimodal audio
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: audioBase64,
                mimeType: "audio/mp3",
              },
            },
          ],
        },
      ],
    });

    console.log(response.text);
  } catch (error) {
    console.error("Analysis Error:", error);
  }
}

analyze();
