import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/students
router.get('/', authenticate, async (req, res) => {
  try {
    // req.user is added by the authenticate middleware
    const students = await prisma.student.findMany({
      where: { parentId: req.user.id },
      orderBy: { createdAt: 'asc' }
    });
    res.json(students);
  } catch (err) {
    console.error("❌ Error fetching students:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

// GET /api/students/:id/plans - Get all 3-day plans for a student
router.get('/:id/plans', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    console.log(`🔍 GET /api/students/${studentId}/plans - Request from parent ${req.user.id}`);
    
    // Verify the student belongs to the authenticated parent
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        parentId: req.user.id
      }
    });

    if (!student) {
      console.log(`❌ Student ${studentId} not found for parent ${req.user.id}`);
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log(`✅ Found student: ${student.name} (ID: ${student.id})`);

    // Get all 3-day plans for this student
    const plans = await prisma.plan3.findMany({
      where: { studentId: studentId },
      include: {
        days: {
          orderBy: { index: 'asc' }
        },
        story: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📚 Found ${plans.length} plans for student ${studentId}`);
    res.json(plans);

  } catch (err) {
    console.error("❌ Error fetching student plans:", err);
    res.status(500).json({ message: "Failed to fetch student plans" });
  }
});

// GET /api/students/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    console.log(`🔍 GET /api/students/${studentId} - Request from parent ${req.user.id}`);
    
    // Verify the student belongs to the authenticated parent
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        parentId: req.user.id
      },
      include: {
        assessments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!student) {
      console.log(`❌ Student ${studentId} not found for parent ${req.user.id}`);
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log(`✅ Found student: ${student.name} (ID: ${student.id})`);
    res.json(student);
  } catch (err) {
    console.error("❌ Error fetching student:", err);
    res.status(500).json({ message: "Failed to fetch student" });
  }
});

// POST /api/students
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, birthday, gradeLevel, interests } = req.body;
    
    if (!name || !birthday || !gradeLevel) {
      return res.status(400).json({ message: 'Name, birthday, and grade level are required' });
    }

    const student = await prisma.student.create({
      data: {
        name,
        birthday: new Date(birthday),
        gradeLevel,
        interests: interests || '',
        parentId: req.user.id
      }
    });

    res.status(201).json(student);
  } catch (err) {
    console.error("❌ Error creating student:", err);
    res.status(500).json({ message: "Failed to create student" });
  }
});

// PUT /api/students/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const { name, birthday, gradeLevel, interests } = req.body;
    
    if (!name || !birthday || !gradeLevel) {
      return res.status(400).json({ message: 'Name, birthday, and grade level are required' });
    }

    // Verify the student belongs to the authenticated parent
    const existingStudent = await prisma.student.findFirst({
      where: {
        id: studentId,
        parentId: req.user.id
      }
    });

    if (!existingStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Update the student
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        name,
        birthday: new Date(birthday),
        gradeLevel,
        interests: interests || ''
      }
    });

    res.json(updatedStudent);
  } catch (err) {
    console.error("❌ Error updating student:", err);
    res.status(500).json({ message: "Failed to update student" });
  }
});

// DELETE /api/students/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    
    // Verify the student belongs to the authenticated parent
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        parentId: req.user.id
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Delete the student (assessments will be deleted automatically due to cascade)
    await prisma.student.delete({
      where: { id: studentId }
    });

    res.json({ message: 'Student and all assessments deleted successfully' });
  } catch (err) {
    console.error("❌ Error deleting student:", err);
    res.status(500).json({ message: "Failed to delete student" });
  }
});

export default router; 