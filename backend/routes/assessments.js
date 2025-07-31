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

    // Calculate base metrics
    const wordCount = assessment.passage.split(/\s+/).length;
    const minutes = readingTime / 60;
    
    // Check for invalid attempt
    if (minutes < 0.5 || wordCount < 50) {
      return res.status(400).json({ 
        message: 'Reading attempt too short to score accurately',
        error: 'INVALID_ATTEMPT',
        details: 'Please try again with a longer reading session'
      });
    }

    const wpm = wordCount / minutes;
    const accuracyPercent = ((wordCount - errorCount) / wordCount) * 100;

    // Calculate fluency score
    const fluencyNormalized = (wpm / benchmark.wpm) * 100;
    const cappedFluencyNormalized = Math.min(fluencyNormalized, 150);
    const fluencyScore = cappedFluencyNormalized * (accuracyPercent / 100);

    // Calculate comprehension and vocabulary scores
    const questions = assessment.questions;
    let comprehensionCorrect = 0;
    let vocabularyCorrect = 0;
    let comprehensionTotal = 0;
    let vocabularyTotal = 0;
    
    Object.entries(answers).forEach(([index, answer]) => {
      const question = questions[parseInt(index)];
      if (question.type === 'comprehension') {
        comprehensionTotal++;
        if (question.correctAnswer === answer) {
          comprehensionCorrect++;
        }
      } else if (question.type === 'vocabulary') {
        vocabularyTotal++;
        if (question.correctAnswer === answer) {
          vocabularyCorrect++;
        }
      }
    });
    
    // Calculate comp/vocab score with edge case handling
    let compVocabScore = 0;
    if (comprehensionTotal > 0 && vocabularyTotal > 0) {
      const comprehensionPercent = (comprehensionCorrect / comprehensionTotal) * 100;
      const vocabularyPercent = (vocabularyCorrect / vocabularyTotal) * 100;
      compVocabScore = (comprehensionPercent + vocabularyPercent) / 2;
    } else if (comprehensionTotal > 0) {
      compVocabScore = (comprehensionCorrect / comprehensionTotal) * 100;
    } else if (vocabularyTotal > 0) {
      compVocabScore = (vocabularyCorrect / vocabularyTotal) * 100;
    }

    // Calculate composite score
    const compositeScore = Math.round((fluencyScore * 0.5) + (compVocabScore * 0.5));

    // Map to reading level
    let readingLevelLabel;
    if (compositeScore >= 150) {
      readingLevelLabel = 'Above Grade Level';
    } else if (compositeScore >= 120) {
      readingLevelLabel = 'At Grade Level';
    } else if (compositeScore >= 90) {
      readingLevelLabel = 'Slightly Below Grade Level';
    } else {
      readingLevelLabel = 'Below Grade Level';
    }

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
