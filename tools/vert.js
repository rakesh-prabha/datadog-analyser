/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import {GoogleGenAI} from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION;
const GOOGLE_GENAI_USE_VERTEXAI = process.env.GOOGLE_GENAI_USE_VERTEXAI;

async function generateContentFromMLDev() {
  const ai = new GoogleGenAI({vertexai: false, apiKey: GEMINI_API_KEY});
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'why is the sky blue?',
  });
  console.debug(response.text);
}

async function generateContentFromVertexAI() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: GOOGLE_CLOUD_PROJECT,
    location: GOOGLE_CLOUD_LOCATION,
  });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'why is the sky blue?',
  });
  console.debug(response.text);
}

async function main() {
  if (GOOGLE_GENAI_USE_VERTEXAI) {
    console.log('Attempting to use Vertex AI...');
    try {
      await generateContentFromVertexAI();
    } catch (e) {
      console.error('Vertex AI failed:', e.message);
      console.log('Falling back to ML Dev API...');
      if (!GEMINI_API_KEY) {
        console.error('No GEMINI_API_KEY found in environment variables. Please set it to use the ML Dev API.');
        process.exit(1);
      }
      await generateContentFromMLDev().catch((e) =>
        console.error('ML Dev API also failed:', e),
      );
    }
  } else {
    console.log('Using ML Dev API...');
    if (!GEMINI_API_KEY) {
      console.error('No GEMINI_API_KEY found in environment variables. Please set it to use the ML Dev API.');
      process.exit(1);
    }
    await generateContentFromMLDev().catch((e) =>
      console.error('got error', e),
    );
  }
}

main();