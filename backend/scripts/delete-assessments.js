import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load .env relative to backend directory regardless of CWD
dotenv.config();

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { names: [], all: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--all') {
      options.all = true;
    } else if (arg === '--names') {
      const value = args[i + 1] || '';
      i += 1;
      options.names = value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
  }
  return options;
}

async function main() {
  const { names, all } = parseArgs();

  if (!all && (!names || names.length === 0)) {
    console.log('Usage: node scripts/delete-assessments.js --names "Name A,Name B"\n       or: node scripts/delete-assessments.js --all');
    process.exit(1);
  }

  try {
    let where = {};
    if (!all) {
      where = { student: { name: { in: names } } };
      console.log(`Deleting assessments for students: ${names.join(', ')}`);
    } else {
      console.log('Deleting ALL assessments');
    }

    const result = await prisma.assessment.deleteMany({ where });
    console.log(`Deleted ${result.count} assessment(s).`);
  } catch (error) {
    console.error('Failed to delete assessments:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();


