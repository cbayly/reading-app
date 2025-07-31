import { PrismaClient } from '@prisma/client';

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
        passwordHash: 'dummy_hash_for_seeding'
      }
    });
    
    console.log(`✅ Created parent: ${newParent.name} (ID: ${newParent.id})`);
  }

  const parentId = camParent?.id || (await prisma.parent.findFirst({
    where: { name: 'Cam' }
  })).id;

  // Create 3 new students using Office characters
  const newStudents = await prisma.student.createMany({
    data: [
      {
        parentId: parentId,
        name: 'Angela Martin',
        birthday: new Date('2012-06-25'), // 12 years old
        gradeLevel: 6,
        interests: 'cats,religion,organization,accounting'
      },
      {
        parentId: parentId,
        name: 'Kevin Malone',
        birthday: new Date('2010-11-01'), // 14 years old
        gradeLevel: 8,
        interests: 'cooking,music,drums,chili'
      },
      {
        parentId: parentId,
        name: 'Oscar Martinez',
        birthday: new Date('2011-03-15'), // 13 years old
        gradeLevel: 7,
        interests: 'politics,finance,education,debate'
      }
    ]
  });

  console.log(`✅ Created ${newStudents.count} new students for Cam`);
  
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