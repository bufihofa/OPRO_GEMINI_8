import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

let GenAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });


// Global stats tracking
let requestStats = {
  totalPromptTokens: 0,
  totalCandidateTokens: 0,
  totalRequests: 0
};

/**
 * Update request statistics
 */
function updateRequest(promptTokens, candidateTokens) {
  requestStats.totalPromptTokens += promptTokens;
  requestStats.totalCandidateTokens += candidateTokens;
  requestStats.totalRequests += 1;
  
  console.log(`📊 Request stats - Prompt tokens: ${promptTokens}, Candidate tokens: ${candidateTokens}`);
}

/**
 * Get current request statistics
 */
export function getRequestStats() {
  return { ...requestStats };
}

/**
 * Reset request statistics
 */
export function resetRequestStats() {
  requestStats = {
    totalPromptTokens: 0,
    totalCandidateTokens: 0,
    totalRequests: 0
  };
}

/**
 * Generate prompts using LLM with retry logic
 * @param {string} metaPrompt - The meta prompt to generate from
 * @param {number} k - Number of prompts to generate
 * @param {number} temperature - Temperature for generation (0-1)
 * @param {string} model - Model name to use
 * @returns {Promise<string[]>} Array of generated prompts
 */
export async function generatePrompts(
  metaPrompt,
  k,
  temperature,
  model
) {
  if (!metaPrompt || typeof metaPrompt !== 'string') {
    throw new Error('metaPrompt must be a non-empty string');
  }

  if (k < 1 || k > 16) {
    throw new Error('k must be between 1 and 16');
  }

  let attempt = 0;
  const retries = 2;

  const config = {
    maxOutputTokens: 40960,
    temperature,
    thinkingConfig: {
      thinkingBudget: 20480,
    },
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      required: ["totalTexts", "texts"],
      properties: {
        totalTexts: {
          type: Type.STRING,
        },
        texts: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    },
  };

  while (attempt < retries) {
    try {
      console.log(`🔄 Optimizer attempt ${attempt + 1}/${retries}`);
      
      const response = await GenAI.models.generateContent({
        model,
        contents: metaPrompt,
        config,
      });

      const text = response.text;
      
      updateRequest(
        response.usageMetadata?.promptTokenCount || 0,
        response.usageMetadata?.candidatesTokenCount || 0
      );

      if (!text) {
        throw new Error('Empty response from LLM');
      }

      try {
        const res = JSON.parse(text);
        
        if (Array.isArray(res.texts) && res.texts.length > 0) {
          const prompts = res.texts.slice(0, k);
          // remove <Start> and </Start> of each prompt
          for (let i = 0; i < prompts.length; i++) {
            prompts[i] = prompts[i].replace(/<Start>/g, '').replace(/<\/Start>/g, '').trim();
          }
          console.log(`✅ Successfully generated ${prompts.length} prompts`);
          return prompts;
        }
        
        throw new Error('Invalid response format: texts array is empty or missing');
      } catch (parseError) {
        console.error(`❌ JSON parsing error:`, parseError.message);
        console.error(`Response text: ${text.substring(0, 200)}...`);
        throw parseError;
      }
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt + 1} failed for optimizer:`, error.message);
      attempt++;
      
      if (attempt >= retries) {
        throw new Error(`Failed to generate prompts after ${retries} attempts: ${error.message}`);
      }
      
      const delay = 1000 * attempt * attempt;
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }

  return [];
}