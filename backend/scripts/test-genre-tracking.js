import { PrismaClient } from '@prisma/client';
import { generateStoryOnly } from '../lib/openai.js';
import { 
  selectRandomGenreCombination, 
  recordGenreCombination, 
  cleanupOldGenreHistory,
  getGenreVarietyStats 
} from '../lib/genreSelector.js';

const prisma = new PrismaClient();

async function testGenreTracking() {
  try {
    console.log('🧪 Testing Genre Tracking System...\n');

    // Create test parent
    const testParent = await prisma.parent.create({
      data: {
        name: 'Test Parent',
        email: 'testparent@example.com',
        passwordHash: 'testhash'
      }
    });

    // Create multiple test students with different ages
    const testStudents = await Promise.all([
      prisma.student.create({
        data: {
          parentId: testParent.id,
          name: 'Young Student',
          birthday: new Date('2017-01-01'), // 6 years old
          gradeLevel: 1,
          interests: 'animals,colors,shapes'
        }
      }),
      prisma.student.create({
        data: {
          parentId: testParent.id,
          name: 'Middle Student',
          birthday: new Date('2012-01-01'), // 11 years old
          gradeLevel: 5,
          interests: 'sports,reading,music'
        }
      }),
      prisma.student.create({
        data: {
          parentId: testParent.id,
          name: 'Older Student',
          birthday: new Date('2008-01-01'), // 15 years old
          gradeLevel: 9,
          interests: 'technology,science,art'
        }
      })
    ]);

    console.log(`📚 Created ${testStudents.length} test students\n`);

    // Test 1: Generate multiple weekly plans for each student
    console.log('🔍 Test 1: Generate multiple weekly plans for each student');
    const generatedPlans = [];

    for (const student of testStudents) {
      console.log(`\n   Generating plans for ${student.name} (age ${new Date().getFullYear() - student.birthday.getFullYear()})`);
      
      // Generate 3 weekly plans for each student
      for (let i = 1; i <= 3; i++) {
        try {
          console.log(`     Plan ${i}...`);
          const plan = await generateStoryOnly(student);
          generatedPlans.push(plan);
          console.log(`     ✅ Generated plan with genre: ${plan.genreCombination}`);
        } catch (error) {
          console.error(`     ❌ Failed to generate plan ${i}: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ Generated ${generatedPlans.length} total plans\n`);

    // Test 2: Verify genre history tracking
    console.log('🔍 Test 2: Verify genre history tracking');
    
    for (const student of testStudents) {
      const studentAge = new Date().getFullYear() - student.birthday.getFullYear();
      console.log(`\n   Checking history for ${student.name} (age ${studentAge})`);
      
      // Get genre history
      const history = await prisma.studentGenreHistory.findMany({
        where: { studentId: student.id },
        orderBy: { usedAt: 'desc' }
      });

      console.log(`     History entries: ${history.length}`);
      
      if (history.length > 0) {
        console.log(`     Recent genres: ${history.slice(0, 3).map(h => h.genreCombination).join(', ')}`);
        
        // Check for duplicates in recent history
        const recentGenres = history.slice(0, 15).map(h => h.genreCombination);
        const uniqueGenres = new Set(recentGenres);
        const duplicateCount = recentGenres.length - uniqueGenres.size;
        
        console.log(`     Duplicates in recent 15: ${duplicateCount}`);
        
        if (duplicateCount > 0) {
          console.log(`     ⚠️  Found ${duplicateCount} duplicate(s) - this might indicate repetition`);
        } else {
          console.log(`     ✅ No duplicates found - good variety`);
        }
      }
    }

    // Test 3: Test genre variety statistics
    console.log('\n🔍 Test 3: Test genre variety statistics');
    
    for (const student of testStudents) {
      console.log(`\n   Variety stats for ${student.name}:`);
      
      const stats = await getGenreVarietyStats(student.id);
      console.log(`     Total combinations: ${stats.totalCombinations}`);
      console.log(`     Unique combinations: ${stats.uniqueCombinations}`);
      console.log(`     Variety score: ${stats.varietyScore}%`);
      
      if (stats.varietyScore >= 80) {
        console.log(`     ✅ Excellent variety (${stats.varietyScore}%)`);
      } else if (stats.varietyScore >= 60) {
        console.log(`     ✅ Good variety (${stats.varietyScore}%)`);
      } else {
        console.log(`     ⚠️  Low variety (${stats.varietyScore}%) - consider more diverse selections`);
      }
    }

    // Test 4: Test age-appropriate filtering
    console.log('\n🔍 Test 4: Test age-appropriate filtering');
    
    for (const student of testStudents) {
      const studentAge = new Date().getFullYear() - student.birthday.getFullYear();
      console.log(`\n   Testing age appropriateness for ${student.name} (age ${studentAge})`);
      
      // Generate 5 genre combinations and check if they're age-appropriate
      const combinations = [];
      for (let i = 0; i < 5; i++) {
        try {
          const combination = await selectRandomGenreCombination(student.id, studentAge);
          combinations.push(combination.combination);
        } catch (error) {
          console.error(`     ❌ Failed to generate combination ${i + 1}: ${error.message}`);
        }
      }
      
      console.log(`     Generated combinations: ${combinations.join(', ')}`);
      
      // Check if any combinations contain potentially inappropriate words
      const inappropriateWords = ['Dark', 'Horror', 'Post-apocalyptic'];
      const hasInappropriate = combinations.some(combo => 
        inappropriateWords.some(word => combo.includes(word))
      );
      
      if (studentAge < 10 && hasInappropriate) {
        console.log(`     ⚠️  Found potentially inappropriate genres for age ${studentAge}`);
      } else {
        console.log(`     ✅ All combinations appear age-appropriate`);
      }
    }

    // Test 5: Test cleanup functionality
    console.log('\n🔍 Test 5: Test cleanup functionality');
    
    // Add many more entries to trigger cleanup
    const testStudent = testStudents[0];
    console.log(`\n   Adding many entries for ${testStudent.name} to test cleanup...`);
    
    for (let i = 0; i < 25; i++) {
      await recordGenreCombination(testStudent.id, `Test Genre ${i}`);
    }
    
    // Check count before cleanup
    const beforeCleanup = await prisma.studentGenreHistory.count({
      where: { studentId: testStudent.id }
    });
    console.log(`     Entries before cleanup: ${beforeCleanup}`);
    
    // Run cleanup
    const deletedCount = await cleanupOldGenreHistory(testStudent.id);
    console.log(`     Deleted entries: ${deletedCount}`);
    
    // Check count after cleanup
    const afterCleanup = await prisma.studentGenreHistory.count({
      where: { studentId: testStudent.id }
    });
    console.log(`     Entries after cleanup: ${afterCleanup}`);
    
    if (afterCleanup <= 15) {
      console.log(`     ✅ Cleanup successful - maintained recent history`);
    } else {
      console.log(`     ⚠️  Cleanup may not have worked as expected`);
    }

    // Test 6: Test API endpoint (simulate the request)
    console.log('\n🔍 Test 6: Test API endpoint simulation');
    
    for (const student of testStudents) {
      console.log(`\n   Testing API endpoint for ${student.name}:`);
      
      // Simulate the API endpoint logic
      const genreHistory = await prisma.studentGenreHistory.findMany({
        where: { studentId: student.id },
        orderBy: { usedAt: 'desc' },
        take: 20,
        select: {
          genreCombination: true,
          usedAt: true
        }
      });

      const varietyStats = await getGenreVarietyStats(student.id);
      
      // Calculate genre frequency
      const genreFrequency = {};
      genreHistory.forEach(entry => {
        genreFrequency[entry.genreCombination] = (genreFrequency[entry.genreCombination] || 0) + 1;
      });

      const sortedGenres = Object.entries(genreFrequency)
        .sort(([,a], [,b]) => b - a);
      
      const mostUsedGenres = sortedGenres.slice(0, 3).map(([genre, count]) => ({
        genre,
        count,
        percentage: Math.round((count / genreHistory.length) * 100)
      }));

      console.log(`     API Response would include:`);
      console.log(`       - Total combinations: ${varietyStats.totalCombinations}`);
      console.log(`       - Variety score: ${varietyStats.varietyScore}%`);
      console.log(`       - Most used genres: ${mostUsedGenres.map(g => `${g.genre} (${g.count})`).join(', ')}`);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    
    for (const student of testStudents) {
      await prisma.studentGenreHistory.deleteMany({
        where: { studentId: student.id }
      });
      await prisma.student.delete({
        where: { id: student.id }
      });
    }
    
    await prisma.parent.delete({
      where: { id: testParent.id }
    });

    console.log('✅ Cleanup completed');
    console.log('\n🎉 All genre tracking tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testGenreTracking();
