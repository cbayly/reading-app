import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import dotenv from 'dotenv';
import authRoutes from '../routes/auth.js';
import studentRoutes from '../routes/students.js';
import assessmentRoutes from '../routes/assessments.js';
import planRoutes from '../routes/plans.js';
import plan3Routes from '../routes/plan3.js';
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
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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
app.use('/api/plans', authenticate, planRoutes);
app.use('/api/plan3', authenticate, plan3Routes);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`✅ Backend listening at http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
