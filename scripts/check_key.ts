import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("KEY_MISSING");
    return;
  }
  console.log("KEY_PRESENT");
  
  const ai = new GoogleGenAI({ apiKey });
  const model = ai.models.get({ model: "gemini-3-flash-preview" });
  console.log("MODEL_OK");
}

test();
