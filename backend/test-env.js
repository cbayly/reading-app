import dotenv from 'dotenv';
dotenv.config();

console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
