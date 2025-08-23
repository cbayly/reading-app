import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPlanProgress() {
  try {
    // Check Kevin's plan (ID 8)
    const plan = await prisma.plan.findUnique({
      where: { id: 8 },
      include: {
        student: true,
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
      console.log('Plan 8 not found');
      return;
    }

    console.log('=== Plan Progress Check ===');
    console.log('Plan ID:', plan.id);
    console.log('Student:', plan.student.name);
    console.log('Plan Status:', plan.status);
    console.log('Created:', plan.createdAt);
    console.log('Updated:', plan.updatedAt);
    
    console.log('\n=== Days Status ===');
    plan.days.forEach(day => {
      console.log(`Day ${day.dayIndex}:`);
      console.log(`  State: ${day.state}`);
      console.log(`  Completed At: ${day.completedAt || 'Not completed'}`);
      console.log(`  Activities: ${day.activities.length}`);
      
      day.activities.forEach(activity => {
        console.log(`    Activity ${activity.id} (${activity.type}):`);
        console.log(`      Response: ${activity.response ? 'Yes' : 'No'}`);
        console.log(`      Valid: ${activity.isValid || 'Not set'}`);
        if (activity.response) {
          console.log(`      Completed: ${activity.response.completed || 'Not set'}`);
        }
      });
    });

  } catch (error) {
    console.error('Error checking plan progress:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPlanProgress();
