import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAssessments() {
  try {
    console.log('🌱 Starting assessment seeding...');

    // Get all students
    const students = await prisma.student.findMany({
      include: {
        assessments: true
      }
    });

    console.log(`Found ${students.length} students`);

    for (const student of students) {
      console.log(`Processing student: ${student.name} (ID: ${student.id})`);
      
      // Skip if student already has assessments
      if (student.assessments.length > 0) {
        console.log(`  ⏭️  Student ${student.name} already has ${student.assessments.length} assessments, skipping...`);
        continue;
      }

      // Create 2-3 assessments per student with different statuses
      const assessmentCount = Math.floor(Math.random() * 2) + 2; // 2-3 assessments
      
      for (let i = 0; i < assessmentCount; i++) {
        const status = i === 0 ? 'completed' : (i === 1 ? 'in_progress' : 'not_started');
        
        // Generate realistic assessment data
        const readingTime = Math.floor(Math.random() * 300) + 120; // 2-7 minutes
        const errorCount = Math.floor(Math.random() * 5) + 1; // 1-5 errors
        const wpm = Math.floor(Math.random() * 50) + 80; // 80-130 WPM
        const accuracy = Math.random() * 0.2 + 0.8; // 80-100% accuracy
        
        // Calculate composite score based on WPM and accuracy
        const compositeScore = (wpm * 0.6) + (accuracy * 100 * 0.4);
        
        // Determine reading level based on grade and performance
        const readingLevels = ['Below Grade', 'At Grade', 'Above Grade'];
        const readingLevel = wpm > 110 ? 'Above Grade' : (wpm > 90 ? 'At Grade' : 'Below Grade');
        
        const assessment = await prisma.assessment.create({
          data: {
            studentId: student.id,
            status: status,
            passage: `Sample reading passage for ${student.name}. This is a ${status} assessment that tests reading comprehension and fluency. The passage contains age-appropriate content for a ${student.gradeLevel}th grade student.`,
            questions: {
              questions: [
                {
                  id: 1,
                  question: "What is the main idea of this passage?",
                  options: ["Option A", "Option B", "Option C", "Option D"],
                  correctAnswer: 0
                },
                {
                  id: 2,
                  question: "Which detail supports the main idea?",
                  options: ["Detail A", "Detail B", "Detail C", "Detail D"],
                  correctAnswer: 1
                }
              ]
            },
            studentAnswers: status === 'completed' ? {
              answers: [
                { questionId: 1, answer: 0, isCorrect: true },
                { questionId: 2, answer: 1, isCorrect: true }
              ]
            } : null,
            readingTime: status !== 'not_started' ? readingTime : null,
            errorCount: status === 'completed' ? errorCount : null,
            wpm: status === 'completed' ? wpm : null,
            accuracy: status === 'completed' ? accuracy : null,
            compositeScore: status === 'completed' ? compositeScore : null,
            fluencyScore: status === 'completed' ? wpm : null,
            compVocabScore: status === 'completed' ? accuracy * 100 : null,
            readingLevelLabel: status === 'completed' ? readingLevel : null
          }
        });

        console.log(`  ✅ Created ${status} assessment (ID: ${assessment.id})`);
      }
    }

    console.log('🎉 Assessment seeding completed successfully!');
    
    // Print summary
    const totalAssessments = await prisma.assessment.count();
    console.log(`📊 Total assessments in database: ${totalAssessments}`);
    
    const completedAssessments = await prisma.assessment.count({
      where: { status: 'completed' }
    });
    console.log(`✅ Completed assessments: ${completedAssessments}`);
    
    const inProgressAssessments = await prisma.assessment.count({
      where: { status: 'in_progress' }
    });
    console.log(`🔄 In-progress assessments: ${inProgressAssessments}`);
    
    const notStartedAssessments = await prisma.assessment.count({
      where: { status: 'not_started' }
    });
    console.log(`⏳ Not started assessments: ${notStartedAssessments}`);

  } catch (error) {
    console.error('❌ Error seeding assessments:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedAssessments()
  .then(() => {
    console.log('✅ Seeder completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
  });
