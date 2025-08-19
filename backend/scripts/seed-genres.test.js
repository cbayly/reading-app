import { PrismaClient } from '@prisma/client';
import { seedGenres } from './seed-genres.js';

const prisma = new PrismaClient();

describe('Genre Seeding Tests', () => {
  beforeAll(async () => {
    // Ensure database is clean before tests
    await prisma.studentGenreHistory.deleteMany();
    await prisma.genreWord.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should seed genre words correctly', async () => {
    // Run the seed function
    await seedGenres();

    // Verify total count
    const totalCount = await prisma.genreWord.count();
    expect(totalCount).toBe(40);

    // Verify List A count
    const listACount = await prisma.genreWord.count({
      where: { listType: 'A' }
    });
    expect(listACount).toBe(20);

    // Verify List B count
    const listBCount = await prisma.genreWord.count({
      where: { listType: 'B' }
    });
    expect(listBCount).toBe(20);
  });

  test('should have correct age restrictions', async () => {
    // Check that age-appropriate words exist
    const youngChildWords = await prisma.genreWord.findMany({
      where: {
        minAge: { lte: 6 },
        active: true
      }
    });
    expect(youngChildWords.length).toBeGreaterThan(0);

    // Check that older child words exist
    const olderChildWords = await prisma.genreWord.findMany({
      where: {
        minAge: { gte: 12 },
        active: true
      }
    });
    expect(olderChildWords.length).toBeGreaterThan(0);
  });

  test('should have unique words', async () => {
    const words = await prisma.genreWord.findMany({
      select: { word: true }
    });
    
    const wordSet = new Set(words.map(w => w.word));
    expect(wordSet.size).toBe(words.length);
  });

  test('should have valid list types', async () => {
    const invalidListTypes = await prisma.genreWord.findMany({
      where: {
        listType: {
          notIn: ['A', 'B']
        }
      }
    });
    expect(invalidListTypes.length).toBe(0);
  });

  test('should have all required fields', async () => {
    const genreWords = await prisma.genreWord.findMany();
    
    for (const word of genreWords) {
      expect(word.word).toBeDefined();
      expect(word.listType).toBeDefined();
      expect(word.active).toBeDefined();
      expect(word.createdAt).toBeDefined();
      expect(word.updatedAt).toBeDefined();
    }
  });

  test('should handle duplicate seeding gracefully', async () => {
    // Run seed again
    await seedGenres();
    
    // Should still have exactly 40 words
    const totalCount = await prisma.genreWord.count();
    expect(totalCount).toBe(40);
  });
});

describe('Genre Database Schema Tests', () => {
  test('should create genre word with all fields', async () => {
    const testWord = await prisma.genreWord.create({
      data: {
        word: 'TestWord',
        listType: 'A',
        minAge: 8,
        maxAge: 16,
        active: true
      }
    });

    expect(testWord.word).toBe('TestWord');
    expect(testWord.listType).toBe('A');
    expect(testWord.minAge).toBe(8);
    expect(testWord.maxAge).toBe(16);
    expect(testWord.active).toBe(true);

    // Clean up
    await prisma.genreWord.delete({
      where: { id: testWord.id }
    });
  });

  test('should create student genre history', async () => {
    // First create a test parent
    const testParent = await prisma.parent.create({
      data: {
        name: 'Test Parent',
        email: 'testparent@example.com',
        passwordHash: 'testhash'
      }
    });

    // Then create a test student
    const testStudent = await prisma.student.create({
      data: {
        parentId: testParent.id,
        name: 'Test Student',
        birthday: new Date('2010-01-01'),
        gradeLevel: 5,
        interests: 'test,interests'
      }
    });

    const history = await prisma.studentGenreHistory.create({
      data: {
        studentId: testStudent.id,
        genreCombination: 'Test Mystery'
      }
    });

    expect(history.studentId).toBe(testStudent.id);
    expect(history.genreCombination).toBe('Test Mystery');
    expect(history.usedAt).toBeDefined();

    // Clean up
    await prisma.studentGenreHistory.delete({
      where: { id: history.id }
    });
    await prisma.student.delete({
      where: { id: testStudent.id }
    });
    await prisma.parent.delete({
      where: { id: testParent.id }
    });
  });
});
