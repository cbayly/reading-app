import { PrismaClient } from '@prisma/client';
import {
  selectRandomGenreCombination,
  recordGenreCombination,
  cleanupOldGenreHistory,
  getGenreVarietyStats,
  getAllGenreWords,
  validateAgeAppropriateness
} from '../lib/genreSelector.js';
import { seedGenres } from '../scripts/seed-genres.js';

const prisma = new PrismaClient();

describe('Genre Mashup Integration Tests', () => {
  let testStudent;
  let testParent;

  beforeAll(async () => {
    // Ensure database is seeded
    await seedGenres();
  });

  beforeEach(async () => {
    // Create test parent
    testParent = await prisma.parent.create({
      data: {
        name: 'Test Parent',
        email: 'testparent@example.com',
        passwordHash: 'testhash'
      }
    });

    // Create test student
    testStudent = await prisma.student.create({
      data: {
        parentId: testParent.id,
        name: 'Test Student',
        birthday: new Date('2010-01-01'), // 13 years old
        gradeLevel: 7,
        interests: 'sports,reading,music'
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.studentGenreHistory.deleteMany({
      where: { studentId: testStudent.id }
    });
    await prisma.student.delete({
      where: { id: testStudent.id }
    });
    await prisma.parent.delete({
      where: { id: testParent.id }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('End-to-End Genre Selection', () => {
    it('should select and record genre combinations for a student', async () => {
      const studentAge = 13; // Based on birthday

      // Select a genre combination
      const combination = await selectRandomGenreCombination(testStudent.id, studentAge);

      expect(combination).toHaveProperty('listAWord');
      expect(combination).toHaveProperty('listBWord');
      expect(combination).toHaveProperty('combination');
      expect(combination.combination).toBe(`${combination.listAWord} ${combination.listBWord}`);

      // Record the combination
      await recordGenreCombination(testStudent.id, combination.combination);

      // Verify it was recorded
      const history = await prisma.studentGenreHistory.findMany({
        where: { studentId: testStudent.id }
      });

      expect(history).toHaveLength(1);
      expect(history[0].genreCombination).toBe(combination.combination);
    });

    it('should avoid recently used combinations', async () => {
      const studentAge = 13;

      // Record some combinations first
      await recordGenreCombination(testStudent.id, 'Modern Adventure');
      await recordGenreCombination(testStudent.id, 'Whimsical Mystery');

      // Select new combinations multiple times
      const combinations = [];
      for (let i = 0; i < 5; i++) {
        const combination = await selectRandomGenreCombination(testStudent.id, studentAge);
        combinations.push(combination.combination);
        await recordGenreCombination(testStudent.id, combination.combination);
      }

      // Verify no recent combinations were reused
      expect(combinations).not.toContain('Modern Adventure');
      expect(combinations).not.toContain('Whimsical Mystery');
    });

    it('should respect age appropriateness', async () => {
      // Test with a young student (6 years old)
      const youngStudent = await prisma.student.create({
        data: {
          parentId: testParent.id,
          name: 'Young Student',
          birthday: new Date('2017-01-01'), // 6 years old
          gradeLevel: 1,
          interests: 'animals,colors'
        }
      });

      const studentAge = 6;
      const combination = await selectRandomGenreCombination(youngStudent.id, studentAge);

      // Verify the combination is age-appropriate
      const isValid = await validateAgeAppropriateness(combination.combination, studentAge);
      expect(isValid).toBe(true);

      // Clean up
      await prisma.student.delete({
        where: { id: youngStudent.id }
      });
    });
  });

  describe('Genre History Management', () => {
    it('should track genre history correctly', async () => {
      const studentAge = 13;

      // Record multiple combinations
      const combinations = ['Modern Adventure', 'Whimsical Mystery', 'Epic Quest'];
      for (const combo of combinations) {
        await recordGenreCombination(testStudent.id, combo);
      }

      // Get variety stats
      const stats = await getGenreVarietyStats(testStudent.id);

      expect(stats.totalCombinations).toBe(3);
      expect(stats.uniqueCombinations).toBe(3);
      expect(stats.varietyScore).toBe(100);
    });

    it('should calculate variety score with duplicates', async () => {
      const studentAge = 13;

      // Record combinations with some duplicates
      const combinations = [
        'Modern Adventure',
        'Whimsical Mystery',
        'Modern Adventure', // Duplicate
        'Epic Quest',
        'Whimsical Mystery' // Duplicate
      ];

      for (const combo of combinations) {
        await recordGenreCombination(testStudent.id, combo);
      }

      const stats = await getGenreVarietyStats(testStudent.id);

      expect(stats.totalCombinations).toBe(5);
      expect(stats.uniqueCombinations).toBe(3);
      expect(stats.varietyScore).toBe(60); // (3/5) * 100
    });

    it('should cleanup old history entries', async () => {
      const studentAge = 13;

      // Record many combinations to trigger cleanup
      const combinations = [];
      for (let i = 0; i < 20; i++) {
        const combo = `Test Combination ${i}`;
        combinations.push(combo);
        await recordGenreCombination(testStudent.id, combo);
      }

      // Verify we have 20 entries
      let history = await prisma.studentGenreHistory.findMany({
        where: { studentId: testStudent.id }
      });
      expect(history).toHaveLength(20);

      // Cleanup old entries
      const deletedCount = await cleanupOldGenreHistory(testStudent.id);
      expect(deletedCount).toBeGreaterThan(0);

      // Verify cleanup worked
      history = await prisma.studentGenreHistory.findMany({
        where: { studentId: testStudent.id }
      });
      expect(history.length).toBeLessThan(20);
    });
  });

  describe('Age Appropriateness Validation', () => {
    it('should validate appropriate combinations for different ages', async () => {
      // Test young child (6 years old)
      let isValid = await validateAgeAppropriateness('Whimsical Adventure', 6);
      expect(isValid).toBe(true);

      // Test older child (15 years old)
      isValid = await validateAgeAppropriateness('Dark Mystery', 15);
      expect(isValid).toBe(true);

      // Test inappropriate combination for young child
      isValid = await validateAgeAppropriateness('Dark Horror', 6);
      expect(isValid).toBe(false);
    });

    it('should handle invalid combination formats', async () => {
      const isValid = await validateAgeAppropriateness('InvalidFormat', 10);
      expect(isValid).toBe(false);
    });
  });

  describe('Genre Word Management', () => {
    it('should retrieve all genre words', async () => {
      const words = await getAllGenreWords();

      expect(words).toHaveProperty('listA');
      expect(words).toHaveProperty('listB');
      expect(words.listA.length).toBeGreaterThan(0);
      expect(words.listB.length).toBeGreaterThan(0);

      // Verify structure
      expect(words.listA[0]).toHaveProperty('word');
      expect(words.listA[0]).toHaveProperty('minAge');
      expect(words.listA[0]).toHaveProperty('maxAge');
    });

    it('should filter words by age correctly', async () => {
      const words = await getAllGenreWords();

      // Find words appropriate for a 6-year-old
      const youngChildWords = words.listA.filter(w => 
        (w.minAge === null || w.minAge <= 6) && 
        (w.maxAge === null || w.maxAge >= 6)
      );

      expect(youngChildWords.length).toBeGreaterThan(0);

      // Find words appropriate for a 15-year-old
      const olderChildWords = words.listA.filter(w => 
        (w.minAge === null || w.minAge <= 15) && 
        (w.maxAge === null || w.maxAge >= 15)
      );

      expect(olderChildWords.length).toBeGreaterThan(youngChildWords.length);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple rapid selections efficiently', async () => {
      const studentAge = 13;
      const startTime = Date.now();

      // Make multiple rapid selections
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(selectRandomGenreCombination(testStudent.id, studentAge));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Should complete within reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);

      // All results should be valid
      results.forEach(result => {
        expect(result).toHaveProperty('combination');
        expect(result.combination).toMatch(/^[A-Za-z-]+ [A-Za-z-]+$/);
      });
    });

    it('should handle students with extensive history', async () => {
      const studentAge = 13;

      // Create extensive history
      for (let i = 0; i < 50; i++) {
        await recordGenreCombination(testStudent.id, `Test Combination ${i}`);
      }

      // Should still be able to select combinations (fallback to any)
      const combination = await selectRandomGenreCombination(testStudent.id, studentAge);
      expect(combination).toHaveProperty('combination');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent student gracefully', async () => {
      // Non-existent student should still work since we're not checking student existence
      // The function only uses studentId for history tracking
      const result = await selectRandomGenreCombination(99999, 10);
      expect(result).toHaveProperty('combination');
    });

    it('should handle invalid age values', async () => {
      await expect(selectRandomGenreCombination(testStudent.id, -1)).rejects.toThrow();
    });

    it('should handle empty genre word lists', async () => {
      // Test with a very old age that should have no appropriate words
      await expect(selectRandomGenreCombination(testStudent.id, 999)).rejects.toThrow('No age-appropriate genre words found');
    });
  });
});
