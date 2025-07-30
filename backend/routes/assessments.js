import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

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
    const student = await prisma.student.findFirst({
      where: { id: studentId, parentId }
    });

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

    // Create new assessment
    const assessment = await prisma.assessment.create({
      data: {
        studentId,
        status: 'not_started'
      }
    });

    res.status(201).json({
      assessment,
      resumed: false
    });
  } catch (error) {
    console.error('Assessment creation error:', error);
    res.status(500).json({ message: 'An error occurred while creating the assessment' });
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

export default router; 