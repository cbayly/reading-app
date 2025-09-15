import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createParent(email, name, password) {
  try {
    // Check if parent already exists
    const existingParent = await prisma.parent.findUnique({
      where: { email: email }
    });
    
    if (existingParent) {
      console.log('❌ Parent already exists with email:', email);
      return;
    }
    
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create the parent
    const parent = await prisma.parent.create({
      data: {
        email: email,
        name: name,
        passwordHash: passwordHash
      }
    });
    
    console.log('✅ Parent created successfully:');
    console.log('  ID:', parent.id);
    console.log('  Email:', parent.email);
    console.log('  Name:', parent.name);
    console.log('  Created:', parent.createdAt);
    
    // Create a sample student for this parent
    const student = await prisma.student.create({
      data: {
        parentId: parent.id,
        name: 'Sample Student',
        birthday: new Date('2015-01-01'),
        gradeLevel: 3,
        interests: 'reading, space, dinosaurs'
      }
    });
    
    console.log('\n👥 Sample student created:');
    console.log('  ID:', student.id);
    console.log('  Name:', student.name);
    console.log('  Grade:', student.gradeLevel);
    
  } catch (error) {
    console.error('❌ Error creating parent:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Create parent with cam@example.com
createParent('cam@example.com', 'Cam', 'password123');
