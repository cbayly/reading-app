import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.student.deleteMany();

  // Create initial students
  const students = await prisma.student.createMany({
    data: [
      { name: 'Lenae' },
      { name: 'Shepard' },
    ],
  });

  console.log(`✅ Created ${students.count} students`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 