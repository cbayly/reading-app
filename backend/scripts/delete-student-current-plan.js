import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const nameArg = process.argv.slice(2).join(' ').trim();
  const targetName = nameArg || 'Lenae';

  try {
    const students = await prisma.student.findMany({
      where: {
        // SQLite client here doesn't support case-insensitive mode argument
        // Use simple contains filter
        name: { contains: targetName },
      },
      include: {
        plans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (students.length === 0) {
      console.log(`No students found matching name: ${targetName}`);
      return;
    }

    // Prefer the first student with a plan
    const withPlan = students.find(s => s.plans && s.plans.length > 0);
    const student = withPlan || students[0];

    if (!student.plans || student.plans.length === 0) {
      console.log(`Student ${student.name} (id=${student.id}) has no plans to delete.`);
      return;
    }

    const plan = student.plans[0];
    console.log(`Deleting most recent plan for ${student.name} (studentId=${student.id}): planId=${plan.id}`);

    await prisma.plan.delete({ where: { id: plan.id } });

    const check = await prisma.plan.findUnique({ where: { id: plan.id } });
    if (!check) {
      console.log(`✅ Deleted plan ${plan.id} for ${student.name}.`);
    } else {
      console.warn(`⚠ Plan ${plan.id} still exists after deletion attempt.`);
    }
  } catch (err) {
    console.error('Error deleting student plan:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();


