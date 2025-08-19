import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { name: '', wpm: 210 };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--name') {
      options.name = args[i + 1] || '';
      i += 1;
    } else if (a === '--wpm') {
      options.wpm = parseInt(args[i + 1] || '210', 10);
      i += 1;
    }
  }
  return options;
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

async function main() {
  const { name, wpm } = parseArgs();
  if (!name) {
    console.log('Usage: node scripts/assessment-time.js --name "Student Name" [--wpm 210]');
    process.exit(1);
  }

  const student = await prisma.student.findFirst({ where: { name } });
  if (!student) {
    console.error(`Student not found: ${name}`);
    process.exit(1);
  }

  const assessment = await prisma.assessment.findFirst({
    where: { studentId: student.id },
    orderBy: { createdAt: 'desc' }
  });

  if (!assessment || !assessment.passage) {
    console.error('No assessment with a passage found for this student.');
    process.exit(1);
  }

  const wordCount = assessment.passage.split(/\s+/).length;
  const minutesNeeded = wordCount / wpm;
  const secondsNeeded = minutesNeeded * 60;

  console.log(`Student: ${name}`);
  console.log(`Most recent assessment ID: ${assessment.id}`);
  console.log(`Passage word count: ${wordCount}`);
  console.log(`Target WPM: ${wpm}`);
  console.log(`Required time: ${minutesNeeded.toFixed(2)} minutes (${formatDuration(secondsNeeded)})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


