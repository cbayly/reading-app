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

// Add database connection logging
console.log('🔍 Database Configuration:');
console.log('  - DATABASE_URL:', process.env.DATABASE_URL);
console.log('  - NODE_ENV:', process.env.NODE_ENV);

// Test database connection and schema
async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check what tables exist
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name;
    `;
    console.log('📋 Available tables:', tables.map(t => t.name));
    
    // Check specific tables we need
    const hasPlans = tables.some(t => t.name === 'plans');
    const hasPlan3s = tables.some(t => t.name === 'plan3s');
    const hasStudents = tables.some(t => t.name === 'students');
    
    console.log('🔍 Schema Check:');
    console.log('  - plans table exists:', hasPlans);
    console.log('  - plan3s table exists:', hasPlan3s);
    console.log('  - students table exists:', hasStudents);
    
    if (!hasPlans) {
      console.log('⚠️  WARNING: plans table missing - this will cause errors in old routes');
    }
    if (!hasPlan3s) {
      console.log('⚠️  WARNING: plan3s table missing - 3-day plan functionality will fail');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

// Run database test on startup
testDatabaseConnection();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

app.get("/", (req, res) => {
  console.log("✅ Root route hit");
  res.send("Reading App Backend is running!");
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/students', authenticate, studentRoutes);
app.use('/api/assessments', authenticate, assessmentRoutes);
// app.use('/api/plans', authenticate, planRoutes); // Disabled - replaced by 3-day plans
app.use('/api/plan3', authenticate, plan3Routes);

const PORT = process.env.PORT || 5050;
const server = app.listen(PORT, () => {
  console.log(`✅ Backend listening at http://localhost:${PORT}`);
});

// Configure server timeouts for long-running AI operations
server.setTimeout(180000); // 3 minutes
server.keepAliveTimeout = 120000; // 2 minutes
server.headersTimeout = 130000; // 2 minutes 10 seconds

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
