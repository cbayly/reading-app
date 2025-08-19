import { PrismaClient } from '@prisma/client';
import { generateStory } from '../lib/openai.js';
import { selectRandomGenreCombination } from '../lib/genreSelector.js';

const prisma = new PrismaClient();

async function testGenreStoryGeneration() {
  try {
    console.log('🧪 Testing Genre Story Generation...\n');

    // Create a test parent
    const testParent = await prisma.parent.create({
      data: {
        name: 'Test Parent',
        email: 'testparent@example.com',
        passwordHash: 'testhash'
      }
    });

    // Create a test student
    const testStudent = await prisma.student.create({
      data: {
        parentId: testParent.id,
        name: 'Test Student',
        birthday: new Date('2010-01-01'), // 13 years old
        gradeLevel: 7,
        interests: 'sports,reading,music'
      }
    });

    console.log(`📚 Testing with student: ${testStudent.name} (age 13, grade 7)`);
    console.log(`🎯 Interests: ${testStudent.interests}\n`);

    // Test 1: Generate story without genre combination
    console.log('🔍 Test 1: Story generation WITHOUT genre combination');
    try {
      const storyWithoutGenre = await generateStory(testStudent, 'sports');
      console.log('✅ Success: Generated story without genre combination');
      console.log(`   - Chapters: ${storyWithoutGenre.chapters.length}`);
      console.log(`   - Chapter 1 title: ${storyWithoutGenre.chapters[0].title}`);
    } catch (error) {
      console.error('❌ Failed: Story generation without genre combination');
      console.error(`   Error: ${error.message}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 2: Generate story with genre combination
    console.log('🔍 Test 2: Story generation WITH genre combination');
    try {
      // Select a genre combination
      const studentAge = 13;
      const genreCombination = await selectRandomGenreCombination(testStudent.id, studentAge);
      console.log(`   - Selected genre: ${genreCombination.combination}`);

      const storyWithGenre = await generateStory(testStudent, 'sports', genreCombination.combination);
      console.log('✅ Success: Generated story with genre combination');
      console.log(`   - Chapters: ${storyWithGenre.chapters.length}`);
      console.log(`   - Chapter 1 title: ${storyWithGenre.chapters[0].title}`);
      console.log(`   - Genre style: ${genreCombination.combination}`);
    } catch (error) {
      console.error('❌ Failed: Story generation with genre combination');
      console.error(`   Error: ${error.message}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 3: Test multiple genre combinations
    console.log('🔍 Test 3: Multiple genre combinations');
    const testGenres = ['Modern Adventure', 'Whimsical Mystery', 'Epic Quest'];
    
    for (const genre of testGenres) {
      try {
        console.log(`   Testing genre: ${genre}`);
        const story = await generateStory(testStudent, 'music', genre);
        console.log(`   ✅ Success: Generated story with "${genre}"`);
        console.log(`      - Chapter 1: ${story.chapters[0].title}`);
      } catch (error) {
        console.error(`   ❌ Failed: Story generation with "${genre}"`);
        console.error(`      Error: ${error.message}`);
      }
    }

    // Cleanup
    await prisma.student.delete({
      where: { id: testStudent.id }
    });
    await prisma.parent.delete({
      where: { id: testParent.id }
    });

    console.log('\n🧹 Cleanup completed');
    console.log('✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testGenreStoryGeneration();
