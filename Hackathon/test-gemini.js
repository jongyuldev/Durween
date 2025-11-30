// Quick test script to verify Gemini API is working
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyCFpimihgusXxQFgSuRIr1bLK5OujNj9pw';

async function testGemini() {
  console.log('Testing Gemini API connection...');
  
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    console.log('Sending test message...');
    const result = await model.generateContent('Say hello in a friendly way!');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Success! Gemini responded:');
    console.log(text);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testGemini();
