import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Progress tracking
let progressStats = {
  correct: 0,
  incorrect: 0,
  total: 0
};

// Request tracking
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
}

/**
 * Reset progress statistics
 */
export function resetProgressStats() {
  progressStats = {
    correct: 0,
    incorrect: 0,
    total: 0
  };
}

/**
 * Get current statistics
 */
export function getStats() {
  return {
    progress: { ...progressStats },
    requests: { ...requestStats }
  };
}

/**
 * Call Gemini API with retry logic
 * @param {string} fullPrompt - The complete prompt to send
 * @param {number} temperature - Temperature for generation
 * @param {string} model - Model name to use
 * @returns {Promise<{answer: number}>} The answer from the model
 */

async function callGeminiWithRetry(
  fullPrompt,
  temperature,
  model,
  GenAI
) {
  let attempt = 0;
  const retries = 1;
  
  const config = {
    maxOutputTokens: 2048,
    temperature,
    thinkingConfig: {
      thinkingBudget: 0,
    },
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      required: ["solve", "answer"],
      properties: {
        solve: {
          type: Type.STRING,
        },
        answer: {
          type: Type.NUMBER,
        },
      },
    },
  };

  while (attempt < retries) {
    try {
      const response = await GenAI.models.generateContent({
        model,
        contents: fullPrompt,
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
        console.log(`Received answer: ${res.answer}`);
        return { answer: res.answer };

      } catch (parseError) {
        console.log( parseError.message || parseError);
        return { answer: "-1" };
      }
    } catch (error) {
      attempt++;
      //console.log(error.stack || error.message || error);
      console.log(error.message || error);
      if (attempt >= retries) {
        return { answer: "-2" };
      }
      
      const delay = 5000 * attempt;
      await new Promise(res => setTimeout(res, delay));
    }
  }

  return { answer: -1 };
}

/**
 * Score a prompt against a test set
 * @param {string} prompt - The prompt to test
 * @param {Array<{question: string, goldAnswer: number}>} questions - Array of test questions
 * @param {number} temperature - Temperature for generation
 * @param {string} model - Model name to use
 * @returns {Promise<number>} Accuracy as a percentage (0-100)
 */
export async function scorePrompt(
  prompt,
  questions,
  temperature,
  model,
) {
  let GenAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  let correctAnswers = 0;
  let fail = 0;
  let incorrect = 0;
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt must be a non-empty string');
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Questions must be a non-empty array');
  }


  console.log(`\n🎯 Starting to score prompt against ${questions.length} questions...`);
  console.log(`📝 Prompt: "${prompt.substring(0, 500)}..."\n`);

  const promises = questions.map((question, index) => {
    const fullPrompt = prompt + '\n\n' + question.question;

    // Add delay before each request 
    return new Promise(resolve => setTimeout(resolve, index * (10 + Math.random()*0)))
      .then(() => callGeminiWithRetry(fullPrompt, temperature, model, GenAI))
      .then(response => {
        const isCorrect = response.answer === question.goldAnswer;
        
        if (isCorrect) {
          correctAnswers++;
        } else {
          if( response.answer === "-2") {
            fail++;
          }
          incorrect++;
          //console.log(`❌ Prompt ${prompt.substring(0, 20)}: ${fail} ${incorrect} Expected ${question.goldAnswer}, got ${response.answer}`);
        }
        console.log(`Prompt ${prompt.substring(0, 20)}: Progress: ${correctAnswers + incorrect} / ${questions.length}`);
        return response;
      })
      .catch(error => {
        //console.error(`❌ Final failure for question ${index + 1}: "${question.question}"`, error.message);
        return null;
      });
  });

  await Promise.all(promises);

  const accuracy = (correctAnswers / questions.length) * 100;
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Scoring complete!`);
  console.log(`📊 Prompt: ${prompt.substring(0, 300)}...`);
  console.log(`📊 Failures: ${fail}`);
  console.log(`📊 Incorrect: ${incorrect}`);
  console.log(`📊 Score: ${correctAnswers} / ${questions.length}`);
  console.log(`🎯 Accuracy: ${accuracy.toFixed(2)}%`);
  console.log('='.repeat(50) + '\n');

  return accuracy;
}