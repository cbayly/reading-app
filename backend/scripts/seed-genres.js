import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Genre word lists from PRD
const genreWords = [
  // List A - Setting/Style/Time Words
  { word: 'Modern', listType: 'A', minAge: 6, maxAge: 18 },
  { word: 'Historical', listType: 'A', minAge: 8, maxAge: 18 },
  { word: 'Futuristic', listType: 'A', minAge: 7, maxAge: 18 },
  { word: 'Mythical', listType: 'A', minAge: 6, maxAge: 18 },
  { word: 'Supernatural', listType: 'A', minAge: 8, maxAge: 18 },
  { word: 'Whimsical', listType: 'A', minAge: 5, maxAge: 18 },
  { word: 'Dark', listType: 'A', minAge: 10, maxAge: 18 },
  { word: 'Lighthearted', listType: 'A', minAge: 5, maxAge: 18 },
  { word: 'Epic', listType: 'A', minAge: 8, maxAge: 18 },
  { word: 'Urban', listType: 'A', minAge: 6, maxAge: 18 },
  { word: 'Rural', listType: 'A', minAge: 6, maxAge: 18 },
  { word: 'Steampunk', listType: 'A', minAge: 10, maxAge: 18 },
  { word: 'Cyberpunk', listType: 'A', minAge: 12, maxAge: 18 },
  { word: 'Magical', listType: 'A', minAge: 6, maxAge: 18 },
  { word: 'Ancient', listType: 'A', minAge: 7, maxAge: 18 },
  { word: 'Parallel', listType: 'A', minAge: 10, maxAge: 18 },
  { word: 'Cosmic', listType: 'A', minAge: 9, maxAge: 18 },
  { word: 'Post-apocalyptic', listType: 'A', minAge: 12, maxAge: 18 },
  { word: 'Contemporary', listType: 'A', minAge: 6, maxAge: 18 },
  { word: 'Timeless', listType: 'A', minAge: 6, maxAge: 18 },

  // List B - Core Genre/Theme Words
  { word: 'Detective', listType: 'B', minAge: 8, maxAge: 18 },
  { word: 'Adventure', listType: 'B', minAge: 5, maxAge: 18 },
  { word: 'Mystery', listType: 'B', minAge: 7, maxAge: 18 },
  { word: 'Fantasy', listType: 'B', minAge: 6, maxAge: 18 },
  { word: 'Comedy', listType: 'B', minAge: 5, maxAge: 18 },
  { word: 'Survival', listType: 'B', minAge: 8, maxAge: 18 },
  { word: 'Romance', listType: 'B', minAge: 12, maxAge: 18 },
  { word: 'Horror', listType: 'B', minAge: 12, maxAge: 18 },
  { word: 'Quest', listType: 'B', minAge: 6, maxAge: 18 },
  { word: 'Legend', listType: 'B', minAge: 7, maxAge: 18 },
  { word: 'Thriller', listType: 'B', minAge: 10, maxAge: 18 },
  { word: 'Journey', listType: 'B', minAge: 6, maxAge: 18 },
  { word: 'Fable', listType: 'B', minAge: 5, maxAge: 18 },
  { word: 'Heist', listType: 'B', minAge: 10, maxAge: 18 },
  { word: 'Sports', listType: 'B', minAge: 6, maxAge: 18 },
  { word: 'Western', listType: 'B', minAge: 8, maxAge: 18 },
  { word: 'Exploration', listType: 'B', minAge: 6, maxAge: 18 },
  { word: 'Battle', listType: 'B', minAge: 8, maxAge: 18 },
  { word: 'Coming-of-age', listType: 'B', minAge: 10, maxAge: 18 },
  { word: 'Challenge', listType: 'B', minAge: 6, maxAge: 18 }
];

async function seedGenres() {
  try {
    console.log('🌱 Starting genre words seeding...');

    // Clear existing genre words
    await prisma.genreWord.deleteMany();
    console.log('🗑️  Cleared existing genre words');

    // Insert new genre words
    const createdGenres = await prisma.genreWord.createMany({
      data: genreWords
    });

    console.log(`✅ Successfully seeded ${createdGenres.count} genre words`);

    // Verify the seeding
    const listACount = await prisma.genreWord.count({
      where: { listType: 'A' }
    });
    const listBCount = await prisma.genreWord.count({
      where: { listType: 'B' }
    });

    console.log(`📊 Verification:`);
    console.log(`   - List A (Setting/Style/Time): ${listACount} words`);
    console.log(`   - List B (Genre/Theme): ${listBCount} words`);

    // Show some examples
    const sampleListA = await prisma.genreWord.findMany({
      where: { listType: 'A' },
      take: 5,
      select: { word: true }
    });
    const sampleListB = await prisma.genreWord.findMany({
      where: { listType: 'B' },
      take: 5,
      select: { word: true }
    });

    console.log(`📝 Sample List A words: ${sampleListA.map(g => g.word).join(', ')}`);
    console.log(`📝 Sample List B words: ${sampleListB.map(g => g.word).join(', ')}`);

  } catch (error) {
    console.error('❌ Error seeding genre words:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function only if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  seedGenres()
    .then(() => {
      console.log('🎉 Genre seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Genre seeding failed:', error);
      process.exit(1);
    });
}

export { seedGenres };
