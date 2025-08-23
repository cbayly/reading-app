import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDay1() {
  try {
    // Reset Day 1 to available
    await prisma.day.updateMany({
      where: { 
        planId: 8,
        dayIndex: 1 
      },
      data: {
        state: 'available',
        completedAt: null,
        updatedAt: new Date()
      }
    });

    // Reset the activity response
    await prisma.activity.updateMany({
      where: { 
        day: {
          planId: 8,
          dayIndex: 1
        }
      },
      data: {
        response: null,
        isValid: null,
        updatedAt: new Date()
      }
    });

    console.log('✅ Day 1 reset to available state');
    
    // Verify the reset
    const day = await prisma.day.findFirst({
      where: { planId: 8, dayIndex: 1 },
      include: { activities: true }
    });
    
    console.log('Day 1 current state:', {
      state: day.state,
      completedAt: day.completedAt,
      activities: day.activities.map(a => ({
        id: a.id,
        type: a.type,
        hasResponse: !!a.response,
        isValid: a.isValid
      }))
    });

  } catch (error) {
    console.error('Error resetting Day 1:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDay1();
