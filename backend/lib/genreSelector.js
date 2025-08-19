import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Genre Selector Utility Module
 * 
 * This module handles the selection of genre combinations for story generation,
 * ensuring variety and age-appropriateness while avoiding recent repetitions.
 */

/**
 * Select a random genre combination for a student
 * @param {number} studentId - The student's ID
 * @param {number} studentAge - The student's age in years
 * @returns {Promise<{listAWord: string, listBWord: string, combination: string}>}
 */
export async function selectRandomGenreCombination(studentId, studentAge) {
  try {
    console.log(`🎭 Genre Selection: Starting for student ${studentId} (age ${studentAge})`);
    
    // Get age-appropriate words from both lists
    const listAWords = await getAgeAppropriateWords('A', studentAge);
    const listBWords = await getAgeAppropriateWords('B', studentAge);

    console.log(`📚 Available words - List A: ${listAWords.length}, List B: ${listBWords.length}`);

    if (listAWords.length === 0 || listBWords.length === 0) {
      console.error(`❌ No age-appropriate genre words found for age ${studentAge}`);
      throw new Error('No age-appropriate genre words found');
    }

    // Get student's recent genre history
    const recentCombinations = await getRecentGenreCombinations(studentId);
    console.log(`🔄 Recent combinations (${recentCombinations.length}): ${recentCombinations.slice(0, 3).join(', ')}${recentCombinations.length > 3 ? '...' : ''}`);

    // Find combinations that haven't been used recently
    const availableCombinations = [];
    const totalPossibleCombinations = listAWords.length * listBWords.length;
    
    for (const wordA of listAWords) {
      for (const wordB of listBWords) {
        const combination = `${wordA} ${wordB}`;
        if (!recentCombinations.includes(combination)) {
          availableCombinations.push({
            listAWord: wordA,
            listBWord: wordB,
            combination: combination
          });
        }
      }
    }

    console.log(`📊 Combination analysis: ${availableCombinations.length}/${totalPossibleCombinations} combinations available (${Math.round((availableCombinations.length / totalPossibleCombinations) * 100)}% unique)`);

    // If no unused combinations, use any combination (fallback)
    if (availableCombinations.length === 0) {
      console.warn(`⚠️  No unique combinations available for student ${studentId}, using fallback selection`);
      
      const randomWordA = listAWords[Math.floor(Math.random() * listAWords.length)];
      const randomWordB = listBWords[Math.floor(Math.random() * listBWords.length)];
      const fallbackCombination = `${randomWordA} ${randomWordB}`;
      
      console.log(`🎲 Fallback selection: "${fallbackCombination}" (may be repeated)`);
      
      return {
        listAWord: randomWordA,
        listBWord: randomWordB,
        combination: fallbackCombination
      };
    }

    // Select a random available combination
    const selectedCombination = availableCombinations[
      Math.floor(Math.random() * availableCombinations.length)
    ];

    console.log(`✅ Selected unique combination: "${selectedCombination.combination}"`);
    console.log(`📈 Selection outcome: ${availableCombinations.length} unique options available`);

    return selectedCombination;

  } catch (error) {
    console.error('❌ Error selecting genre combination:', error);
    throw error;
  }
}

/**
 * Get age-appropriate words from a specific list
 * @param {string} listType - 'A' for Setting/Style/Time, 'B' for Genre/Theme
 * @param {number} studentAge - The student's age in years
 * @returns {Promise<string[]>} Array of word strings
 */
async function getAgeAppropriateWords(listType, studentAge) {
  try {
    const words = await prisma.genreWord.findMany({
      where: {
        listType: listType,
        active: true,
        AND: [
          {
            OR: [
              { minAge: null },
              { minAge: { lte: studentAge } }
            ]
          },
          {
            OR: [
              { maxAge: null },
              { maxAge: { gte: studentAge } }
            ]
          }
        ]
      },
      select: { word: true }
    });

    return words.map(w => w.word);
  } catch (error) {
    console.error(`Error getting age-appropriate words for list ${listType}:`, error);
    throw error;
  }
}

/**
 * Get recent genre combinations for a student (last 15 stories)
 * @param {number} studentId - The student's ID
 * @returns {Promise<string[]>} Array of recent combinations
 */
async function getRecentGenreCombinations(studentId) {
  try {
    const recentHistory = await prisma.studentGenreHistory.findMany({
      where: { studentId: studentId },
      orderBy: { usedAt: 'desc' },
      take: 15,
      select: { genreCombination: true }
    });

    return recentHistory.map(h => h.genreCombination);
  } catch (error) {
    console.error('Error getting recent genre combinations:', error);
    throw error;
  }
}

/**
 * Record a genre combination in the student's history
 * @param {number} studentId - The student's ID
 * @param {string} combination - The genre combination used
 * @returns {Promise<void>}
 */
export async function recordGenreCombination(studentId, combination) {
  try {
    // Validate inputs
    if (!studentId || !combination) {
      throw new Error('Student ID and genre combination are required');
    }

    if (typeof combination !== 'string' || combination.trim().length === 0) {
      throw new Error('Genre combination must be a non-empty string');
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true }
    });

    if (!student) {
      throw new Error(`Student with ID ${studentId} not found`);
    }

    // Record the genre combination
    await prisma.studentGenreHistory.create({
      data: {
        studentId: studentId,
        genreCombination: combination.trim()
      }
    });

    console.log(`📝 Genre Tracking: Successfully recorded "${combination}" for student ${studentId}`);
    console.log(`📊 Genre History: Student ${studentId} now has ${await prisma.studentGenreHistory.count({ where: { studentId } })} total genre combinations`);
  } catch (error) {
    console.error('Error recording genre combination:', error);
    
    // Don't throw errors for tracking failures - just log them
    // This prevents genre tracking issues from breaking story generation
    if (error.code === 'P2002') {
      console.warn('Duplicate genre combination entry detected - this is normal for rapid requests');
    } else {
      console.error('Genre tracking failed, but continuing with story generation');
    }
  }
}

/**
 * Clean up old genre history entries (older than 15 stories)
 * @param {number} studentId - The student's ID
 * @returns {Promise<number>} Number of deleted entries
 */
export async function cleanupOldGenreHistory(studentId) {
  try {
    // Validate input
    if (!studentId) {
      throw new Error('Student ID is required');
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true }
    });

    if (!student) {
      console.warn(`Student with ID ${studentId} not found for cleanup`);
      return 0;
    }

    // Get the 15th most recent entry to determine cutoff
    const cutoffEntry = await prisma.studentGenreHistory.findMany({
      where: { studentId: studentId },
      orderBy: { usedAt: 'desc' },
      take: 15,
      skip: 14,
      select: { usedAt: true }
    });

    if (cutoffEntry.length === 0) {
      return 0; // No entries to clean up
    }

    const cutoffDate = cutoffEntry[0].usedAt;

    // Delete entries older than the cutoff
    const result = await prisma.studentGenreHistory.deleteMany({
      where: {
        studentId: studentId,
        usedAt: { lt: cutoffDate }
      }
    });

    if (result.count > 0) {
      console.log(`Cleaned up ${result.count} old genre history entries for student ${studentId}`);
    }

    return result.count;
  } catch (error) {
    console.error('Error cleaning up old genre history:', error);
    
    // Don't throw errors for cleanup failures - just log them
    // This prevents cleanup issues from breaking other functionality
    if (error.code === 'P2025') {
      console.warn('No records found for cleanup - this is normal for new students');
    } else {
      console.error('Genre history cleanup failed, but continuing with normal operation');
    }
    
    return 0; // Return 0 to indicate no cleanup occurred
  }
}

/**
 * Get genre variety statistics for a student
 * @param {number} studentId - The student's ID
 * @returns {Promise<{totalCombinations: number, uniqueCombinations: number, varietyScore: number}>}
 */
export async function getGenreVarietyStats(studentId) {
  try {
    // Validate input
    if (!studentId) {
      throw new Error('Student ID is required');
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true }
    });

    if (!student) {
      console.warn(`Student with ID ${studentId} not found for variety stats`);
      return {
        totalCombinations: 0,
        uniqueCombinations: 0,
        varietyScore: 0
      };
    }

    const allHistory = await prisma.studentGenreHistory.findMany({
      where: { studentId: studentId },
      select: { genreCombination: true }
    });

    const totalCombinations = allHistory.length;
    const uniqueCombinations = new Set(allHistory.map(h => h.genreCombination)).size;
    const varietyScore = totalCombinations > 0 ? (uniqueCombinations / totalCombinations) * 100 : 0;

    return {
      totalCombinations,
      uniqueCombinations,
      varietyScore: Math.round(varietyScore)
    };
  } catch (error) {
    console.error('Error getting genre variety stats:', error);
    
    // Return default values instead of throwing
    // This prevents analytics failures from breaking other functionality
    return {
      totalCombinations: 0,
      uniqueCombinations: 0,
      varietyScore: 0
    };
  }
}

/**
 * Get all available genre words for debugging/admin purposes
 * @returns {Promise<{listA: string[], listB: string[]}>}
 */
export async function getAllGenreWords() {
  try {
    const listAWords = await prisma.genreWord.findMany({
      where: { listType: 'A', active: true },
      select: { word: true, minAge: true, maxAge: true },
      orderBy: { word: 'asc' }
    });

    const listBWords = await prisma.genreWord.findMany({
      where: { listType: 'B', active: true },
      select: { word: true, minAge: true, maxAge: true },
      orderBy: { word: 'asc' }
    });

    return {
      listA: listAWords.map(w => ({ word: w.word, minAge: w.minAge, maxAge: w.maxAge })),
      listB: listBWords.map(w => ({ word: w.word, minAge: w.minAge, maxAge: w.maxAge }))
    };
  } catch (error) {
    console.error('Error getting all genre words:', error);
    throw error;
  }
}

/**
 * Validate if a genre combination is age-appropriate
 * @param {string} combination - The genre combination to validate
 * @param {number} studentAge - The student's age in years
 * @returns {Promise<boolean>}
 */
export async function validateAgeAppropriateness(combination, studentAge) {
  try {
    const [wordA, wordB] = combination.split(' ');
    
    if (!wordA || !wordB) {
      return false;
    }

    const wordAValid = await prisma.genreWord.findFirst({
      where: {
        word: wordA,
        active: true,
        AND: [
          {
            OR: [
              { minAge: null },
              { minAge: { lte: studentAge } }
            ]
          },
          {
            OR: [
              { maxAge: null },
              { maxAge: { gte: studentAge } }
            ]
          }
        ]
      }
    });

    const wordBValid = await prisma.genreWord.findFirst({
      where: {
        word: wordB,
        active: true,
        AND: [
          {
            OR: [
              { minAge: null },
              { minAge: { lte: studentAge } }
            ]
          },
          {
            OR: [
              { maxAge: null },
              { maxAge: { gte: studentAge } }
            ]
          }
        ]
      }
    });

    return !!(wordAValid && wordBValid);
  } catch (error) {
    console.error('Error validating age appropriateness:', error);
    return false;
  }
}

// Export for testing
export {
  getAgeAppropriateWords,
  getRecentGenreCombinations
};
