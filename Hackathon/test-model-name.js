require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;

async function testModels() {
  const genAI = new GoogleGenerativeAI(API_KEY);
  
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-latest',
    'gemini-2.0-flash-exp',
    'gemini-exp-1206',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`\nTrying: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hi');
      const response = await result.response;
      console.log(`✅ SUCCESS with ${modelName}!`);
      console.log(`Response: ${response.text()}`);
      break;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
}

testModels();
