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

// You can add more student-related routes here later (e.g., POST, PUT, DELETE)

export default router; 