import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/password.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // First, let's find Cam's parent record
  const camParent = await prisma.parent.findFirst({
    where: {
      OR: [
        { name: 'Cam' },
        { name: { contains: 'Cam' } }
      ]
    }
  });

  if (!camParent) {
    console.log('❌ No parent named Cam found. Creating a new parent record...');
    
    // Create Cam as a parent
    const newParent = await prisma.parent.create({
      data: {
        name: 'Cam',
        email: 'cam@example.com',
        // Set a known dev password and store a proper bcrypt hash
        passwordHash: await hashPassword('password123')
      }
    });
    
    console.log(`✅ Created parent: ${newParent.name} (ID: ${newParent.id})`);
  }

  // If Cam exists but has an invalid non-bcrypt password hash from older seeds,
  // update it to a valid hash so login works in development.
  const existingCam = camParent || (await prisma.parent.findFirst({
    where: { name: 'Cam' }
  }));

  if (existingCam && !String(existingCam.passwordHash || '').startsWith('$2')) {
    console.log('🔧 Fixing Cam\'s password hash to a valid bcrypt hash...');
    await prisma.parent.update({
      where: { id: existingCam.id },
      data: { passwordHash: await hashPassword('password123') }
    });
  }

  const parentId = existingCam?.id;

  // Create Office characters (including existing ones and new ones)
  const officeStudents = [
    {
      name: 'Angela Martin',
      birthday: new Date('2012-06-25'), // 12 years old
      gradeLevel: 6,
      interests: 'cats,religion,organization,accounting'
    },
    {
      name: 'Kevin Malone',
      birthday: new Date('2010-11-01'), // 14 years old
      gradeLevel: 8,
      interests: 'cooking,music,drums,chili'
    },
    {
      name: 'Oscar Martinez',
      birthday: new Date('2011-03-15'), // 13 years old
      gradeLevel: 7,
      interests: 'politics,finance,education,debate'
    },
    {
      name: 'Kelly Kapoor',
      birthday: new Date('2013-02-14'), // 11 years old
      gradeLevel: 5,
      interests: 'fashion,celebrity gossip,shopping,boys'
    },
    {
      name: 'Toby Flenderson',
      birthday: new Date('2009-08-22'), // 15 years old
      gradeLevel: 9,
      interests: 'books,writing,peace,conflict resolution'
    },
    {
      name: 'Stanley Hudson',
      birthday: new Date('2008-12-15'), // 16 years old
      gradeLevel: 10,
      interests: 'crossword puzzles,quiet time,pretzels'
    },
    {
      name: 'Phyllis Vance',
      birthday: new Date('2010-04-30'), // 14 years old
      gradeLevel: 8,
      interests: 'gardening,knitting,office gossip'
    },
    {
      name: 'Creed Bratton',
      birthday: new Date('2007-11-02'), // 17 years old
      gradeLevel: 11,
      interests: 'music,memories,mysterious past'
    },
    {
      name: 'Meredith Palmer',
      birthday: new Date('2009-07-10'), // 15 years old
      gradeLevel: 9,
      interests: 'parties,alcohol,supplier discounts'
    },
    {
      name: 'Ryan Howard',
      birthday: new Date('2011-09-05'), // 13 years old
      gradeLevel: 7,
      interests: 'technology,entrepreneurship,startups'
    }
  ];

  // Create students one by one to avoid duplicates
  for (const studentData of officeStudents) {
    const existingStudent = await prisma.student.findFirst({
      where: {
        parentId: parentId,
        name: studentData.name
      }
    });

    if (!existingStudent) {
      await prisma.student.create({
        data: {
          parentId: parentId,
          ...studentData
        }
      });
      console.log(`✅ Created student: ${studentData.name}`);
    } else {
      console.log(`⏭️  Student already exists: ${studentData.name}`);
    }
  }

  // List all students for Cam
  const allStudents = await prisma.student.findMany({
    where: { parentId: parentId },
    include: { parent: true }
  });
  
  console.log('\n📚 All students for Cam:');
  allStudents.forEach(student => {
    console.log(`  - ${student.name} (Grade ${student.gradeLevel}, Age ${new Date().getFullYear() - student.birthday.getFullYear()})`);
    console.log(`    Interests: ${student.interests}`);
  });

  // Seed the Benchmark data
  console.log('\n🌱 Seeding WPM benchmarks...');
  const benchmarkData = [
    { grade: 1, wpm: 75 },
    { grade: 2, wpm: 100 },
    { grade: 3, wpm: 120 },
    { grade: 4, wpm: 140 },
    { grade: 5, wpm: 150 },
    { grade: 6, wpm: 160 },
    { grade: 7, wpm: 170 },
    { grade: 8, wpm: 180 },
    { grade: 9, wpm: 190 },
    { grade: 10, wpm: 200 },
    { grade: 11, wpm: 210 },
    { grade: 12, wpm: 220 },
  ];

  for (const data of benchmarkData) {
    await prisma.benchmark.upsert({
      where: { grade: data.grade },
      update: {},
      create: data,
    });
  }
  console.log('✅ WPM benchmarks seeded.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 