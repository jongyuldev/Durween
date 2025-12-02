// List available Gemini models
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  console.log('Fetching available models...\n');
  
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const models = await genAI.listModels();
    
    console.log('Available models:');
    for await (const model of models) {
      console.log(`- ${model.name}`);
      console.log(`  Display Name: ${model.displayName}`);
      console.log(`  Supported methods: ${model.supportedGenerationMethods.join(', ')}`);
      console.log('');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listModels();
