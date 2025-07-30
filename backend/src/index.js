import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import { authenticate } from './middleware/auth.js';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  console.log("✅ Root route hit");
  res.send("Reading App Backend is running!");
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/students', authenticate, studentRoutes);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`✅ Backend listening at http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
