import request from 'supertest';
import express from 'express';
import assessmentsRouter from '../routes/assessments.js';
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
  app.use('/api/assessments', assessmentsRouter);
  return app;
}

// Seed minimal data in-memory sqlite via Prisma test db is assumed available
const prisma = new PrismaClient();

describe('Scoring v2 integration (flag on/off)', () => {
  let app;
  let student;
  let assessment;
  let benchmark;
  let parentId;

  beforeAll(async () => {
    app = createApp();
    // Create parent and student
    const parent = await prisma.parent.create({ data: { name: 'Test Parent', email: 'parent@test.com', passwordHash: 'x' } });
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
    await prisma.benchmark.upsert({ where: { grade: 5 }, update: { wpm: 150 }, create: { grade: 5, wpm: 150 } });
    benchmark = await prisma.benchmark.findUnique({ where: { grade: 5 } });
    // Create an assessment with passage and questions
    assessment = await prisma.assessment.create({
      data: {
        studentId: student.id,
        status: 'in_progress',
        passage: 'word '.repeat(300).trim(),
        questions: [
          { type: 'comprehension', correctAnswer: 'A' },
          { type: 'comprehension', correctAnswer: 'A' },
          { type: 'comprehension', correctAnswer: 'A' },
          { type: 'comprehension', correctAnswer: 'A' },
          { type: 'vocabulary', correctAnswer: 'A' },
          { type: 'vocabulary', correctAnswer: 'A' },
          { type: 'vocabulary', correctAnswer: 'A' },
          { type: 'vocabulary', correctAnswer: 'A' },
        ],
      }
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.dailyActivity.deleteMany({});
    await prisma.chapter.deleteMany({});
    await prisma.assessment.deleteMany({});
    await prisma.weeklyPlan.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.parent.deleteMany({});
    await prisma.$disconnect();
  });

  test('v1 vs v2 label differences are possible while schema remains stable', async () => {
    const answers = { 0: 'A', 1: 'A', 2: 'A', 3: 'A', 4: 'A', 5: 'A' }; // 6/8 ~ 75%
    const body = { readingTime: 120, errorCount: 6, answers };
    const token = generateToken({ id: parentId, name: 'Test Parent', email: 'parent@test.com' });

    // Flag off (v1)
    process.env.SCORE_V2_ENABLED = 'false';
    let res = await request(app).put(`/api/assessments/${assessment.id}/submit`).set('Authorization', `Bearer ${token}`).send(body);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('wpm');
    expect(res.body).toHaveProperty('accuracy');
    expect(res.body).toHaveProperty('fluencyScore');
    expect(res.body).toHaveProperty('compVocabScore');
    expect(res.body).toHaveProperty('compositeScore');
    expect(res.body).toHaveProperty('readingLevelLabel');

    const v1Label = res.body.readingLevelLabel;

    // Flag on (v2)
    process.env.SCORE_V2_ENABLED = 'true';
    res = await request(app).put(`/api/assessments/${assessment.id}/submit`).set('Authorization', `Bearer ${token}`).send(body);
    expect(res.status).toBe(200);
    const v2Label = res.body.readingLevelLabel;

    expect(['At Grade Level', 'Slightly Below Grade Level', 'Below Grade Level', 'Above Grade Level']).toContain(v1Label);
    expect(['At Grade Level', 'Slightly Below Grade Level', 'Below Grade Level', 'Above Grade Level']).toContain(v2Label);
  });
});

