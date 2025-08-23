import request from 'supertest';
import express from 'express';
import plansRouter from '../routes/plans.js';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../lib/jwt.js';

// Setup minimal app with auth bypass via stubbing middleware
function createApp() {
  const app = express();
  app.use(express.json());
  // Inject a fake authenticate middleware
  app.use((req, res, next) => {
    req.user = { id: 1, name: 'Test Parent' };
    next();
  });
  app.use('/api/plans', plansRouter);
  return app;
}

// Seed minimal data in-memory sqlite via Prisma test db is assumed available
const prisma = new PrismaClient();

describe('5-Day Plan API Integration Tests', () => {
  let app;
  let student;
  let parentId;
  let plan;

  beforeAll(async () => {
    app = createApp();
    // Create parent and student
    const parent = await prisma.parent.create({ 
      data: { 
        name: 'Test Parent', 
        email: 'parent@test.com', 
        passwordHash: 'x' 
      } 
    });
    parentId = parent.id;
    student = await prisma.student.create({
      data: {
        parentId: parent.id,
        name: 'Test Student',
        birthday: new Date('2014-01-01'),
        gradeLevel: 5,
        interests: 'space,science',
      }
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.activity.deleteMany({});
    await prisma.day.deleteMany({});
    await prisma.story.deleteMany({});
    await prisma.plan.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.parent.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up plans before each test
    await prisma.activity.deleteMany({});
    await prisma.day.deleteMany({});
    await prisma.story.deleteMany({});
    await prisma.plan.deleteMany({});
  });

  describe('Plan Creation', () => {
    test('should create a new 5-day plan with story and activities', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      const createPlanData = {
        studentId: student.id,
        theme: 'Space Adventure',
        gradeLevel: 5
      };

      const response = await request(app)
        .post('/api/plans')
        .set('Authorization', `Bearer ${token}`)
        .send(createPlanData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('plan');
      expect(response.body.plan).toHaveProperty('id');
      expect(response.body.plan).toHaveProperty('theme', 'Space Adventure');
      expect(response.body.plan).toHaveProperty('studentId', student.id);
      expect(response.body.plan).toHaveProperty('status', 'active');
      expect(response.body.plan).toHaveProperty('days');
      expect(response.body.plan.days).toHaveLength(5);

      // Verify story was created
      expect(response.body.plan).toHaveProperty('story');
      expect(response.body.plan.story).toHaveProperty('title');
      expect(response.body.plan.story).toHaveProperty('themes');
      expect(response.body.plan.story).toHaveProperty('part1');
      expect(response.body.plan.story).toHaveProperty('part2');
      expect(response.body.plan.story).toHaveProperty('part3');
      expect(response.body.plan.story).toHaveProperty('vocabulary');
      expect(response.body.plan.story.vocabulary).toHaveLength(6);

      // Verify days were created with correct structure
      response.body.plan.days.forEach((day, index) => {
        expect(day).toHaveProperty('dayIndex', index + 1);
        expect(day).toHaveProperty('state');
        expect(day).toHaveProperty('activities');
        
        // Day 1 should be available, others locked
        if (index === 0) {
          expect(day.state).toBe('available');
        } else {
          expect(day.state).toBe('locked');
        }

        // Each day should have activities
        expect(day.activities).toHaveLength(1);
        expect(day.activities[0]).toHaveProperty('type');
        expect(day.activities[0]).toHaveProperty('data');
      });

      plan = response.body.plan;
    });

    test('should handle plan creation with invalid student ID', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      const createPlanData = {
        studentId: 99999, // Non-existent student
        theme: 'Space Adventure',
        gradeLevel: 5
      };

      const response = await request(app)
        .post('/api/plans')
        .set('Authorization', `Bearer ${token}`)
        .send(createPlanData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Student not found');
    });

    test('should handle plan creation with missing required fields', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      const createPlanData = {
        // Missing studentId
        theme: 'Space Adventure',
        gradeLevel: 5
      };

      const response = await request(app)
        .post('/api/plans')
        .set('Authorization', `Bearer ${token}`)
        .send(createPlanData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Plan Retrieval', () => {
    beforeEach(async () => {
      // Create a test plan
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      const createPlanData = {
        studentId: student.id,
        theme: 'Space Adventure',
        gradeLevel: 5
      };

      const response = await request(app)
        .post('/api/plans')
        .set('Authorization', `Bearer ${token}`)
        .send(createPlanData);

      plan = response.body.plan;
    });

    test('should retrieve a plan by ID with all related data', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      const response = await request(app)
        .get(`/api/plans/${plan.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('plan');
      expect(response.body.plan.id).toBe(plan.id);
      expect(response.body.plan).toHaveProperty('story');
      expect(response.body.plan).toHaveProperty('days');
      expect(response.body.plan.days).toHaveLength(5);
      expect(response.body.plan).toHaveProperty('student');
    });

    test('should handle retrieving non-existent plan', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      const response = await request(app)
        .get('/api/plans/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Plan not found');
    });
  });

  describe('Day Completion', () => {
    beforeEach(async () => {
      // Create a test plan
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      const createPlanData = {
        studentId: student.id,
        theme: 'Space Adventure',
        gradeLevel: 5
      };

      const response = await request(app)
        .post('/api/plans')
        .set('Authorization', `Bearer ${token}`)
        .send(createPlanData);

      plan = response.body.plan;
    });

    test('should complete day 1 and unlock day 2', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      const day1 = plan.days.find(d => d.dayIndex === 1);
      const activities = day1.activities.map(activity => ({
        id: activity.id,
        response: {
          completed: true,
          pairs: [
            { word: 'test', definition: 'test definition', isMatched: true }
          ]
        }
      }));

      const response = await request(app)
        .put(`/api/plans/${plan.id}/days/1`)
        .set('Authorization', `Bearer ${token}`)
        .send({ activities });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('dayComplete', true);
      expect(response.body).toHaveProperty('plan');
      expect(response.body.plan).toHaveProperty('days');

      // Verify day 1 is complete
      const updatedDay1 = response.body.plan.days.find(d => d.dayIndex === 1);
      expect(updatedDay1.state).toBe('complete');

      // Verify day 2 is now available
      const updatedDay2 = response.body.plan.days.find(d => d.dayIndex === 2);
      expect(updatedDay2.state).toBe('available');
    });

    test('should handle completing day with invalid activities', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      const activities = [
        {
          id: 99999, // Non-existent activity
          response: { completed: true }
        }
      ];

      const response = await request(app)
        .put(`/api/plans/${plan.id}/days/1`)
        .set('Authorization', `Bearer ${token}`)
        .send({ activities });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    test('should handle completing locked day', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      const day2 = plan.days.find(d => d.dayIndex === 2);
      const activities = day2.activities.map(activity => ({
        id: activity.id,
        response: { completed: true }
      }));

      const response = await request(app)
        .put(`/api/plans/${plan.id}/days/2`)
        .set('Authorization', `Bearer ${token}`)
        .send({ activities });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Day is locked');
    });

    test('should handle completing already completed day', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      // First, complete day 1
      const day1 = plan.days.find(d => d.dayIndex === 1);
      const activities = day1.activities.map(activity => ({
        id: activity.id,
        response: { completed: true }
      }));

      await request(app)
        .put(`/api/plans/${plan.id}/days/1`)
        .set('Authorization', `Bearer ${token}`)
        .send({ activities });

      // Try to complete day 1 again
      const response = await request(app)
        .put(`/api/plans/${plan.id}/days/1`)
        .set('Authorization', `Bearer ${token}`)
        .send({ activities });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Day is already complete');
    });
  });

  describe('Plan Completion', () => {
    beforeEach(async () => {
      // Create a test plan
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      const createPlanData = {
        studentId: student.id,
        theme: 'Space Adventure',
        gradeLevel: 5
      };

      const response = await request(app)
        .post('/api/plans')
        .set('Authorization', `Bearer ${token}`)
        .send(createPlanData);

      plan = response.body.plan;
    });

    test('should complete all days and mark plan as completed', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      // Complete all 5 days
      for (let dayIndex = 1; dayIndex <= 5; dayIndex++) {
        const day = plan.days.find(d => d.dayIndex === dayIndex);
        const activities = day.activities.map(activity => ({
          id: activity.id,
          response: { completed: true }
        }));

        await request(app)
          .put(`/api/plans/${plan.id}/days/${dayIndex}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ activities });
      }

      // Complete the plan
      const response = await request(app)
        .post(`/api/plans/${plan.id}/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('planComplete', true);
      expect(response.body).toHaveProperty('plan');
      expect(response.body.plan.status).toBe('completed');
    });

    test('should handle completing plan with incomplete days', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      const response = await request(app)
        .post(`/api/plans/${plan.id}/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('All days must be completed');
    });

    test('should handle completing already completed plan', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      // First, complete all days and the plan
      for (let dayIndex = 1; dayIndex <= 5; dayIndex++) {
        const day = plan.days.find(d => d.dayIndex === dayIndex);
        const activities = day.activities.map(activity => ({
          id: activity.id,
          response: { completed: true }
        }));

        await request(app)
          .put(`/api/plans/${plan.id}/days/${dayIndex}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ activities });
      }

      await request(app)
        .post(`/api/plans/${plan.id}/complete`)
        .set('Authorization', `Bearer ${token}`);

      // Try to complete the plan again
      const response = await request(app)
        .post(`/api/plans/${plan.id}/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Plan is already completed');
    });
  });

  describe('Plan Regeneration', () => {
    test('should regenerate plan after completion', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      // Create and complete a plan
      const createPlanData = {
        studentId: student.id,
        theme: 'Space Adventure',
        gradeLevel: 5
      };

      const createResponse = await request(app)
        .post('/api/plans')
        .set('Authorization', `Bearer ${token}`)
        .send(createPlanData);

      const originalPlan = createResponse.body.plan;

      // Complete all days
      for (let dayIndex = 1; dayIndex <= 5; dayIndex++) {
        const day = originalPlan.days.find(d => d.dayIndex === dayIndex);
        const activities = day.activities.map(activity => ({
          id: activity.id,
          response: { completed: true }
        }));

        await request(app)
          .put(`/api/plans/${originalPlan.id}/days/${dayIndex}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ activities });
      }

      // Complete the plan
      await request(app)
        .post(`/api/plans/${originalPlan.id}/complete`)
        .set('Authorization', `Bearer ${token}`);

      // Verify a new plan was created
      const newPlans = await prisma.plan.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
        take: 2
      });

      expect(newPlans).toHaveLength(2);
      expect(newPlans[0].id).not.toBe(originalPlan.id);
      expect(newPlans[0].status).toBe('active');
      expect(newPlans[1].status).toBe('completed');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid plan ID in day completion', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      const response = await request(app)
        .put('/api/plans/99999/days/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ activities: [] });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Plan not found');
    });

    test('should handle invalid day index', async () => {
      const token = generateToken({ 
        id: parentId, 
        name: 'Test Parent', 
        email: 'parent@test.com' 
      });

      // Create a plan first
      const createPlanData = {
        studentId: student.id,
        theme: 'Space Adventure',
        gradeLevel: 5
      };

      const createResponse = await request(app)
        .post('/api/plans')
        .set('Authorization', `Bearer ${token}`)
        .send(createPlanData);

      const plan = createResponse.body.plan;

      const response = await request(app)
        .put(`/api/plans/${plan.id}/days/6`) // Invalid day index
        .set('Authorization', `Bearer ${token}`)
        .send({ activities: [] });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid day index');
    });

    test('should handle missing authorization token', async () => {
      const response = await request(app)
        .post('/api/plans')
        .send({
          studentId: student.id,
          theme: 'Space Adventure',
          gradeLevel: 5
        });

      expect(response.status).toBe(401);
    });
  });
});
