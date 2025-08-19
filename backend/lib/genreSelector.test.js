import {
  selectRandomGenreCombination,
  recordGenreCombination,
  cleanupOldGenreHistory,
  getGenreVarietyStats,
  getAllGenreWords,
  validateAgeAppropriateness,
  getAgeAppropriateWords,
  getRecentGenreCombinations
} from './genreSelector.js';

// Mock the entire module
jest.mock('./genreSelector.js', () => {
  const originalModule = jest.requireActual('./genreSelector.js');
  return {
    ...originalModule,
    // Mock the Prisma client methods
    __mockPrisma: {
      genreWord: {
        findMany: jest.fn(),
        findFirst: jest.fn()
      },
      studentGenreHistory: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn()
      }
    }
  };
});

// Get the mocked Prisma instance
const { __mockPrisma: mockPrisma } = await import('./genreSelector.js');

describe('Genre Selector Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectRandomGenreCombination', () => {
    it('should select a valid genre combination', async () => {
      // Mock age-appropriate words
      mockPrisma.genreWord.findMany
        .mockResolvedValueOnce([{ word: 'Modern' }, { word: 'Whimsical' }]) // List A
        .mockResolvedValueOnce([{ word: 'Adventure' }, { word: 'Mystery' }]); // List B

      // Mock recent combinations (empty)
      mockPrisma.studentGenreHistory.findMany.mockResolvedValueOnce([]);

      const result = await selectRandomGenreCombination(1, 10);

      expect(result).toHaveProperty('listAWord');
      expect(result).toHaveProperty('listBWord');
      expect(result).toHaveProperty('combination');
      expect(result.combination).toBe(`${result.listAWord} ${result.listBWord}`);
    });

    it('should avoid recently used combinations', async () => {
      // Mock age-appropriate words
      mockPrisma.genreWord.findMany
        .mockResolvedValueOnce([{ word: 'Modern' }, { word: 'Whimsical' }]) // List A
        .mockResolvedValueOnce([{ word: 'Adventure' }, { word: 'Mystery' }]); // List B

      // Mock recent combinations
      mockPrisma.studentGenreHistory.findMany.mockResolvedValueOnce([
        { genreCombination: 'Modern Adventure' }
      ]);

      const result = await selectRandomGenreCombination(1, 10);

      expect(result.combination).not.toBe('Modern Adventure');
      expect(['Modern Mystery', 'Whimsical Adventure', 'Whimsical Mystery']).toContain(result.combination);
    });

    it('should use fallback when all combinations are recent', async () => {
      // Mock age-appropriate words
      mockPrisma.genreWord.findMany
        .mockResolvedValueOnce([{ word: 'Modern' }]) // List A
        .mockResolvedValueOnce([{ word: 'Adventure' }]); // List B

      // Mock recent combinations (all used)
      mockPrisma.studentGenreHistory.findMany.mockResolvedValueOnce([
        { genreCombination: 'Modern Adventure' }
      ]);

      const result = await selectRandomGenreCombination(1, 10);

      expect(result.combination).toBe('Modern Adventure'); // Fallback to any combination
    });

    it('should throw error when no age-appropriate words found', async () => {
      // Mock no age-appropriate words
      mockPrisma.genreWord.findMany.mockResolvedValueOnce([]);

      await expect(selectRandomGenreCombination(1, 10)).rejects.toThrow('No age-appropriate genre words found');
    });
  });

  describe('getAgeAppropriateWords', () => {
    it('should filter words by age appropriately', async () => {
      const mockWords = [
        { word: 'Whimsical', minAge: 5, maxAge: 18 },
        { word: 'Dark', minAge: 10, maxAge: 18 },
        { word: 'Horror', minAge: 12, maxAge: 18 }
      ];

      mockPrisma.genreWord.findMany.mockResolvedValueOnce(mockWords);

      const result = await getAgeAppropriateWords('A', 8);

      expect(mockPrisma.genreWord.findMany).toHaveBeenCalledWith({
        where: {
          listType: 'A',
          active: true,
          AND: [
            {
              OR: [
                { minAge: null },
                { minAge: { lte: 8 } }
              ]
            },
            {
              OR: [
                { maxAge: null },
                { maxAge: { gte: 8 } }
              ]
            }
          ]
        },
        select: { word: true }
      });

      expect(result).toEqual(['Whimsical', 'Dark', 'Horror']);
    });
  });

  describe('getRecentGenreCombinations', () => {
    it('should return recent combinations for student', async () => {
      const mockHistory = [
        { genreCombination: 'Modern Adventure' },
        { genreCombination: 'Whimsical Mystery' }
      ];

      mockPrisma.studentGenreHistory.findMany.mockResolvedValueOnce(mockHistory);

      const result = await getRecentGenreCombinations(1);

      expect(mockPrisma.studentGenreHistory.findMany).toHaveBeenCalledWith({
        where: { studentId: 1 },
        orderBy: { usedAt: 'desc' },
        take: 15,
        select: { genreCombination: true }
      });

      expect(result).toEqual(['Modern Adventure', 'Whimsical Mystery']);
    });
  });

  describe('recordGenreCombination', () => {
    it('should record a genre combination', async () => {
      mockPrisma.studentGenreHistory.create.mockResolvedValueOnce({});

      await recordGenreCombination(1, 'Modern Adventure');

      expect(mockPrisma.studentGenreHistory.create).toHaveBeenCalledWith({
        data: {
          studentId: 1,
          genreCombination: 'Modern Adventure'
        }
      });
    });
  });

  describe('cleanupOldGenreHistory', () => {
    it('should cleanup old entries', async () => {
      const mockCutoffEntry = [{ usedAt: new Date('2023-01-01') }];
      const mockDeleteResult = { count: 5 };

      mockPrisma.studentGenreHistory.findMany
        .mockResolvedValueOnce(mockCutoffEntry);
      mockPrisma.studentGenreHistory.deleteMany.mockResolvedValueOnce(mockDeleteResult);

      const result = await cleanupOldGenreHistory(1);

      expect(result).toBe(5);
      expect(mockPrisma.studentGenreHistory.deleteMany).toHaveBeenCalledWith({
        where: {
          studentId: 1,
          usedAt: { lt: mockCutoffEntry[0].usedAt }
        }
      });
    });

    it('should return 0 when no entries to cleanup', async () => {
      mockPrisma.studentGenreHistory.findMany.mockResolvedValueOnce([]);

      const result = await cleanupOldGenreHistory(1);

      expect(result).toBe(0);
    });
  });

  describe('getGenreVarietyStats', () => {
    it('should calculate variety statistics correctly', async () => {
      const mockHistory = [
        { genreCombination: 'Modern Adventure' },
        { genreCombination: 'Whimsical Mystery' },
        { genreCombination: 'Modern Adventure' }, // Duplicate
        { genreCombination: 'Dark Fantasy' }
      ];

      mockPrisma.studentGenreHistory.findMany.mockResolvedValueOnce(mockHistory);

      const result = await getGenreVarietyStats(1);

      expect(result).toEqual({
        totalCombinations: 4,
        uniqueCombinations: 3,
        varietyScore: 75 // (3/4) * 100
      });
    });

    it('should handle empty history', async () => {
      mockPrisma.studentGenreHistory.findMany.mockResolvedValueOnce([]);

      const result = await getGenreVarietyStats(1);

      expect(result).toEqual({
        totalCombinations: 0,
        uniqueCombinations: 0,
        varietyScore: 0
      });
    });
  });

  describe('getAllGenreWords', () => {
    it('should return all active genre words', async () => {
      const mockListA = [
        { word: 'Modern', minAge: 6, maxAge: 18 },
        { word: 'Whimsical', minAge: 5, maxAge: 18 }
      ];
      const mockListB = [
        { word: 'Adventure', minAge: 5, maxAge: 18 },
        { word: 'Mystery', minAge: 7, maxAge: 18 }
      ];

      mockPrisma.genreWord.findMany
        .mockResolvedValueOnce(mockListA)
        .mockResolvedValueOnce(mockListB);

      const result = await getAllGenreWords();

      expect(result).toEqual({
        listA: mockListA,
        listB: mockListB
      });
    });
  });

  describe('validateAgeAppropriateness', () => {
    it('should validate age-appropriate combinations', async () => {
      const mockWordA = { word: 'Whimsical', minAge: 5, maxAge: 18 };
      const mockWordB = { word: 'Adventure', minAge: 5, maxAge: 18 };

      mockPrisma.genreWord.findFirst
        .mockResolvedValueOnce(mockWordA)
        .mockResolvedValueOnce(mockWordB);

      const result = await validateAgeAppropriateness('Whimsical Adventure', 10);

      expect(result).toBe(true);
    });

    it('should reject inappropriate combinations', async () => {
      mockPrisma.genreWord.findFirst
        .mockResolvedValueOnce(null) // Word A not found or inappropriate
        .mockResolvedValueOnce({ word: 'Adventure', minAge: 5, maxAge: 18 });

      const result = await validateAgeAppropriateness('Dark Adventure', 8);

      expect(result).toBe(false);
    });

    it('should handle invalid combination format', async () => {
      const result = await validateAgeAppropriateness('InvalidFormat', 10);

      expect(result).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.genreWord.findMany.mockRejectedValueOnce(new Error('Database error'));

      await expect(selectRandomGenreCombination(1, 10)).rejects.toThrow('Database error');
    });

    it('should handle validation errors', async () => {
      mockPrisma.genreWord.findFirst.mockRejectedValueOnce(new Error('Validation error'));

      const result = await validateAgeAppropriateness('Test Combination', 10);

      expect(result).toBe(false);
    });
  });
});
