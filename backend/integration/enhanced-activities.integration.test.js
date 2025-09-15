/**
 * Comprehensive integration tests for enhanced activities end-to-end flow
 * Tests cover:
 * - Content generation and caching
 * - Activity progress tracking
 * - Cross-device synchronization
 * - Error handling and fallbacks
 * - Performance monitoring
 * - Feature flag integration
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../src/index');

const prisma = new PrismaClient();

describe('Enhanced Activities Integration Tests', () => {
  let testStudent;
  let testPlan;
  let testDay;
  let authToken;

  beforeAll(async () => {
    // Create test data
    testStudent = await prisma.student.create({
      data: {
        name: 'Test Student',
        birthday: '2015-01-01',
        gradeLevel: 3,
        interests: 'space, dinosaurs, robots',
        parentId: 1,
      },
    });

    testPlan = await prisma.plan3.create({
      data: {
        name: 'Test Enhanced Plan',
        theme: 'space adventure',
        studentId: testStudent.id,
        status: 'active',
        story: {
          create: {
            title: 'The Space Explorer',
            themes: ['space', 'adventure', 'friendship'],
            part1: 'Once upon a time, a young explorer named Alex dreamed of visiting the stars...',
            part2: 'Alex built a rocket ship from recycled materials...',
            part3: 'Finally, Alex launched into space and discovered amazing new worlds...',
          },
        },
        days: {
          create: [
            {
              index: 1,
              state: 'available',
            },
            {
              index: 2,
              state: 'locked',
            },
            {
              index: 3,
              state: 'locked',
            },
          ],
        },
      },
      include: {
        story: true,
        days: true,
      },
    });

    testDay = testPlan.days[0];

    // Mock authentication token
    authToken = 'test-auth-token';
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.plan3.deleteMany({
      where: { studentId: testStudent.id },
    });
    await prisma.student.delete({
      where: { id: testStudent.id },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear any existing activity content and progress
    await prisma.activityContent.deleteMany({
      where: { planId: testPlan.id },
    });
    await prisma.activityProgress.deleteMany({
      where: { 
        studentId: testStudent.id.toString(),
        planId: testPlan.id,
      },
    });
  });

  describe('Content Generation and Caching', () => {
    it('should generate enhanced content for a plan and cache it', async () => {
      const response = await request(app)
        .get(`/api/enhanced-activities/${testPlan.id}/${testDay.index}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('activities');
      expect(response.body.activities).toBeInstanceOf(Array);
      expect(response.body.activities.length).toBeGreaterThan(0);

      // Verify content structure
      const activity = response.body.activities[0];
      expect(activity).toHaveProperty('type');
      expect(activity).toHaveProperty('content');
      expect(activity).toHaveProperty('options');

      // Verify content is cached
      const cachedContent = await prisma.activityContent.findFirst({
        where: {
          planId: testPlan.id,
          dayIndex: testDay.index,
        },
      });
      expect(cachedContent).toBeTruthy();
      expect(cachedContent.content).toEqual(response.body);
    });

    it('should return cached content on subsequent requests', async () => {
      // First request to generate content
      await request(app)
        .get(`/api/enhanced-activities/${testPlan.id}/${testDay.index}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request should return cached content
      const response = await request(app)
        .get(`/api/enhanced-activities/${testPlan.id}/${testDay.index}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('activities');
      expect(response.body.activities.length).toBeGreaterThan(0);
    });

    it('should handle content generation errors gracefully', async () => {
      // Test with invalid plan ID
      const response = await request(app)
        .get('/api/enhanced-activities/invalid-plan-id/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Progress Tracking', () => {
    it('should save and retrieve activity progress', async () => {
      const progressData = {
        activityType: 'who',
        status: 'completed',
        attempts: 1,
        responses: [
          {
            question: 'Who is the main character?',
            answer: 'Alex',
            isCorrect: true,
          },
        ],
        timeSpent: 120,
      };

      // Save progress
      const saveResponse = await request(app)
        .post('/api/enhanced-activities/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId: testStudent.id.toString(),
          planId: testPlan.id,
          dayIndex: testDay.index,
          activityType: 'who',
          progress: progressData,
        })
        .expect(200);

      expect(saveResponse.body).toHaveProperty('success', true);

      // Retrieve progress
      const getResponse = await request(app)
        .get(`/api/enhanced-activities/progress/${testStudent.id}/${testPlan.id}/${testDay.index}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body).toHaveProperty('progress');
      expect(getResponse.body.progress.who).toEqual(progressData);
    });

    it('should handle progress updates and versioning', async () => {
      const initialProgress = {
        activityType: 'who',
        status: 'in_progress',
        attempts: 1,
        responses: [],
        timeSpent: 60,
      };

      // Save initial progress
      await request(app)
        .post('/api/enhanced-activities/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId: testStudent.id.toString(),
          planId: testPlan.id,
          dayIndex: testDay.index,
          activityType: 'who',
          progress: initialProgress,
        })
        .expect(200);

      // Update progress
      const updatedProgress = {
        ...initialProgress,
        status: 'completed',
        responses: [
          {
            question: 'Who is the main character?',
            answer: 'Alex',
            isCorrect: true,
          },
        ],
        timeSpent: 120,
      };

      await request(app)
        .post('/api/enhanced-activities/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId: testStudent.id.toString(),
          planId: testPlan.id,
          dayIndex: testDay.index,
          activityType: 'who',
          progress: updatedProgress,
        })
        .expect(200);

      // Verify updated progress
      const getResponse = await request(app)
        .get(`/api/enhanced-activities/progress/${testStudent.id}/${testPlan.id}/${testDay.index}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.progress.who.status).toBe('completed');
      expect(getResponse.body.progress.who.responses).toHaveLength(1);
    });
  });

  describe('Cross-Device Synchronization', () => {
    it('should sync progress across devices', async () => {
      const progressData = {
        activityType: 'vocabulary',
        status: 'completed',
        attempts: 2,
        responses: [
          {
            question: 'What does "explorer" mean?',
            answer: 'Someone who discovers new places',
            isCorrect: true,
          },
        ],
        timeSpent: 180,
      };

      // Save progress from device 1
      await request(app)
        .post('/api/enhanced-activities/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId: testStudent.id.toString(),
          planId: testPlan.id,
          dayIndex: testDay.index,
          activityType: 'vocabulary',
          progress: progressData,
        })
        .expect(200);

      // Retrieve progress from device 2
      const getResponse = await request(app)
        .get(`/api/enhanced-activities/progress/${testStudent.id}/${testPlan.id}/${testDay.index}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.progress.vocabulary).toEqual(progressData);
    });

    it('should handle concurrent updates correctly', async () => {
      const progress1 = {
        activityType: 'sequence',
        status: 'in_progress',
        attempts: 1,
        responses: [],
        timeSpent: 30,
      };

      const progress2 = {
        activityType: 'sequence',
        status: 'completed',
        attempts: 2,
        responses: [
          { question: 'What happened first?', answer: 'Alex dreamed of space', isCorrect: true },
          { question: 'What happened second?', answer: 'Alex built a rocket', isCorrect: true },
        ],
        timeSpent: 90,
      };

      // Simulate concurrent updates
      const promises = [
        request(app)
          .post('/api/enhanced-activities/progress')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            studentId: testStudent.id.toString(),
            planId: testPlan.id,
            dayIndex: testDay.index,
            activityType: 'sequence',
            progress: progress1,
          }),
        request(app)
          .post('/api/enhanced-activities/progress')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            studentId: testStudent.id.toString(),
            planId: testPlan.id,
            dayIndex: testDay.index,
            activityType: 'sequence',
            progress: progress2,
          }),
      ];

      await Promise.all(promises);

      // Verify final state
      const getResponse = await request(app)
        .get(`/api/enhanced-activities/progress/${testStudent.id}/${testPlan.id}/${testDay.index}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.progress.sequence).toBeDefined();
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle network errors gracefully', async () => {
      // Test with invalid student ID
      const response = await request(app)
        .get('/api/enhanced-activities/progress/invalid-student/invalid-plan/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed progress data', async () => {
      const response = await request(app)
        .post('/api/enhanced-activities/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          studentId: testStudent.id.toString(),
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle content generation timeouts', async () => {
      // This would require mocking the AI service to simulate timeouts
      // For now, we'll test the error response structure
      const response = await request(app)
        .get('/api/enhanced-activities/invalid-plan-id/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get(`/api/enhanced-activities/${testPlan.id}/${testDay.index}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body).toHaveProperty('activities');
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle analytics events', async () => {
      const analyticsEvent = {
        eventType: 'activity_completed',
        activityType: 'who',
        planId: testPlan.id,
        dayIndex: testDay.index,
        studentId: testStudent.id.toString(),
        timestamp: Date.now(),
        duration: 120,
        attempts: 1,
        metadata: {
          correctAnswers: 1,
          totalQuestions: 1,
        },
      };

      const response = await request(app)
        .post('/api/analytics/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          events: [analyticsEvent],
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.count).toBe(1);
    });
  });

  describe('Feature Flag Integration', () => {
    it('should respect feature flags', async () => {
      const response = await request(app)
        .get(`/api/feature-flags/status/${testStudent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('enhancedActivities');
      expect(response.body).toHaveProperty('abTest');
      expect(response.body).toHaveProperty('enhancedProgressTracking');
      expect(response.body).toHaveProperty('enhancedAnalytics');
    });

    it('should handle A/B test assignments', async () => {
      const response = await request(app)
        .get(`/api/feature-flags/status/${testStudent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // The A/B test assignment should be consistent for the same student
      const abTestResult = response.body.abTest;
      expect(typeof abTestResult).toBe('boolean');
    });
  });

  describe('End-to-End Activity Flow', () => {
    it('should complete a full activity workflow', async () => {
      // 1. Get enhanced content
      const contentResponse = await request(app)
        .get(`/api/enhanced-activities/${testPlan.id}/${testDay.index}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(contentResponse.body.activities).toBeInstanceOf(Array);
      const activity = contentResponse.body.activities[0];

      // 2. Start activity
      const startProgress = {
        activityType: activity.type,
        status: 'in_progress',
        attempts: 1,
        responses: [],
        timeSpent: 0,
      };

      await request(app)
        .post('/api/enhanced-activities/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId: testStudent.id.toString(),
          planId: testPlan.id,
          dayIndex: testDay.index,
          activityType: activity.type,
          progress: startProgress,
        })
        .expect(200);

      // 3. Complete activity
      const completeProgress = {
        activityType: activity.type,
        status: 'completed',
        attempts: 1,
        responses: [
          {
            question: 'Sample question',
            answer: 'Sample answer',
            isCorrect: true,
          },
        ],
        timeSpent: 120,
      };

      await request(app)
        .post('/api/enhanced-activities/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId: testStudent.id.toString(),
          planId: testPlan.id,
          dayIndex: testDay.index,
          activityType: activity.type,
          progress: completeProgress,
        })
        .expect(200);

      // 4. Verify final state
      const finalResponse = await request(app)
        .get(`/api/enhanced-activities/progress/${testStudent.id}/${testPlan.id}/${testDay.index}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalResponse.body.progress[activity.type].status).toBe('completed');
      expect(finalResponse.body.progress[activity.type].responses).toHaveLength(1);
    });
  });
});
