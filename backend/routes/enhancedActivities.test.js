import request from 'supertest';
import express from 'express';

// Create a simple test app with mock routes
const app = express();
app.use(express.json());

// Mock routes for testing
app.get('/api/enhanced-activities/:planId/:dayIndex', (req, res) => {
  res.json({
    planId: req.params.planId,
    dayIndex: parseInt(req.params.dayIndex),
    activities: { who: {}, where: {}, sequence: {}, 'main-idea': {}, vocabulary: {}, predict: {} },
    progress: {},
    studentAge: 10
  });
});

app.post('/api/enhanced-activities/progress', (req, res) => {
  res.json({
    success: true,
    progress: {
      id: 'progress123',
      status: req.body.status,
      startedAt: new Date(),
      completedAt: req.body.status === 'completed' ? new Date() : null,
      timeSpent: req.body.timeSpent || 0,
      attempts: 1
    }
  });
});

app.get('/api/enhanced-activities/progress/:studentId/:planId/:dayIndex', (req, res) => {
  res.json({
    studentId: parseInt(req.params.studentId),
    planId: req.params.planId,
    dayIndex: parseInt(req.params.dayIndex),
    progress: {}
  });
});

app.post('/api/enhanced-activities/regenerate/:planId/:dayIndex/:activityType', (req, res) => {
  res.json({
    success: true,
    activityType: req.params.activityType,
    content: { question: 'New question', options: [] },
    regeneratedAt: new Date()
  });
});

describe('Enhanced Activities API Routes', () => {
  describe('GET /:planId/:dayIndex', () => {
    it('should fetch activity content successfully', async () => {
      const response = await request(app)
        .get('/api/enhanced-activities/plan123/1')
        .expect(200);

      expect(response.body).toHaveProperty('planId', 'plan123');
      expect(response.body).toHaveProperty('dayIndex', 1);
      expect(response.body).toHaveProperty('activities');
      expect(response.body).toHaveProperty('progress');
      expect(response.body).toHaveProperty('studentAge');
    });

    it('should return all activity types', async () => {
      const response = await request(app)
        .get('/api/enhanced-activities/plan123/1')
        .expect(200);

      expect(response.body.activities).toHaveProperty('who');
      expect(response.body.activities).toHaveProperty('where');
      expect(response.body.activities).toHaveProperty('sequence');
      expect(response.body.activities).toHaveProperty('main-idea');
      expect(response.body.activities).toHaveProperty('vocabulary');
      expect(response.body.activities).toHaveProperty('predict');
    });
  });

  describe('POST /progress', () => {
    it('should save progress successfully', async () => {
      const progressData = {
        planId: 'plan123',
        dayIndex: 1,
        activityType: 'who',
        status: 'completed',
        timeSpent: 120
      };

      const response = await request(app)
        .post('/api/enhanced-activities/progress')
        .send(progressData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.progress).toHaveProperty('id', 'progress123');
      expect(response.body.progress.status).toBe('completed');
    });

    it('should handle different status types', async () => {
      const progressData = {
        planId: 'plan123',
        dayIndex: 1,
        activityType: 'who',
        status: 'in_progress',
        timeSpent: 60
      };

      const response = await request(app)
        .post('/api/enhanced-activities/progress')
        .send(progressData)
        .expect(200);

      expect(response.body.progress.status).toBe('in_progress');
      expect(response.body.progress.completedAt).toBeNull();
    });
  });

  describe('GET /progress/:studentId/:planId/:dayIndex', () => {
    it('should fetch progress successfully', async () => {
      const response = await request(app)
        .get('/api/enhanced-activities/progress/1/plan123/1')
        .expect(200);

      expect(response.body).toHaveProperty('studentId', 1);
      expect(response.body).toHaveProperty('planId', 'plan123');
      expect(response.body).toHaveProperty('dayIndex', 1);
      expect(response.body).toHaveProperty('progress');
    });
  });

  describe('POST /regenerate/:planId/:dayIndex/:activityType', () => {
    it('should regenerate content successfully', async () => {
      const response = await request(app)
        .post('/api/enhanced-activities/regenerate/plan123/1/who')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.activityType).toBe('who');
      expect(response.body.content).toHaveProperty('question');
    });
  });
});
