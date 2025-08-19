import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const studentIdx = args.indexOf('--student');
  const studentId = studentIdx !== -1 ? parseInt(args[studentIdx + 1], 10) : null;
  return { studentId };
}

function ok(check, msg) {
  const icon = check ? '✅' : '❌';
  console.log(`${icon} ${msg}`);
  return check;
}

async function main() {
  const { studentId } = parseArgs();
  if (!studentId) {
    console.log('Usage: node scripts/check-plan.js --student <studentId>');
    process.exit(1);
  }

  try {
    const plan = await prisma.weeklyPlan.findFirst({
      where: { studentId },
      include: {
        chapters: { orderBy: { chapterNumber: 'asc' } },
        dailyActivities: true,
        student: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!plan) {
      console.log(`No weekly plan found for studentId ${studentId}.`);
      return;
    }

    console.log(`Student: ${plan.student.name} (ID: ${studentId})`);
    console.log(`Plan ID: ${plan.id}`);
    console.log(`Interest Theme: ${plan.interestTheme}`);

    const checks = [];
    checks.push(ok(Boolean(plan.interestTheme && plan.interestTheme.trim().length > 0), 'Interest theme present'));
    checks.push(ok(Array.isArray(plan.chapters) && plan.chapters.length === 3, 'Exactly 3 chapters present'));

    plan.chapters.forEach((ch) => {
      ok(Boolean(ch.title && ch.title.trim().length > 0), `Chapter ${ch.chapterNumber} has title`);
      const wordCount = String(ch.content || '').trim().split(/\s+/).filter(Boolean).length;
      const withinRange = wordCount >= 300 && wordCount <= 500;
      ok(withinRange, `Chapter ${ch.chapterNumber} word count ${wordCount} (required 300-500)`);
      ok(Boolean(ch.summary && ch.summary.trim().length > 0), `Chapter ${ch.chapterNumber} has summary`);
    });

    checks.push(ok(Array.isArray(plan.dailyActivities) && plan.dailyActivities.length === 0, 'No activities at creation (on-demand later)'));

    const passed = checks.every(Boolean);
    console.log(`\nOverall: ${passed ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('Error checking plan:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();


