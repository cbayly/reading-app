import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkNewPlan() {
  try {
    const plan = await prisma.plan.findUnique({
      where: { id: 9 },
      include: {
        student: true,
        story: true,
        days: {
          orderBy: { dayIndex: 'asc' },
          include: {
            activities: {
              orderBy: { id: 'asc' }
            }
          }
        }
      }
    });

    if (!plan) {
      console.log('Plan 9 not found');
      return;
    }

    console.log('=== New Plan Check ===');
    console.log('Plan ID:', plan.id);
    console.log('Student:', plan.student.name);
    console.log('Story Title:', plan.story.title);
    console.log('Theme:', plan.theme);
    
    plan.days.forEach(day => {
      console.log(`\nDay ${day.dayIndex}:`);
      console.log('  State:', day.state);
      day.activities.forEach(activity => {
        console.log(`  Activity ${activity.id} (${activity.type}):`);
        if (activity.type === 'matching' && day.dayIndex === 2) {
          console.log('    Prompt:', activity.prompt);
          console.log('    Pairs:', activity.data.pairs.length);
          activity.data.pairs.forEach((pair, index) => {
            console.log(`    Pair ${index + 1}:`);
            console.log(`      Question: ${pair.prompt}`);
            console.log(`      Answer: ${pair.answer}`);
          });
        }
      });
    });

  } catch (error) {
    console.error('Error checking plan:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNewPlan();
