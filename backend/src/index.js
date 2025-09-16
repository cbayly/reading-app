import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import dotenv from 'dotenv';
import authRoutes from '../routes/auth.js';
import studentRoutes from '../routes/students.js';
import assessmentRoutes from '../routes/assessments.js';
import planRoutes from '../routes/plans.js';
import plan3Routes from '../routes/plan3.js';
import enhancedActivitiesRoutes from '../routes/enhancedActivities.js';
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
    
    // Check what tables exist (different queries for SQLite vs PostgreSQL)
    let tables;
    if (process.env.DATABASE_URL?.startsWith('file:')) {
      // SQLite
      tables = await prisma.$queryRaw`
        SELECT name FROM sqlite_master 
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name;
      `;
    } else {
      // PostgreSQL
      tables = await prisma.$queryRaw`
        SELECT table_name as name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
    }
    console.log('📋 Available tables:', tables.map(t => t.name));
    
    // Check specific tables we need (using actual table names from database)
    const hasPlans = tables.some(t => t.name === 'Plan');
    const hasPlan3s = tables.some(t => t.name === 'Plan3');
    const hasStudents = tables.some(t => t.name === 'Student');
    
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

// Enhanced CORS configuration with debugging
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000', 
      'http://localhost:3001', 
      'http://127.0.0.1:3000',
      'https://reading-app-nine.vercel.app',
      'https://reading-app-git-main-cams-projects-c23d39a8.vercel.app',
      'https://reading-oxtggsrc4-cams-projects-c23d39a8.vercel.app'
    ];
    
    console.log('🌐 CORS Request from origin:', origin);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Allowing origin:', origin);
      return callback(null, true);
    } else {
      console.log('❌ CORS: Blocking origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
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

// Handle preflight OPTIONS requests explicitly
app.options('*', (req, res) => {
  console.log('🔄 OPTIONS preflight request for:', req.path);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/students', authenticate, studentRoutes);
app.use('/api/assessments', authenticate, assessmentRoutes);
// app.use('/api/plans', authenticate, planRoutes); // Disabled - replaced by 3-day plans
app.use('/api/plan3', authenticate, plan3Routes);
app.use('/api/enhanced-activities', authenticate, enhancedActivitiesRoutes);

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

// Export the Express app for production startup
export default app;
