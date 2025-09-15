import 'dotenv/config';
import { generateStoryActivityContent } from './lib/openai.js';

const sampleStudent = {
  id: 58,
  name: 'Gene Belcher',
  gradeLevel: 4
};

const sampleStory = `Maya loved books more than anything else in the world. Every day after school, she would race to the old library on Maple Street. The librarian, Mr. Chen, always had a new book waiting for her. One day, Maya discovered a mysterious door behind the history section. When she opened it, she found herself in a magical library where books could talk and stories came to life. A friendly dragon named Spark greeted her and explained that this was the Reading Realm, where all the world's stories lived.`;

async function testActivityGeneration() {
  console.log('🧪 Testing activity generation...');
  console.log('📍 OpenAI API Key available:', !!process.env.OPENAI_API_KEY);
  
  try {
    console.log('\n🎭 Testing WHO activity generation...');
    const whoResult = await generateStoryActivityContent(sampleStory, sampleStudent, 'who');
    console.log('WHO result:', JSON.stringify(whoResult, null, 2));
    
    console.log('\n🔄 Testing SEQUENCE activity generation...');
    const sequenceResult = await generateStoryActivityContent(sampleStory, sampleStudent, 'sequence');
    console.log('SEQUENCE result:', JSON.stringify(sequenceResult, null, 2));
    
    console.log('\n✅ Activity generation test completed successfully!');
  } catch (error) {
    console.error('❌ Error during activity generation:', error);
  }
}

testActivityGeneration();
