import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { generateAssessment } from '../lib/openai.js';
import { modelOverrideMiddleware, getModelConfigWithOverride } from '../middleware/modelOverride.js';
import { scoreV1, scoreV2 } from '../lib/scoring.js';
import { logScoringMetrics } from '../lib/logging.js';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/assessments
router.post('/', authenticate, modelOverrideMiddleware(), async (req, res) => {
  const { studentId } = req.body;
  const parentId = req.user.id;

  if (!studentId) {
    return res.status(400).json({ message: 'Student ID is required' });
  }

  try {
    // Verify the student belongs to the authenticated parent
    console.log('Creating assessment for:', { studentId, parentId });
    
    const student = await prisma.student.findFirst({
      where: { id: studentId, parentId }
    });

    console.log('Found student:', student);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check for existing abandoned assessment
    const existingAssessment = await prisma.assessment.findFirst({
      where: {
        studentId,
        status: { in: ['not_started', 'in_progress'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingAssessment) {
      // Return existing assessment for resumption
      return res.status(200).json({
        assessment: existingAssessment,
        resumed: true
      });
    }

    // Generate assessment content from OpenAI (passage + questions)
    const modelOverride = req.modelOverride ? req.applyModelOverride('assessment_creation', getModelConfigWithOverride(req, 'assessment_creation')) : null;
    const assessmentContent = await generateAssessment(student, modelOverride);

    // Create assessment immediately with passage only; questions will be saved in background
    const assessment = await prisma.assessment.create({
      data: {
        studentId,
        status: 'in_progress',
        passage: assessmentContent.passage,
        questions: null,
      }
    });

    // Fire-and-forget: persist questions after response so reading can start sooner
    setImmediate(async () => {
      try {
        await prisma.assessment.update({
          where: { id: assessment.id },
          data: { questions: assessmentContent.questions }
        });
        console.log(`💾 Questions generated and saved for assessment ${assessment.id}`);
      } catch (e) {
        console.error('Failed to save assessment questions in background:', e);
      }
    });

    // Respond with passage now; frontend will poll for questions
    res.status(201).json({
      assessment: { ...assessment, questions: null },
      resumed: false
    });
  } catch (error) {
    console.error('Assessment creation error:', error);
    res.status(500).json({ message: error.message || 'An error occurred while creating the assessment' });
  }
});

// PUT /api/assessments/:id/status
router.put('/:id/status', authenticate, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const parentId = req.user.id;

  if (!status || !['not_started', 'in_progress', 'completed', 'abandoned'].includes(status)) {
    return res.status(400).json({ message: 'Valid status is required' });
  }

  try {
    // Verify the assessment belongs to the authenticated parent's student
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: parseInt(id),
        student: {
          parentId
        }
      },
      include: {
        student: true
      }
    });

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Update assessment status
    const updatedAssessment = await prisma.assessment.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    res.json(updatedAssessment);
  } catch (error) {
    console.error('Assessment status update error:', error);
    res.status(500).json({ message: 'An error occurred while updating the assessment' });
  }
});

// GET /api/assessments
router.get('/', authenticate, async (req, res) => {
  const parentId = req.user.id;

  try {
    // Get all students for this parent with their assessments
    const students = await prisma.student.findMany({
      where: { parentId },
      include: {
        assessments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    res.json(students);
  } catch (error) {
    console.error('Assessment fetch error:', error);
    res.status(500).json({ message: 'An error occurred while fetching assessments' });
  }
});

// GET /api/assessments/:id
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const parentId = req.user.id;

  try {
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: parseInt(id),
        student: {
          parentId,
        },
      },
      select: {
        id: true,
        status: true,
        passage: true,
        questions: true,
        studentAnswers: true,
        readingTime: true,
        errorCount: true,
        wpm: true,
        accuracy: true,
        compositeScore: true,
        fluencyScore: true,
        compVocabScore: true,
        readingLevelLabel: true,
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    res.json(assessment);
  } catch (error) {
    console.error('Assessment fetch error:', error);
    res.status(500).json({ message: 'An error occurred while fetching the assessment' });
  }
});

// PUT /api/assessments/:id/reading
// Persist interim reading metrics so they survive refresh and can be resumed later
router.put('/:id/reading', authenticate, async (req, res) => {
  const { id } = req.params;
  const { readingTime, errorCount } = req.body;
  const parentId = req.user.id;

  if (typeof readingTime !== 'number' || readingTime < 0) {
    return res.status(400).json({ message: 'Valid readingTime (seconds) is required' });
  }

  try {
    // Verify ownership
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: parseInt(id),
        student: { parentId },
      },
    });

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    const updated = await prisma.assessment.update({
      where: { id: parseInt(id) },
      data: {
        readingTime,
        errorCount: typeof errorCount === 'number' ? errorCount : assessment.errorCount,
      },
      select: { id: true, readingTime: true, errorCount: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Assessment reading update error:', error);
    res.status(500).json({ message: 'An error occurred while saving reading progress' });
  }
});

// PUT /api/assessments/:id/submit
router.put('/:id/submit', authenticate, async (req, res) => {
  const { id } = req.params;
  const { readingTime, errorCount, answers } = req.body;
  const parentId = req.user.id;

  try {
    // First, verify the assessment exists and belongs to the parent
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: parseInt(id),
        student: { parentId },
      },
      include: {
        student: true, // Include student data for grade level
      },
    });

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Validate grade level (only supports grades 1-12)
    if (assessment.student.gradeLevel < 1 || assessment.student.gradeLevel > 12) {
      return res.status(400).json({ 
        message: 'Grade level not supported', 
        error: 'INVALID_GRADE_LEVEL',
        details: 'Only grades 1-12 are supported for scoring'
      });
    }

    // Get benchmark WPM for student's grade level
    const benchmark = await prisma.benchmark.findUnique({
      where: { grade: assessment.student.gradeLevel }
    });

    if (!benchmark) {
      return res.status(500).json({ 
        message: 'Benchmark data not found for grade level',
        error: 'MISSING_BENCHMARK'
      });
    }

    // Calculate base metrics and validate
    const wordCount = assessment.passage.split(/\s+/).length;
    const minutes = readingTime / 60;
    if (minutes < 0.5 || wordCount < 50) {
      return res.status(400).json({ 
        message: 'Reading attempt too short to score accurately',
        error: 'INVALID_ATTEMPT',
        details: 'Please try again with a longer reading session'
      });
    }

    // Use scoring module with feature flag and tunables
    const useV2 = process.env.SCORE_V2_ENABLED === 'true';
    const tunables = {
      fluencyCap: Number(process.env.FLUENCY_CAP) || 150,
      accuracyHardFloor: process.env.ACCURACY_HARD_FLOOR ? Number(process.env.ACCURACY_HARD_FLOOR) : null,
    };

    const scorer = useV2 ? scoreV2 : scoreV1;
    const {
      wpm,
      accuracy: accuracyPercent,
      fluencyScore,
      compVocabScore,
      compositeScore,
      readingLevelLabel
    } = scorer({
      wordCount,
      readingTime,
      errorCount,
      questions: assessment.questions,
      answers,
      benchmarkWpm: benchmark.wpm,
      tunables,
    });

    // Observability: log scoring metrics
    const capEngaged = ((wpm / benchmark.wpm) * 100) > (tunables.fluencyCap || 150);
    const floors = useV2 ? {
      fAt: fluencyScore >= 85,
      cAt: compVocabScore >= 75,
      fAbove: fluencyScore >= 100,
      cAbove: compVocabScore >= 85,
    } : undefined;
    logScoringMetrics({
      useV2,
      wpm,
      accuracy: accuracyPercent,
      fluencyScore,
      compVocabScore,
      compositeScore,
      label: readingLevelLabel,
      floors,
      capEngaged,
      accuracyHardFloorApplied: false, // v2 may downgrade; if needed, extend scoreV2 to return flag
    });

    const updatedAssessment = await prisma.assessment.update({
      where: { id: parseInt(id) },
      data: {
        status: 'completed',
        readingTime,
        errorCount,
        studentAnswers: answers,
        wpm,
        accuracy: accuracyPercent,
        compositeScore,
        fluencyScore,
        compVocabScore,
        readingLevelLabel,
      },
    });

    res.json(updatedAssessment);
  } catch (error) {
    console.error('Assessment submission error:', error);
    res.status(500).json({ message: 'An error occurred while submitting the assessment' });
  }
});

export default router;
