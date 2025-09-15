import { PrismaClient } from '@prisma/client';
import { generateStoryActivityContent } from './lib/openai.js';

const prisma = new PrismaClient();

async function testGeneDay1() {
  try {
    console.log('🧪 Testing Gene\'s Day 1 activity generation...');
    
    // Get Gene's active plan
    const plan = await prisma.plan3.findFirst({
      where: { 
        studentId: 58, // Gene's ID
        status: 'active'
      },
      include: {
        student: true,
        story: true,
        days: {
          where: { index: 1 },
          orderBy: { index: 'asc' }
        }
      }
    });

    if (!plan) {
      console.log('❌ No active plan found for Gene');
      return;
    }

    console.log('✅ Found plan:', plan.id);
    console.log('📖 Story:', plan.story?.title);
    console.log('📄 Day 1 content length:', plan.story?.part1?.length || 0);

    if (!plan.story?.part1) {
      console.log('❌ No story content for Day 1');
      return;
    }

    const day = plan.days[0];
    console.log('📅 Day 1 state:', day.state);

    // Test activity generation
    console.log('\n🎯 Generating WHO activity...');
    const whoActivity = await generateStoryActivityContent(plan.story.part1, plan.student, 'who');
    console.log('WHO activity characters:', whoActivity.characters?.length || 0);

    console.log('\n🔄 Generating SEQUENCE activity...');
    const sequenceActivity = await generateStoryActivityContent(plan.story.part1, plan.student, 'sequence');
    console.log('SEQUENCE activity events:', sequenceActivity.events?.length || 0);

    // Show the actual day response structure
    const activities = [
      {
        id: 'who',
        type: 'who',
        title: 'Who Activity',
        prompt: `Who are the characters in Chapter 1?`,
        description: 'Drag character names to match their descriptions.',
        data: {
          type: 'character-matching',
          instructions: 'Match each character with their correct description from the chapter.',
          characters: whoActivity.characters || []
        },
        completed: day.answers?.who ? true : false,
        response: day.answers?.who || null
      },
      {
        id: 'sequence',
        type: 'sequence',
        title: 'Sequence Activity',
        prompt: `What happened in Chapter 1? Put the events in order.`,
        description: 'Drag the event cards to arrange them in the correct sequence.',
        data: {
          type: 'event-ordering',
          instructions: 'Drag the events to put them in the correct order from the chapter.',
          events: sequenceActivity.events || [],
          correctOrder: sequenceActivity.correctOrder || []
        },
        completed: day.answers?.sequence ? true : false,
        response: day.answers?.sequence || null
      }
    ];

    console.log('\n📋 Generated activities summary:');
    activities.forEach(activity => {
      console.log(`- ${activity.title}: ${activity.data.characters?.length || activity.data.events?.length || 0} items`);
    });

  } catch (error) {
    console.error('❌ Error testing Gene\'s Day 1:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGeneDay1();
