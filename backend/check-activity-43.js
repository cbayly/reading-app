import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkActivity43() {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id: 43 },
      include: {
        day: {
          include: {
            plan: {
              include: {
                student: true
              }
            }
          }
        }
      }
    });

    if (!activity) {
      console.log('Activity 43 not found');
      return;
    }

    console.log('=== Activity 43 Analysis ===');
    console.log('Activity ID:', activity.id);
    console.log('Activity Type:', activity.type);
    console.log('Day Index:', activity.day.dayIndex);
    console.log('Plan ID:', activity.day.plan.id);
    console.log('Student:', activity.day.plan.student.name);
    
    console.log('\n=== Activity Data Structure ===');
    console.log('Raw data:', JSON.stringify(activity.data, null, 2));
    
    // Analyze the data structure
    if (activity.data && activity.data.pairs) {
      console.log('\n=== Pairs Analysis ===');
      console.log('Number of pairs:', activity.data.pairs.length);
      
      activity.data.pairs.forEach((pair, index) => {
        console.log(`\nPair ${index + 1}:`);
        console.log('  Keys:', Object.keys(pair));
        if (pair.word) console.log('  Word:', pair.word);
        if (pair.definition) console.log('  Definition:', pair.definition);
        if (pair.prompt) console.log('  Prompt:', pair.prompt);
        if (pair.answer) console.log('  Answer:', pair.answer);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActivity43();
