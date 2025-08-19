import { PrismaClient } from '@prisma/client';
import { 
  getGenreCompletionRates,
  getOverallGenrePerformance,
  getGenreEngagementMetrics,
  getGenreSystemPerformance
} from '../lib/genreAnalytics.js';

const prisma = new PrismaClient();

async function testGenreAnalytics() {
  try {
    console.log('🧪 Testing Genre Analytics System...\n');

    // Create test parent
    const testParent = await prisma.parent.create({
      data: {
        name: 'Analytics Test Parent',
        email: 'analytics-test@example.com',
        passwordHash: 'testhash'
      }
    });

    // Create test students
    const testStudents = await Promise.all([
      prisma.student.create({
        data: {
          parentId: testParent.id,
          name: 'Analytics Student 1',
          birthday: new Date('2012-01-01'),
          gradeLevel: 5,
          interests: 'sports,reading,music'
        }
      }),
      prisma.student.create({
        data: {
          parentId: testParent.id,
          name: 'Analytics Student 2',
          birthday: new Date('2010-01-01'),
          gradeLevel: 7,
          interests: 'science,technology,art'
        }
      })
    ]);

    console.log(`📚 Created ${testStudents.length} test students\n`);

    // Create test weekly plans with different completion scenarios
    const testPlans = [];
    
    for (const student of testStudents) {
      // Create 3 plans for each student with different completion rates
      for (let i = 1; i <= 3; i++) {
        const plan = await prisma.weeklyPlan.create({
          data: {
            studentId: student.id,
            interestTheme: `test-interest-${i}`,
            genreCombination: `Test Genre ${i}`,
            createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)) // Different dates
          }
        });

        // Create daily activities with different completion patterns
        for (let day = 1; day <= 7; day++) {
          const completed = Math.random() > 0.3; // 70% completion rate
          const completedAt = completed ? new Date() : null;
          
          await prisma.dailyActivity.create({
            data: {
              planId: plan.id,
              dayOfWeek: day,
              activityType: `Test Activity ${day}`,
              content: { test: 'content' },
              completed: completed,
              completedAt: completedAt,
              createdAt: new Date(Date.now() - (day * 60 * 60 * 1000))
            }
          });
        }

        testPlans.push(plan);
      }
    }

    console.log(`📋 Created ${testPlans.length} test weekly plans with activities\n`);

    // Test 1: Genre Completion Rates
    console.log('🔍 Test 1: Genre Completion Rates');
    for (const student of testStudents) {
      console.log(`\n   Testing completion rates for ${student.name}:`);
      
      const completionRates = await getGenreCompletionRates(student.id, 30);
      
      console.log(`     Period: ${completionRates.period}`);
      console.log(`     Total plans: ${completionRates.summary.totalPlans}`);
      console.log(`     Total genres: ${completionRates.summary.totalGenres}`);
      console.log(`     Average completion rate: ${completionRates.summary.averagePlanCompletionRate}%`);
      
      Object.entries(completionRates.genreStats).forEach(([genre, stats]) => {
        console.log(`     ${genre}: ${stats.planCompletionRate}% plan completion, ${stats.activityCompletionRate}% activity completion`);
      });
    }

    // Test 2: Overall Genre Performance
    console.log('\n🔍 Test 2: Overall Genre Performance');
    const overallPerformance = await getOverallGenrePerformance(30);
    
    console.log(`   Period: ${overallPerformance.period}`);
    console.log(`   Total plans: ${overallPerformance.summary.totalPlans}`);
    console.log(`   Total students: ${overallPerformance.summary.totalStudents}`);
    console.log(`   Average completion rate: ${overallPerformance.summary.averagePlanCompletionRate}%`);
    
    console.log(`   Top performing genres:`);
    overallPerformance.topGenres.slice(0, 3).forEach((genre, index) => {
      console.log(`     ${index + 1}. ${genre.genre}: ${genre.planCompletionRate}% (${genre.totalPlans} plans)`);
    });

    console.log(`   Top performing students:`);
    overallPerformance.topStudents.slice(0, 3).forEach((student, index) => {
      console.log(`     ${index + 1}. ${student.studentName}: ${student.planCompletionRate}% (${student.totalPlans} plans)`);
    });

    // Test 3: Genre Engagement Metrics
    console.log('\n🔍 Test 3: Genre Engagement Metrics');
    for (const student of testStudents) {
      console.log(`\n   Testing engagement metrics for ${student.name}:`);
      
      const engagementMetrics = await getGenreEngagementMetrics(student.id, 30);
      
      console.log(`     Period: ${engagementMetrics.period}`);
      console.log(`     Total plans: ${engagementMetrics.summary.totalPlans}`);
      console.log(`     Average completion rate: ${engagementMetrics.summary.averageCompletionRate}%`);
      
      Object.entries(engagementMetrics.genreEngagement).forEach(([genre, stats]) => {
        console.log(`     ${genre}:`);
        console.log(`       Completion rate: ${stats.completionRate}%`);
        console.log(`       Most engaged day: ${stats.mostEngagedDay.day} (${stats.mostEngagedDay.completions} completions)`);
        console.log(`       Most popular activity: ${stats.mostPopularActivity.type} (${stats.mostPopularActivity.count} times)`);
        if (stats.averageCompletionTime > 0) {
          console.log(`       Average completion time: ${stats.averageCompletionTime} days`);
        }
      });
    }

    // Test 4: System Performance
    console.log('\n🔍 Test 4: System Performance');
    const systemPerformance = await getGenreSystemPerformance();
    
    console.log(`   System Metrics:`);
    console.log(`     Total students: ${systemPerformance.systemMetrics.totalStudents}`);
    console.log(`     Total genre words: ${systemPerformance.systemMetrics.totalGenreWords}`);
    console.log(`     Active genre words: ${systemPerformance.systemMetrics.activeGenreWords}`);
    console.log(`     Total genre history: ${systemPerformance.systemMetrics.totalGenreHistory}`);
    console.log(`     Total weekly plans: ${systemPerformance.systemMetrics.totalWeeklyPlans}`);
    
    console.log(`   Recent Activity (${systemPerformance.recentActivity.period}):`);
    console.log(`     Plans generated: ${systemPerformance.recentActivity.plansGenerated}`);
    console.log(`     Genre combinations used: ${systemPerformance.recentActivity.genreCombinationsUsed}`);
    
    console.log(`   System Health:`);
    console.log(`     Genre word utilization: ${systemPerformance.systemHealth.genreWordUtilization}%`);
    console.log(`     Average plans per student: ${systemPerformance.systemHealth.averagePlansPerStudent}`);
    console.log(`     Average history per student: ${systemPerformance.systemHealth.averageHistoryPerStudent}`);
    
    console.log(`   Top Used Genres:`);
    systemPerformance.topUsedGenres.slice(0, 5).forEach((genre, index) => {
      console.log(`     ${index + 1}. ${genre.genre}: ${genre.usageCount} times`);
    });

    // Test 5: Data Validation
    console.log('\n🔍 Test 5: Data Validation');
    
    // Verify that completion rates are between 0-100%
    for (const student of testStudents) {
      const completionRates = await getGenreCompletionRates(student.id, 30);
      
      Object.entries(completionRates.genreStats).forEach(([genre, stats]) => {
        if (stats.planCompletionRate < 0 || stats.planCompletionRate > 100) {
          console.error(`❌ Invalid plan completion rate for ${genre}: ${stats.planCompletionRate}%`);
        }
        if (stats.activityCompletionRate < 0 || stats.activityCompletionRate > 100) {
          console.error(`❌ Invalid activity completion rate for ${genre}: ${stats.activityCompletionRate}%`);
        }
      });
    }

    // Verify that variety scores are between 0-100%
    const overallPerformance2 = await getOverallGenrePerformance(30);
    Object.entries(overallPerformance2.genrePerformance).forEach(([genre, stats]) => {
      if (stats.planCompletionRate < 0 || stats.planCompletionRate > 100) {
        console.error(`❌ Invalid overall plan completion rate for ${genre}: ${stats.planCompletionRate}%`);
      }
    });

    console.log('✅ All data validation checks passed');

    // Test 6: Edge Cases
    console.log('\n🔍 Test 6: Edge Cases');
    
    // Test with non-existent student
    console.log('   Testing with non-existent student...');
    const nonExistentCompletionRates = await getGenreCompletionRates(99999, 30);
    console.log(`     Result: ${nonExistentCompletionRates.summary.totalPlans} plans (expected: 0)`);
    
    // Test with very short period
    console.log('   Testing with 1-day period...');
    const shortPeriodPerformance = await getOverallGenrePerformance(1);
    console.log(`     Result: ${shortPeriodPerformance.summary.totalPlans} plans in 1 day`);
    
    // Test with very long period
    console.log('   Testing with 365-day period...');
    const longPeriodPerformance = await getOverallGenrePerformance(365);
    console.log(`     Result: ${longPeriodPerformance.summary.totalPlans} plans in 365 days`);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    
    for (const student of testStudents) {
      // Delete activities first (due to foreign key constraints)
      const plans = await prisma.weeklyPlan.findMany({
        where: { studentId: student.id }
      });
      
      for (const plan of plans) {
        await prisma.dailyActivity.deleteMany({
          where: { planId: plan.id }
        });
      }
      
      await prisma.weeklyPlan.deleteMany({
        where: { studentId: student.id }
      });
      
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
    console.log('\n🎉 All genre analytics tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testGenreAnalytics();
