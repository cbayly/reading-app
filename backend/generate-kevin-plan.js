import { PrismaClient } from '@prisma/client';
import { generateStoryOnly } from './lib/openai.js';

const prisma = new PrismaClient();

async function generateKevinPlan() {
  try {
    console.log('Looking for Kevin in the database...');
    
    // Find Kevin
    const kevin = await prisma.student.findFirst({
      where: {
        name: {
          contains: 'Kevin'
        }
      }
    });

    if (!kevin) {
      console.log('Kevin not found. Available students:');
      const allStudents = await prisma.student.findMany({
        select: { id: true, name: true, gradeLevel: true, interests: true }
      });
      allStudents.forEach(student => {
        console.log(`- ${student.name} (ID: ${student.id}, Grade: ${student.gradeLevel}, Interests: ${student.interests})`);
      });
      return;
    }

    console.log(`Found Kevin: ${kevin.name} (ID: ${kevin.id})`);
    console.log(`Grade Level: ${kevin.gradeLevel}`);
    console.log(`Interests: ${kevin.interests}`);
    console.log('\nGenerating new weekly plan with improved story generation...');

    // Generate the story-only plan
    const weeklyPlanData = await generateStoryOnly(kevin);

    console.log('\n✅ Story generation completed!');
    console.log(`Interest Theme: ${weeklyPlanData.interestTheme}`);
    console.log(`Chapters Generated: ${weeklyPlanData.chapters.length}`);

    // Display the chapters
    weeklyPlanData.chapters.forEach((chapter, index) => {
      const wordCount = chapter.content.split(' ').length;
      console.log(`\n📖 Chapter ${index + 1}: ${chapter.title}`);
      console.log(`Word Count: ${wordCount} words`);
      console.log(`Summary: ${chapter.summary}`);
      console.log(`Content Preview: ${chapter.content.substring(0, 100)}...`);
    });

    // Check if there's an existing plan to replace
    const existingPlan = await prisma.weeklyPlan.findFirst({
      where: { studentId: kevin.id },
      orderBy: { createdAt: 'desc' }
    });

    if (existingPlan) {
      console.log(`\n⚠️  Found existing plan (ID: ${existingPlan.id}). Deleting old plan...`);
      
      // Delete existing chapters and activities
      await prisma.chapter.deleteMany({
        where: { planId: existingPlan.id }
      });
      
      await prisma.dailyActivity.deleteMany({
        where: { planId: existingPlan.id }
      });
      
      // Delete the plan
      await prisma.weeklyPlan.delete({
        where: { id: existingPlan.id }
      });
      
      console.log('✅ Old plan deleted.');
    }

    // Create new weekly plan
    console.log('\nCreating new weekly plan in database...');
    const weeklyPlan = await prisma.weeklyPlan.create({
      data: {
        studentId: kevin.id,
        interestTheme: weeklyPlanData.interestTheme,
      }
    });

    // Create chapters
    const chapters = await Promise.all(
      weeklyPlanData.chapters.map(chapter => 
        prisma.chapter.create({
          data: {
            planId: weeklyPlan.id,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            content: chapter.content,
            summary: chapter.summary
          }
        })
      )
    );

    console.log(`✅ New weekly plan created!`);
    console.log(`Plan ID: ${weeklyPlan.id}`);
    console.log(`Chapters created: ${chapters.length}`);
    console.log(`\n🎉 Kevin's new weekly plan is ready!`);
    console.log(`You can view it at: http://localhost:3000/plan/${kevin.id}`);

  } catch (error) {
    console.error('❌ Error generating Kevin\'s plan:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateKevinPlan(); 