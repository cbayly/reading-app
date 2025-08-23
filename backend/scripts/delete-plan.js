import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node scripts/delete-plan.js <planId>');
    process.exit(1);
  }

  const planId = parseInt(arg, 10);
  if (Number.isNaN(planId)) {
    console.error('Invalid planId. Must be a number.');
    process.exit(1);
  }

  try {
    // Check existence
    const existing = await prisma.plan.findUnique({
      where: { id: planId },
      include: { days: { include: { activities: true } }, story: true, student: true },
    });

    if (!existing) {
      console.log(`Plan ${planId} not found.`);
      return;
    }

    console.log('Deleting plan:', {
      id: existing.id,
      studentId: existing.studentId,
      name: existing.name,
      theme: existing.theme,
      days: existing.days.length,
      activities: existing.days.reduce((n, d) => n + d.activities.length, 0),
      hasStory: !!existing.story,
    });

    // Delete plan (relations are set to cascade in schema)
    await prisma.plan.delete({ where: { id: planId } });

    // Verify deletion
    const check = await prisma.plan.findUnique({ where: { id: planId } });
    if (!check) {
      console.log(`✅ Successfully deleted Plan ${planId} and its related data.`);
    } else {
      console.warn(`⚠ Plan ${planId} still exists after deletion attempt.`);
    }
  } catch (err) {
    console.error('Error deleting plan:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();


