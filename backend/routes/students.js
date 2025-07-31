import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/students
router.get('/', async (req, res) => {
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

// POST /api/students
router.post('/', async (req, res) => {
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

export default router; 