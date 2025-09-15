import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createBobsBurgersStudents() {
  try {
    // Find the parent account (cam@example.com)
    const parent = await prisma.parent.findUnique({
      where: { email: 'cam@example.com' }
    });
    
    if (!parent) {
      console.log('❌ Parent account not found. Please create the cam@example.com account first.');
      return;
    }
    
    console.log('✅ Found parent account:', parent.name);
    
    // Bob's Burgers kids data
    const bobsBurgersKids = [
      {
        name: 'Tina Belcher',
        birthday: new Date('2007-05-04'), // Tina is the oldest, around 13-14
        gradeLevel: 8,
        interests: 'boys, horses, writing, zombies, butts, romance novels, drama club, leadership'
      },
      {
        name: 'Gene Belcher',
        birthday: new Date('2009-09-14'), // Gene is the middle child, around 11-12
        gradeLevel: 6,
        interests: 'music, keyboard, composing, food, puns, costumes, performing, sound effects, being a food critic'
      },
      {
        name: 'Louise Belcher',
        birthday: new Date('2011-01-15'), // Louise is the youngest, around 9-10
        gradeLevel: 4,
        interests: 'pranks, mischief, money, business schemes, science experiments, being the smartest, pink bunny ears, chaos'
      }
    ];
    
    // Create each student
    for (const kid of bobsBurgersKids) {
      // Check if student already exists
      const existingStudent = await prisma.student.findFirst({
        where: {
          parentId: parent.id,
          name: kid.name
        }
      });
      
      if (existingStudent) {
        console.log(`⚠️  Student ${kid.name} already exists (ID: ${existingStudent.id})`);
        continue;
      }
      
      // Create the student
      const student = await prisma.student.create({
        data: {
          parentId: parent.id,
          name: kid.name,
          birthday: kid.birthday,
          gradeLevel: kid.gradeLevel,
          interests: kid.interests
        }
      });
      
      console.log(`✅ Created student: ${student.name}`);
      console.log(`   ID: ${student.id}`);
      console.log(`   Grade: ${student.gradeLevel}`);
      console.log(`   Birthday: ${student.birthday.toDateString()}`);
      console.log(`   Interests: ${student.interests}`);
      console.log('');
    }
    
    // List all students for this parent
    const allStudents = await prisma.student.findMany({
      where: { parentId: parent.id },
      orderBy: { name: 'asc' }
    });
    
    console.log('📋 All students for Cam:');
    allStudents.forEach(student => {
      console.log(`   - ${student.name} (Grade ${student.gradeLevel}) - ID: ${student.id}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating Bob\'s Burgers students:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Create the Bob's Burgers kids
createBobsBurgersStudents();
