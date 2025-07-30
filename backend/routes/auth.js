import express from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword } from '../lib/password.js';
import { generateToken } from '../lib/jwt.js';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  try {
    const existingParent = await prisma.parent.findUnique({ where: { email } });
    if (existingParent) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);

    const parent = await prisma.parent.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    const token = generateToken({ id: parent.id, email: parent.email });

    res.status(201).json({ token, parent: { id: parent.id, name: parent.name, email: parent.email } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'An error occurred during signup' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const parent = await prisma.parent.findUnique({ where: { email } });
    if (!parent) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await comparePassword(password, parent.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken({ id: parent.id, email: parent.email });

    res.status(200).json({ token, parent: { id: parent.id, name: parent.name, email: parent.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

export default router; 