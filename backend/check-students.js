import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStudents() {
  try {
    const students = await prisma.student.findMany({
      select: { id: true, name: true, parentId: true }
    });
    
    console.log('All students:', students);
    
    const parent197Students = await prisma.student.findMany({
      where: { parentId: 197 },
      select: { id: true, name: true, parentId: true }
    });
    
    console.log('Students for parent 197:', parent197Students);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudents();
