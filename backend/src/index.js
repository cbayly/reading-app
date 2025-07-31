import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import dotenv from 'dotenv';
import authRoutes from '../routes/auth.js';
import studentRoutes from '../routes/students.js';
import assessmentRoutes from '../routes/assessments.js';
import { authenticate } from '../middleware/auth.js';

// Load environment variables from .env file
dotenv.config();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
}));
app.use(express.json());

app.get("/", (req, res) => {
  console.log("✅ Root route hit");
  res.send("Reading App Backend is running!");
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/students', authenticate, studentRoutes);
app.use('/api/assessments', authenticate, assessmentRoutes);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`✅ Backend listening at http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
