import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyCleanup() {
  try {
    console.log('🔍 Verifying student cleanup...');
    
    // Get remaining students
    const remainingStudents = await prisma.student.findMany({
      include: {
        parent: true,
        plans: true,
        plan3s: true,
        assessments: true
      }
    });
    
    console.log(`📋 Remaining students (${remainingStudents.length}):`);
    remainingStudents.forEach(student => {
      console.log(`\n👤 ${student.name} (ID: ${student.id})`);
      console.log(`   Parent: ${student.parent.name}`);
      console.log(`   Plans: ${student.plans.length}`);
      console.log(`   Plan3s: ${student.plan3s.length}`);
      console.log(`   Assessments: ${student.assessments.length}`);
    });
    
    // Verify we have exactly Angela and Ryan
    const expectedNames = ['Angela Martin', 'Ryan Howard'];
    const actualNames = remainingStudents.map(s => s.name);
    
    console.log('\n✅ Verification Results:');
    console.log(`   Expected: ${expectedNames.join(', ')}`);
    console.log(`   Actual: ${actualNames.join(', ')}`);
    
    if (remainingStudents.length === 2 && 
        actualNames.includes('Angela Martin') && 
        actualNames.includes('Ryan Howard')) {
      console.log('   ✅ SUCCESS: Cleanup completed correctly!');
    } else {
      console.log('   ❌ ERROR: Cleanup did not complete as expected!');
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCleanup();
