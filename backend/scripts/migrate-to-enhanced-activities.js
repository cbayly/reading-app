#!/usr/bin/env node

/**
 * Migration script to generate enhanced activity content for existing plans
 * This script will:
 * 1. Find all existing plans that don't have enhanced content
 * 2. Generate enhanced content for each plan's story
 * 3. Update the database with the new content
 * 4. Provide progress reporting and error handling
 */

const { PrismaClient } = require('@prisma/client');
const { generateEnhancedActivities } = require('../lib/enhancedActivityGeneration');

const prisma = new PrismaClient();

async function migrateToEnhancedActivities() {
  console.log('🚀 Starting migration to enhanced activities...\n');

  try {
    // Find all plans that don't have enhanced content
    const plansWithoutEnhancedContent = await prisma.plan3.findMany({
      where: {
        OR: [
          { enhancedContentGenerated: false },
          { enhancedContentGenerated: null }
        ]
      },
      include: {
        story: true,
        student: true
      }
    });

    console.log(`📊 Found ${plansWithoutEnhancedContent.length} plans to migrate\n`);

    if (plansWithoutEnhancedContent.length === 0) {
      console.log('✅ All plans already have enhanced content!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < plansWithoutEnhancedContent.length; i++) {
      const plan = plansWithoutEnhancedContent[i];
      console.log(`🔄 Processing plan ${i + 1}/${plansWithoutEnhancedContent.length}: ${plan.name} (ID: ${plan.id})`);

      try {
        // Generate enhanced content for the plan
        const enhancedContent = await generateEnhancedActivities({
          storyTitle: plan.story.title,
          storyParts: [plan.story.part1, plan.story.part2, plan.story.part3],
          themes: plan.story.themes,
          gradeLevel: plan.student.gradeLevel,
          interests: plan.student.interests
        });

        // Save enhanced content to database
        await prisma.activityContent.upsert({
          where: {
            planId_dayIndex: {
              planId: plan.id,
              dayIndex: 1
            }
          },
          update: {
            content: enhancedContent,
            updatedAt: new Date()
          },
          create: {
            planId: plan.id,
            dayIndex: 1,
            content: enhancedContent,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Mark plan as having enhanced content
        await prisma.plan3.update({
          where: { id: plan.id },
          data: {
            enhancedContentGenerated: true,
            updatedAt: new Date()
          }
        });

        successCount++;
        console.log(`✅ Successfully migrated plan: ${plan.name}`);
      } catch (error) {
        errorCount++;
        const errorInfo = {
          planId: plan.id,
          planName: plan.name,
          error: error.message
        };
        errors.push(errorInfo);
        console.error(`❌ Failed to migrate plan ${plan.name}:`, error.message);
      }

      // Add a small delay to avoid overwhelming the AI service
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Print summary
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} plans`);
    console.log(`❌ Failed to migrate: ${errorCount} plans`);
    console.log(`📊 Total processed: ${plansWithoutEnhancedContent.length} plans`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. Plan: ${error.planName} (ID: ${error.planId})`);
        console.log(`   Error: ${error.error}`);
      });
    }

    // Update database schema if needed
    await updateDatabaseSchema();

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function updateDatabaseSchema() {
  console.log('\n🔧 Updating database schema...');

  try {
    // Add enhancedContentGenerated column if it doesn't exist
    await prisma.$executeRaw`
      ALTER TABLE "Plan3" 
      ADD COLUMN IF NOT EXISTS "enhancedContentGenerated" BOOLEAN DEFAULT FALSE;
    `;

    console.log('✅ Database schema updated successfully');
  } catch (error) {
    console.error('❌ Failed to update database schema:', error.message);
  }
}

async function rollbackMigration() {
  console.log('🔄 Rolling back migration...');

  try {
    // Remove enhanced content
    await prisma.activityContent.deleteMany({});
    
    // Reset enhanced content flag
    await prisma.plan3.updateMany({
      data: {
        enhancedContentGenerated: false
      }
    });

    console.log('✅ Rollback completed successfully');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// CLI argument handling
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'migrate':
    migrateToEnhancedActivities();
    break;
  case 'rollback':
    rollbackMigration();
    break;
  default:
    console.log('Usage:');
    console.log('  node migrate-to-enhanced-activities.js migrate  - Run migration');
    console.log('  node migrate-to-enhanced-activities.js rollback - Rollback migration');
    process.exit(1);
}
