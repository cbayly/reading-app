import express from "express";
import cors from "cors";
// import { PrismaClient } from "@prisma/client";

const app = express();
// const prisma = new PrismaClient();

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
app.get("/api/students", (req, res) => {
  console.log("✅ GET /api/students called");
  // Return hardcoded students for now (database will be added later)
  res.json([
    { id: 1, name: "Lenae" },
    { id: 2, name: "Shepard" }
  ]);
});

// Add a student (bonus endpoint) - simplified for now
app.post("/api/students", (req, res) => {
  const { name } = req.body;
  console.log(`✅ POST /api/students called with name: ${name}`);
  
  // For now, just return success (database will be added later)
  res.status(201).json({ 
    id: Date.now(), 
    name: name || "New Student",
    message: "Database integration coming soon!" 
  });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend listening at http://localhost:${PORT}`);
});
