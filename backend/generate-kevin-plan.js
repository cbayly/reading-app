import { PrismaClient } from '@prisma/client';
import { generateStory, generateComprehensionQuestions } from './lib/openai.js';

const prisma = new PrismaClient();

async function generateKevinPlan() {
  try {
    // Find Kevin Malone
    const kevin = await prisma.student.findFirst({
      where: { name: 'Kevin Malone' }
    });

    if (!kevin) {
      console.log('Kevin Malone not found in the system');
      return;
    }

    console.log('Found Kevin Malone:', {
      id: kevin.id,
      name: kevin.name,
      gradeLevel: kevin.gradeLevel,
      interests: kevin.interests
    });

    // Select a random interest from Kevin's interests
    const interests = kevin.interests.split(',');
    const selectedInterest = interests[Math.floor(Math.random() * interests.length)].trim();
    
    console.log('Selected interest theme:', selectedInterest);

    // Generate a story for Kevin
    console.log('Generating story for Kevin Malone...');
    const storyData = await generateStory(kevin, selectedInterest);

    console.log('Story generated successfully:', {
      title: storyData.title,
      themes: storyData.themes,
      vocabularyCount: storyData.vocabulary?.length || 0
    });

    // Create new plan in the database
    const plan = await prisma.plan.create({
      data: {
        studentId: kevin.id,
        name: storyData.title,
        theme: storyData.themes[0] || selectedInterest,
        status: 'active'
      }
    });

    // Create the story record
    const story = await prisma.story.create({
      data: {
        planId: plan.id,
        title: storyData.title,
        themes: storyData.themes,
        part1: storyData.part1,
        part2: storyData.part2,
        part3: storyData.part3,
        vocabulary: storyData.vocabulary
      }
    });

    // Create the 5 days for the plan
    const days = await Promise.all(
      Array.from({ length: 5 }, (_, index) => 
        prisma.day.create({
          data: {
            planId: plan.id,
            dayIndex: index + 1,
            state: index === 0 ? 'available' : 'locked'
          }
        })
      )
    );

    // Scaffold initial activities for each day
    const dayActivities = [];

    // Day 1: Vocabulary Matching (6 pairs from story vocabulary)
    if (storyData.vocabulary && storyData.vocabulary.length > 0) {
      const day1Activities = [{
        dayId: days[0].id,
        type: 'matching',
        prompt: 'Match each vocabulary word with its correct definition from Chapter 1.',
        data: {
          pairs: storyData.vocabulary.map(vocab => ({
            word: vocab.word,
            definition: vocab.definition
          })),
          instructions: 'Match all vocabulary words with their correct definitions. All pairs must be correct to complete this activity.'
        },
        response: null,
        isValid: null
      }];
      dayActivities.push(...day1Activities);
    }

    // Day 2: Comprehension Matching (5-6 items)
    console.log('Generating comprehension questions for Day 2...');
    const day2Comprehension = await generateComprehensionQuestions(storyData.part2, kevin);
    
    const day2Activities = [{
      dayId: days[1].id,
      type: 'matching',
      prompt: 'Match the comprehension questions with their correct answers from Chapter 2.',
      data: {
        pairs: day2Comprehension.questions.map(q => ({
          prompt: q.text,
          answer: q.options[q.correctAnswer.charCodeAt(0) - 65] // Convert A->0, B->1, etc.
        })),
        instructions: 'Match the comprehension questions with their correct answers from Chapter 2. All pairs must be correct to complete this activity.'
      },
      response: null,
      isValid: null
    }];
    dayActivities.push(...day2Activities);

    // Day 3: Choice-based Reflection
    const day3Activities = [{
      dayId: days[2].id,
      type: 'reflection',
      prompt: 'Choose your reflection style and complete the activity.',
      data: {
        choice: null,
        options: {
          oneGoodTwoBad: {
            label: 'Option A: 1 good thing, 2 things to improve',
            fields: [
              { label: 'One good thing about the story', required: true },
              { label: 'First thing that could be improved', required: true },
              { label: 'Second thing that could be improved', required: true }
            ]
          },
          twoGoodOneBad: {
            label: 'Option B: 2 good things, 1 thing to improve',
            fields: [
              { label: 'First good thing about the story', required: true },
              { label: 'Second good thing about the story', required: true },
              { label: 'One thing that could be improved', required: true }
            ]
          }
        },
        instructions: 'Choose your reflection style and provide thoughtful responses for all three fields.'
      },
      response: null,
      isValid: null
    }];
    dayActivities.push(...day3Activities);

    // Day 4: Conditional Writing + Optional Upload
    const day4Activities = [{
      dayId: days[3].id,
      type: 'writing',
      prompt: 'Write based on your Day 3 choice.',
      data: {
        conditionalPrompt: {
          oneGoodTwoBad: 'Write what you would change to make the story better. (1-3 paragraphs)',
          twoGoodOneBad: 'Write what you think will happen on the next adventure in the series. (1-3 paragraphs)'
        },
        instructions: 'Write 1-3 paragraphs based on your Day 3 reflection choice. Uploading a drawing is optional.',
        requiresDay3Choice: true
      },
      response: null,
      isValid: null
    }, {
      dayId: days[3].id,
      type: 'upload',
      prompt: 'Optional: Draw what you described and upload it.',
      data: {
        acceptedTypes: ['image/png', 'image/jpeg', 'image/webp'],
        maxSize: 10485760, // 10MB
        instructions: 'Upload an image file (PNG, JPEG, or WebP) up to 10MB. This is optional.',
        isOptional: true
      },
      response: null,
      isValid: null
    }];
    dayActivities.push(...day4Activities);

    // Day 5: Activity Ideas (user must pick at least 2)
    const day5Activities = [{
      dayId: days[4].id,
      type: 'multi-select',
      prompt: 'Select and complete at least 2 activities from the list below.',
      data: {
        activities: [
          {
            id: 'sequence-builder',
            type: 'sequence',
            label: 'Sequence Builder',
            description: 'Reorder 8-10 story beats in the correct sequence.',
            required: false
          },
          {
            id: 'alternate-ending',
            type: 'writing',
            label: 'Alternate Ending',
            description: 'Write a short alternate ending (1-2 paragraphs).',
            required: false
          },
          {
            id: 'character-journal',
            type: 'writing',
            label: 'Character Journal',
            description: 'Write a journal entry from a character\'s point of view.',
            required: false
          },
          {
            id: 'dialogue-rewrite',
            type: 'writing',
            label: 'Dialogue Rewrite',
            description: 'Rewrite a scene as dialogue only (script format).',
            required: false
          },
          {
            id: 'poster-slogan',
            type: 'writing',
            label: 'Poster/Slogan',
            description: 'Create a tagline and short blurb for a poster.',
            required: false
          },
          {
            id: 'vocabulary-author',
            type: 'writing',
            label: 'Vocabulary Author',
            description: 'Create 4 new vocabulary words with definitions and example sentences.',
            required: false
          }
        ],
        instructions: 'You must select and complete at least 2 activities. No activities are pre-selected.',
        minRequired: 2
      },
      response: null,
      isValid: null
    }];
    dayActivities.push(...day5Activities);

    // Create all activities in the database
    const createdActivities = await Promise.all(
      dayActivities.map(activity => 
        prisma.activity.create({
          data: activity
        })
      )
    );

    console.log('✅ Plan created successfully for Kevin Malone!');
    console.log('Plan ID:', plan.id);
    console.log('Story Title:', story.title);
    console.log('Theme:', plan.theme);
    console.log('Days created:', days.length);
    console.log('Activities created:', createdActivities.length);

    // Fetch the complete plan
    const completePlan = await prisma.plan.findUnique({
      where: { id: plan.id },
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

    console.log('\n📋 Plan Summary:');
    console.log(`- Student: ${completePlan.student.name}`);
    console.log(`- Plan Name: ${completePlan.name}`);
    console.log(`- Theme: ${completePlan.theme}`);
    console.log(`- Story Title: ${completePlan.story.title}`);
    console.log(`- Days: ${completePlan.days.length}`);
    console.log(`- Total Activities: ${completePlan.days.reduce((sum, day) => sum + day.activities.length, 0)}`);
    console.log(`- Vocabulary Words: ${completePlan.story.vocabulary.length}`);
    console.log(`- Plan URL: http://localhost:3000/plan/${plan.id}`);

  } catch (error) {
    console.error('❌ Error generating plan for Kevin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateKevinPlan(); 