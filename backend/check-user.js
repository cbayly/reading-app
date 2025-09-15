import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkParent(email) {
  try {
    const parent = await prisma.parent.findUnique({
      where: { email: email }
    });
    
    if (parent) {
      console.log('✅ Parent found:');
      console.log('  ID:', parent.id);
      console.log('  Email:', parent.email);
      console.log('  Name:', parent.name);
      console.log('  Created:', parent.createdAt);
      
      // Get associated students
      const students = await prisma.student.findMany({
        where: { parentId: parent.id },
        select: { id: true, name: true, gradeLevel: true, birthday: true }
      });
      
      console.log('\n👥 Associated students:');
      if (students.length === 0) {
        console.log('  No students found');
      } else {
        students.forEach(student => {
          console.log(`  - ${student.name} (Grade ${student.gradeLevel}) - ID: ${student.id}`);
        });
      }
    } else {
      console.log('❌ Parent not found for email:', email);
      
      // List all parents in the database
      const allParents = await prisma.parent.findMany({
        select: { id: true, email: true, name: true, createdAt: true }
      });
      
      console.log('\n📋 All parents in database:');
      if (allParents.length === 0) {
        console.log('  No parents found in database');
      } else {
        allParents.forEach(parent => {
          console.log(`  - ${parent.email} (${parent.name}) - ID: ${parent.id}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error checking parent:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check for cam@example.com
checkParent('cam@example.com');
