import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPlan3s() {
  try {
    console.log('🌱 Starting Plan3 seeding...');

    // Get students who don't have Plan3s yet
    const students = await prisma.student.findMany({
      include: {
        plan3s: true
      }
    });

    console.log(`Found ${students.length} students`);

    const studentsWithoutPlans = students.filter(student => student.plan3s.length === 0);
    console.log(`${studentsWithoutPlans.length} students need Plan3s`);

    // Create Plan3s for students who don't have them (skip Angela who already has one)
    for (const student of studentsWithoutPlans.slice(0, 3)) { // Create for 3 more students
      console.log(`Creating Plan3 for student: ${student.name} (ID: ${student.id})`);
      
      // Create the Plan3
      const plan3 = await prisma.plan3.create({
        data: {
          studentId: student.id,
          name: `${student.name}'s Adventure Plan`,
          theme: `${student.interests.split(',')[0]} and friendship`,
          status: 'active'
        }
      });

      console.log(`  ✅ Created Plan3 (ID: ${plan3.id})`);

      // Create the story
      const story = await prisma.story3.create({
        data: {
          plan3Id: plan3.id,
          title: `The ${student.interests.split(',')[0]} Adventure`,
          themes: [student.interests.split(',')[0], 'friendship', 'adventure'],
          part1: `Once upon a time, ${student.name} discovered a magical ${student.interests.split(',')[0]} that would change everything. It was a bright morning when the adventure began, and little did ${student.name} know what was waiting just around the corner.`,
          part2: `As the story continued, ${student.name} learned that true friendship is the greatest treasure of all. Through challenges and discoveries, the journey became more exciting with each passing moment.`,
          part3: `In the end, ${student.name} realized that the real magic wasn't in the ${student.interests.split(',')[0]} at all, but in the friendships made along the way. The adventure had taught valuable lessons about courage, kindness, and believing in yourself.`
        }
      });

      console.log(`  ✅ Created Story3 (ID: ${story.id})`);

      // Create the 3 days
      for (let i = 1; i <= 3; i++) {
        const day = await prisma.plan3Day.create({
          data: {
            plan3Id: plan3.id,
            index: i,
            state: i === 1 ? 'available' : 'locked'
          }
        });

        console.log(`  ✅ Created Day ${i} (ID: ${day.id})`);
      }
    }

    console.log('🎉 Plan3 seeding completed successfully!');
    
    // Print summary
    const totalPlan3s = await prisma.plan3.count();
    console.log(`📊 Total Plan3s in database: ${totalPlan3s}`);
    
    const activePlan3s = await prisma.plan3.count({
      where: { status: 'active' }
    });
    console.log(`✅ Active Plan3s: ${activePlan3s}`);

  } catch (error) {
    console.error('❌ Error seeding Plan3s:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedPlan3s()
  .then(() => {
    console.log('✅ Plan3 seeder completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Plan3 seeder failed:', error);
    process.exit(1);
  });
