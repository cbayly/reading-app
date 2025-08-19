## Relevant Files

- `backend/prisma/schema.prisma` - Database schema modifications for genre words and tracking tables
- `backend/prisma/migrations/` - New migration files for genre-related tables
- `backend/lib/openai.js` - Core story generation functions that need genre integration
- `backend/lib/genreSelector.js` - New utility for genre selection logic and filtering
- `backend/lib/genreSelector.test.js` - Unit tests for genre selection functionality
- `backend/routes/plans.js` - Weekly plan generation routes that use story generation
- `backend/scripts/seed-genres.js` - Script to populate initial genre word lists
- `backend/integration/genre-mashup.integration.test.js` - Integration tests for end-to-end genre functionality

### Notes

- The existing `generateStory()` function in `backend/lib/openai.js` will be the main integration point
- Current system uses `selectRandomInterest()` which will be enhanced with genre selection
- Database uses SQLite with Prisma ORM following existing patterns
- Story generation already includes interest themes in `WeeklyPlan.interestTheme` field

## Tasks

### 1.0 Design and implement database schema for genre system ✅

- [x] 1.1 Add genre_words table to Prisma schema with columns: id, word, list_type (A or B), min_age, max_age, active
- [x] 1.2 Add genre_combination field to WeeklyPlan table to track used combinations
- [x] 1.3 Create student_genre_history table to track recent combinations per student
- [x] 1.4 Generate and run Prisma migration for new schema changes
- [x] 1.5 Create seed script to populate initial genre word lists (List A and List B)
- [x] 1.6 Run seed script to populate database with genre words
- [x] 1.7 Add unit tests for database schema and seed functionality

### 2.0 Create genre selection and filtering logic ✅

- [x] 2.1 Create genreSelector.js utility module with core selection functions
- [x] 2.2 Implement selectRandomGenreCombination() function that picks from both lists
- [x] 2.3 Add age-appropriate filtering logic based on student grade level
- [x] 2.4 Implement avoidRecentCombinations() to prevent immediate repetition
- [x] 2.5 Add fallback logic for when all combinations have been recently used
- [x] 2.6 Create comprehensive unit tests for genreSelector.js
- [x] 2.7 Add integration tests for genre selection with database

### 3.0 Integrate genre mash-up with existing story generation

- [ ] 3.1 Modify generateStory() function to accept genre combination parameter
- [ ] 3.2 Update story generation prompts to include genre instructions
- [ ] 3.3 Integrate genre selection into weekly plan generation workflow
- [ ] 3.4 Update story generation to pass genre context to OpenAI
- [ ] 3.5 Add genre combination to story metadata and logging
- [ ] 3.6 Test story generation with various genre combinations
- [ ] 3.7 Verify story quality and age-appropriateness with genre integration

### 4.0 Implement genre tracking and history management

- [ ] 4.1 Create functions to record genre combinations in student_genre_history
- [ ] 4.2 Implement cleanup logic to remove old history entries (older than 15 stories)
- [ ] 4.3 Add genre combination tracking to WeeklyPlan creation process
- [ ] 4.4 Create API endpoint to retrieve student's genre history for analytics
- [ ] 4.5 Add database indexes for efficient genre history queries
- [ ] 4.6 Test genre tracking with multiple students and story generations
- [ ] 4.7 Add error handling for genre tracking failures

### 5.0 Add analytics and monitoring for genre variety

- [ ] 5.1 Create analytics functions to calculate genre variety scores per student
- [ ] 5.2 Implement monitoring for story completion rates by genre combination
- [ ] 5.3 Add logging for genre selection decisions and outcomes
- [ ] 5.4 Create admin dashboard endpoints for genre analytics
- [ ] 5.5 Add metrics tracking for genre system performance
- [ ] 5.6 Test analytics with sample data and verify calculations
- [ ] 5.7 Document analytics API endpoints and data formats

### 6.0 Final integration and testing

- [ ] 6.1 Run full test suite to ensure no regressions
- [ ] 6.2 Test end-to-end workflow from assessment to weekly plan generation
- [ ] 6.3 Verify genre system works with existing student data
- [ ] 6.4 Test edge cases (new students, students with many stories, etc.)
- [ ] 6.5 Performance testing to ensure genre selection doesn't slow down story generation
- [ ] 6.6 Update documentation for new genre system
- [ ] 6.7 Create deployment checklist for genre mashup feature
