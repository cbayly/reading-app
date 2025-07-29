import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Debug middleware: logs every incoming request
app.use((req, res, next) => {
  console.log(`➡️ Incoming request: ${req.method} ${req.url}`);
  next();
});

// Root route
app.get("/", (req, res) => {
  console.log("✅ Root route hit");
  try {
    res.json({ 
      message: "Reading App Backend API 🚀",
      status: "healthy",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Error in GET /", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Students route
app.get("/api/students", async (req, res) => {
  console.log("✅ GET /api/students called");
  try {
    const students = await prisma.student.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    // If no students exist, return default ones
    if (students.length === 0) {
      return res.json([
        { id: 1, name: "Lenae" },
        { id: 2, name: "Shepard" }
      ]);
    }
    
    res.json(students);
  } catch (err) {
    console.error("❌ Error fetching students:", err);
    // Fallback to hardcoded data if database fails
    res.json([
      { id: 1, name: "Lenae" },
      { id: 2, name: "Shepard" }
    ]);
  }
});

// Add a student (bonus endpoint)
app.post("/api/students", async (req, res) => {
  const { name } = req.body;
  console.log(`✅ POST /api/students called with name: ${name}`);
  
  try {
    const student = await prisma.student.create({
      data: { name }
    });
    res.status(201).json(student);
  } catch (err) {
    console.error("❌ Error creating student:", err);
    res.status(500).json({ error: "Failed to create student" });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('👋 Disconnecting from database...');
  await prisma.$disconnect();
  process.exit(0);
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend listening at http://localhost:${PORT}`);
});
