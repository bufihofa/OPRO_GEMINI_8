import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { generatePrompts } from './optimizerLLM.js';
import { scorePrompt } from './scorerLLM.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'OPRO API'
  });
});

// Generate prompts endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const {
      metaPrompt,
      k = 4, 
      temperature = 1.0, 
      model = 'gemini-2.5-flash' 
    } = req.body;

    if (!metaPrompt || typeof metaPrompt !== 'string') {
      return res.status(400).json({ 
        error: 'Meta prompt is required and must be a string' 
      });
    }

    if (k < 1 || k > 16) {
      return res.status(400).json({ 
        error: 'K must be between 1 and 16' 
      });
    }
    
    const generatedPrompts = await generatePrompts(
      metaPrompt,
      k,
      temperature,
      model
    );

    res.json({ 
      success: true,
      prompts: generatedPrompts,
      count: generatedPrompts.length,
    });
  } catch (error) {
    console.error('Error generating prompts:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate prompts',
      message: error.message 
    });
  }
});

// Score prompt endpoint
app.post('/api/score', async (req, res) => {
  try {
    const { 
      prompt, 
      questions, 
      temperature = 0, 
      model = 'gemini-2.5-flash' 
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ 
        error: 'Prompt is required and must be a string' 
      });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        error: 'Questions must be a non-empty array' 
      });
    }

    // Validate questions format
    const isValid = questions.every(q => 
      q.question && typeof q.question === 'string' &&
      q.goldAnswer !== undefined
    );

    if (!isValid) {
      return res.status(400).json({ 
        error: 'Each question must have "question" (string) and "goldAnswer" fields' 
      });
    }

    const accuracy = await scorePrompt(
      prompt,
      questions,
      temperature,
      model
    );

    res.json({ 
      success: true,
      accuracy,
      totalQuestions: questions.length,
      prompt
    });
  } catch (error) {
    console.error('Error scoring prompt:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to score prompt',
      message: error.message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 OPRO API Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Generate prompts: POST http://localhost:${PORT}/api/generate`);
  console.log(`📍 Score prompts: POST http://localhost:${PORT}/api/score\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});