import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate story completion rates by genre combination
 * @param {number} studentId - The student ID
 * @param {number} daysBack - Number of days to look back (default: 30)
 * @returns {Promise<object>} Completion rates by genre
 */
export async function getGenreCompletionRates(studentId, daysBack = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Get all weekly plans with genre combinations for the student
    const weeklyPlans = await prisma.weeklyPlan.findMany({
      where: {
        studentId: studentId,
        createdAt: { gte: cutoffDate },
        genreCombination: { not: null }
      },
      include: {
        dailyActivities: {
          select: {
            completed: true,
            completedAt: true
          }
        }
      }
    });

    const genreStats = {};

    weeklyPlans.forEach(plan => {
      const genre = plan.genreCombination;
      if (!genreStats[genre]) {
        genreStats[genre] = {
          totalPlans: 0,
          completedPlans: 0,
          totalActivities: 0,
          completedActivities: 0,
          averageCompletionRate: 0
        };
      }

      genreStats[genre].totalPlans++;
      
      const activities = plan.dailyActivities;
      const completedActivities = activities.filter(a => a.completed).length;
      
      genreStats[genre].totalActivities += activities.length;
      genreStats[genre].completedActivities += completedActivities;

      // Check if plan is "completed" (all activities done)
      if (completedActivities === activities.length && activities.length > 0) {
        genreStats[genre].completedPlans++;
      }
    });

    // Calculate completion rates
    Object.keys(genreStats).forEach(genre => {
      const stats = genreStats[genre];
      stats.planCompletionRate = stats.totalPlans > 0 
        ? Math.round((stats.completedPlans / stats.totalPlans) * 100) 
        : 0;
      stats.activityCompletionRate = stats.totalActivities > 0 
        ? Math.round((stats.completedActivities / stats.totalActivities) * 100) 
        : 0;
    });

    return {
      studentId,
      period: `${daysBack} days`,
      genreStats,
      summary: {
        totalPlans: weeklyPlans.length,
        totalGenres: Object.keys(genreStats).length,
        averagePlanCompletionRate: Object.values(genreStats).length > 0 
          ? Math.round(Object.values(genreStats).reduce((sum, stats) => sum + stats.planCompletionRate, 0) / Object.values(genreStats).length)
          : 0
      }
    };
  } catch (error) {
    console.error('Error calculating genre completion rates:', error);
    return {
      studentId,
      period: `${daysBack} days`,
      genreStats: {},
      summary: {
        totalPlans: 0,
        totalGenres: 0,
        averagePlanCompletionRate: 0
      }
    };
  }
}

/**
 * Get genre performance analytics across all students
 * @param {number} daysBack - Number of days to look back (default: 30)
 * @returns {Promise<object>} Overall genre performance
 */
export async function getOverallGenrePerformance(daysBack = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Get all weekly plans with genre combinations
    const weeklyPlans = await prisma.weeklyPlan.findMany({
      where: {
        createdAt: { gte: cutoffDate },
        genreCombination: { not: null }
      },
      include: {
        dailyActivities: {
          select: {
            completed: true,
            completedAt: true
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            gradeLevel: true
          }
        }
      }
    });

    const genrePerformance = {};
    const studentPerformance = {};

    weeklyPlans.forEach(plan => {
      const genre = plan.genreCombination;
      const studentId = plan.studentId;

      // Initialize genre stats
      if (!genrePerformance[genre]) {
        genrePerformance[genre] = {
          totalPlans: 0,
          completedPlans: 0,
          totalActivities: 0,
          completedActivities: 0,
          students: new Set(),
          gradeLevels: new Set()
        };
      }

      // Initialize student stats
      if (!studentPerformance[studentId]) {
        studentPerformance[studentId] = {
          studentName: plan.student.name,
          gradeLevel: plan.student.gradeLevel,
          totalPlans: 0,
          completedPlans: 0,
          genres: new Set()
        };
      }

      // Update genre stats
      genrePerformance[genre].totalPlans++;
      genrePerformance[genre].students.add(studentId);
      genrePerformance[genre].gradeLevels.add(plan.student.gradeLevel);

      // Update student stats
      studentPerformance[studentId].totalPlans++;
      studentPerformance[studentId].genres.add(genre);

      const activities = plan.dailyActivities;
      const completedActivities = activities.filter(a => a.completed).length;

      genrePerformance[genre].totalActivities += activities.length;
      genrePerformance[genre].completedActivities += completedActivities;

      if (completedActivities === activities.length && activities.length > 0) {
        genrePerformance[genre].completedPlans++;
        studentPerformance[studentId].completedPlans++;
      }
    });

    // Calculate completion rates and convert Sets to arrays
    Object.keys(genrePerformance).forEach(genre => {
      const stats = genrePerformance[genre];
      stats.planCompletionRate = stats.totalPlans > 0 
        ? Math.round((stats.completedPlans / stats.totalPlans) * 100) 
        : 0;
      stats.activityCompletionRate = stats.totalActivities > 0 
        ? Math.round((stats.completedActivities / stats.totalActivities) * 100) 
        : 0;
      stats.uniqueStudents = stats.students.size;
      stats.gradeLevels = Array.from(stats.gradeLevels).sort();
      delete stats.students;
    });

    // Calculate student completion rates
    Object.keys(studentPerformance).forEach(studentId => {
      const stats = studentPerformance[studentId];
      stats.planCompletionRate = stats.totalPlans > 0 
        ? Math.round((stats.completedPlans / stats.totalPlans) * 100) 
        : 0;
      stats.uniqueGenres = stats.genres.size;
      stats.genres = Array.from(stats.genres);
    });

    // Find top performing genres
    const topGenres = Object.entries(genrePerformance)
      .sort(([,a], [,b]) => b.planCompletionRate - a.planCompletionRate)
      .slice(0, 5)
      .map(([genre, stats]) => ({
        genre,
        planCompletionRate: stats.planCompletionRate,
        totalPlans: stats.totalPlans,
        uniqueStudents: stats.uniqueStudents
      }));

    // Find top performing students
    const topStudents = Object.entries(studentPerformance)
      .sort(([,a], [,b]) => b.planCompletionRate - a.planCompletionRate)
      .slice(0, 5)
      .map(([studentId, stats]) => ({
        studentId: parseInt(studentId),
        studentName: stats.studentName,
        gradeLevel: stats.gradeLevel,
        planCompletionRate: stats.planCompletionRate,
        totalPlans: stats.totalPlans,
        uniqueGenres: stats.uniqueGenres
      }));

    return {
      period: `${daysBack} days`,
      summary: {
        totalPlans: weeklyPlans.length,
        totalGenres: Object.keys(genrePerformance).length,
        totalStudents: Object.keys(studentPerformance).length,
        averagePlanCompletionRate: Object.values(genrePerformance).length > 0 
          ? Math.round(Object.values(genrePerformance).reduce((sum, stats) => sum + stats.planCompletionRate, 0) / Object.values(genrePerformance).length)
          : 0
      },
      genrePerformance,
      studentPerformance,
      topGenres,
      topStudents
    };
  } catch (error) {
    console.error('Error calculating overall genre performance:', error);
    return {
      period: `${daysBack} days`,
      summary: {
        totalPlans: 0,
        totalGenres: 0,
        totalStudents: 0,
        averagePlanCompletionRate: 0
      },
      genrePerformance: {},
      studentPerformance: {},
      topGenres: [],
      topStudents: []
    };
  }
}

/**
 * Get genre engagement metrics (time spent, activity completion patterns)
 * @param {number} studentId - The student ID
 * @param {number} daysBack - Number of days to look back (default: 30)
 * @returns {Promise<object>} Engagement metrics by genre
 */
export async function getGenreEngagementMetrics(studentId, daysBack = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Get weekly plans with activities and completion times
    const weeklyPlans = await prisma.weeklyPlan.findMany({
      where: {
        studentId: studentId,
        createdAt: { gte: cutoffDate },
        genreCombination: { not: null }
      },
      include: {
        dailyActivities: {
          select: {
            dayOfWeek: true,
            activityType: true,
            completed: true,
            completedAt: true,
            createdAt: true
          }
        }
      }
    });

    const genreEngagement = {};

    weeklyPlans.forEach(plan => {
      const genre = plan.genreCombination;
      if (!genreEngagement[genre]) {
        genreEngagement[genre] = {
          totalPlans: 0,
          totalActivities: 0,
          completedActivities: 0,
          activityTypes: {},
          completionPatterns: {
            day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0, day7: 0
          },
          averageCompletionTime: 0
        };
      }

      genreEngagement[genre].totalPlans++;

      plan.dailyActivities.forEach(activity => {
        genreEngagement[genre].totalActivities++;

        // Track activity types
        if (!genreEngagement[genre].activityTypes[activity.activityType]) {
          genreEngagement[genre].activityTypes[activity.activityType] = 0;
        }
        genreEngagement[genre].activityTypes[activity.activityType]++;

        if (activity.completed) {
          genreEngagement[genre].completedActivities++;
          genreEngagement[genre].completionPatterns[`day${activity.dayOfWeek}`]++;

          // Calculate completion time if both dates are available
          if (activity.completedAt && activity.createdAt) {
            const completionTime = activity.completedAt.getTime() - activity.createdAt.getTime();
            const daysToComplete = completionTime / (1000 * 60 * 60 * 24);
            
            if (!genreEngagement[genre].completionTimes) {
              genreEngagement[genre].completionTimes = [];
            }
            genreEngagement[genre].completionTimes.push(daysToComplete);
          }
        }
      });
    });

    // Calculate averages and percentages
    Object.keys(genreEngagement).forEach(genre => {
      const stats = genreEngagement[genre];
      
      stats.completionRate = stats.totalActivities > 0 
        ? Math.round((stats.completedActivities / stats.totalActivities) * 100) 
        : 0;

      // Calculate average completion time
      if (stats.completionTimes && stats.completionTimes.length > 0) {
        stats.averageCompletionTime = Math.round(
          stats.completionTimes.reduce((sum, time) => sum + time, 0) / stats.completionTimes.length * 100
        ) / 100; // Round to 2 decimal places
      }

      // Find most engaged day
      const completionPatterns = stats.completionPatterns;
      const mostEngagedDay = Object.entries(completionPatterns)
        .sort(([,a], [,b]) => b - a)[0];
      
      stats.mostEngagedDay = {
        day: mostEngagedDay[0],
        completions: mostEngagedDay[1]
      };

      // Find most popular activity type
      const activityTypes = stats.activityTypes;
      const mostPopularActivity = Object.entries(activityTypes)
        .sort(([,a], [,b]) => b - a)[0];
      
      stats.mostPopularActivity = {
        type: mostPopularActivity[0],
        count: mostPopularActivity[1]
      };

      delete stats.completionTimes; // Remove raw data from response
    });

    return {
      studentId,
      period: `${daysBack} days`,
      genreEngagement,
      summary: {
        totalPlans: weeklyPlans.length,
        totalGenres: Object.keys(genreEngagement).length,
        averageCompletionRate: Object.values(genreEngagement).length > 0 
          ? Math.round(Object.values(genreEngagement).reduce((sum, stats) => sum + stats.completionRate, 0) / Object.values(genreEngagement).length)
          : 0
      }
    };
  } catch (error) {
    console.error('Error calculating genre engagement metrics:', error);
    return {
      studentId,
      period: `${daysBack} days`,
      genreEngagement: {},
      summary: {
        totalPlans: 0,
        totalGenres: 0,
        averageCompletionRate: 0
      }
    };
  }
}

/**
 * Get genre system performance metrics
 * @returns {Promise<object>} System performance metrics
 */
export async function getGenreSystemPerformance() {
  try {
    // Get total counts
    const totalStudents = await prisma.student.count();
    const totalGenreWords = await prisma.genreWord.count();
    const totalGenreHistory = await prisma.studentGenreHistory.count();
    const totalWeeklyPlans = await prisma.weeklyPlan.count({
      where: { genreCombination: { not: null } }
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentPlans = await prisma.weeklyPlan.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
        genreCombination: { not: null }
      }
    });

    const recentHistory = await prisma.studentGenreHistory.count({
      where: { usedAt: { gte: sevenDaysAgo } }
    });

    // Get genre word usage statistics
    const genreWordUsage = await prisma.studentGenreHistory.groupBy({
      by: ['genreCombination'],
      _count: { genreCombination: true },
      orderBy: { _count: { genreCombination: 'desc' } },
      take: 10
    });

    // Calculate system health metrics
    const activeGenreWords = await prisma.genreWord.count({
      where: { active: true }
    });

    const inactiveGenreWords = totalGenreWords - activeGenreWords;

    return {
      systemMetrics: {
        totalStudents,
        totalGenreWords,
        activeGenreWords,
        inactiveGenreWords,
        totalGenreHistory,
        totalWeeklyPlans,
        recentPlans,
        recentHistory
      },
      recentActivity: {
        period: '7 days',
        plansGenerated: recentPlans,
        genreCombinationsUsed: recentHistory
      },
      topUsedGenres: genreWordUsage.map(item => ({
        genre: item.genreCombination,
        usageCount: item._count.genreCombination
      })),
      systemHealth: {
        genreWordUtilization: totalGenreWords > 0 
          ? Math.round((activeGenreWords / totalGenreWords) * 100) 
          : 0,
        averagePlansPerStudent: totalStudents > 0 
          ? Math.round((totalWeeklyPlans / totalStudents) * 100) / 100 
          : 0,
        averageHistoryPerStudent: totalStudents > 0 
          ? Math.round((totalGenreHistory / totalStudents) * 100) / 100 
          : 0
      }
    };
  } catch (error) {
    console.error('Error calculating genre system performance:', error);
    return {
      systemMetrics: {
        totalStudents: 0,
        totalGenreWords: 0,
        activeGenreWords: 0,
        inactiveGenreWords: 0,
        totalGenreHistory: 0,
        totalWeeklyPlans: 0,
        recentPlans: 0,
        recentHistory: 0
      },
      recentActivity: {
        period: '7 days',
        plansGenerated: 0,
        genreCombinationsUsed: 0
      },
      topUsedGenres: [],
      systemHealth: {
        genreWordUtilization: 0,
        averagePlansPerStudent: 0,
        averageHistoryPerStudent: 0
      }
    };
  }
}
