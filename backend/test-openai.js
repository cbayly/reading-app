import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API...');
    console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Say 'Hello, this is a test'"
        }
      ],
      max_tokens: 10
    });
    
    console.log('OpenAI API test successful!');
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('OpenAI API test failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);
  }
}

testOpenAI();
