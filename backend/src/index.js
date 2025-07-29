import express from "express";
import cors from "cors";

const app = express();
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
    res.json({ message: "Backend is working 🚀" });
  } catch (err) {
    console.error("❌ Error in GET /", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Students route
app.get("/api/students", (req, res) => {
  console.log("✅ GET /api/students called");
  res.json([
    { id: 1, name: "Lenae" },
    { id: 2, name: "Shepard" }
  ]);
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend listening at http://localhost:${PORT}`);
});
