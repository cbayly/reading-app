import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { generateAssessment } from '../lib/openai.js';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/assessments
router.post('/', authenticate, async (req, res) => {
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

    // Generate new assessment content from OpenAI
    const assessmentContent = await generateAssessment(student);

    // Create new assessment in the database
    const assessment = await prisma.assessment.create({
      data: {
        studentId,
        status: 'in_progress',
        passage: assessmentContent.passage,
        questions: assessmentContent.questions,
      }
    });

    res.status(201).json({
      assessment,
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
        student: {
          select: {
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

    // Calculate words per minute (WPM)
    const wordCount = assessment.passage.split(/\s+/).length;
    const minutes = readingTime / 60;
    const wpm = minutes > 0 ? Math.round(wordCount / minutes) : 0;

    // Calculate reading accuracy as a percentage
    const accuracy = wordCount > 0 ? Math.round(((wordCount - errorCount) / wordCount) * 100) : 0;

    // Calculate comprehension score as a raw value (e.g., 0.75 for 75%)
    const questions = assessment.questions;
    let correctAnswers = 0;
    Object.entries(answers).forEach(([index, answer]) => {
      if (questions[parseInt(index)].correctAnswer === answer) {
        correctAnswers++;
      }
    });
    const comprehension = questions.length > 0 ? correctAnswers / questions.length : 0;

    // Calculate composite score with weighted metrics
    const compositeScore = Math.round(
      (wpm / 150) * 40 + // 40% weighting for WPM (normalized to 150 WPM)
      (accuracy / 100) * 30 + // 30% weighting for accuracy
      comprehension * 30 // 30% weighting for comprehension
    );

    const updatedAssessment = await prisma.assessment.update({
      where: { id: parseInt(id) },
      data: {
        status: 'completed',
        readingTime,
        errorCount,
        studentAnswers: answers,
        wpm,
        accuracy,
        compositeScore,
      },
    });

    res.json(updatedAssessment);
  } catch (error) {
    console.error('Assessment submission error:', error);
    res.status(500).json({ message: 'An error occurred while submitting the assessment' });
  }
});

export default router;
