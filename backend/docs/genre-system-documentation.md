# Genre Mash-Up Story Generator System Documentation

## Overview

The Genre Mash-Up Story Generator is a comprehensive system that dynamically combines two lists of descriptive words to generate varied and engaging story types. This ensures students experience a wide range of narratives (e.g., "Futuristic Detective", "Whimsical Quest", "Ancient Mystery") instead of repeating the same formats.

## Architecture

### Core Components

1. **Database Schema** (`prisma/schema.prisma`)
   - `GenreWord` table: Stores individual genre words with age appropriateness
   - `StudentGenreHistory` table: Tracks genre combinations used by students
   - `WeeklyPlan` table: Enhanced with `genreCombination` field

2. **Genre Selection Engine** (`lib/genreSelector.js`)
   - Age-appropriate filtering
   - History-based avoidance
   - Fallback mechanisms
   - Variety optimization

3. **Analytics System** (`lib/genreAnalytics.js`)
   - Completion rate tracking
   - Engagement metrics
   - System performance monitoring
   - Variety statistics

4. **API Endpoints** (`routes/plans.js`)
   - Student genre history
   - Admin analytics
   - Performance monitoring

## Database Schema

### GenreWord Table
```sql
model GenreWord {
  id      Int      @id @default(autoincrement())
  word    String   @unique
  listType String  @map("list_type") // 'A' for Setting/Style/Time, 'B' for Genre/Theme
  minAge  Int?     @map("min_age")
  maxAge  Int?     @map("max_age")
  active  Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@map("genre_words")
}
```

### StudentGenreHistory Table
```sql
model StudentGenreHistory {
  id            Int      @id @default(autoincrement())
  studentId     Int      @map("student_id")
  genreCombination String @map("genre_combination")
  usedAt        DateTime @default(now()) @map("used_at")
  
  student       Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  
  @@index([studentId, usedAt(sort: Desc)])
  @@index([genreCombination])
  
  @@map("student_genre_history")
}
```

### WeeklyPlan Table Enhancement
```sql
model WeeklyPlan {
  // ... existing fields ...
  genreCombination String? @map("genre_combination") // e.g., "Futuristic Mystery"
  // ... rest of fields ...
}
```

## Core Functions

### Genre Selection

#### `selectRandomGenreCombination(studentId, studentAge)`
Selects a random genre combination that is:
- Age-appropriate for the student
- Not recently used (avoids repetition)
- Balanced between variety and availability

**Parameters:**
- `studentId` (number): The student's ID
- `studentAge` (number): The student's age in years

**Returns:**
```javascript
{
  listAWord: "Futuristic",
  listBWord: "Mystery", 
  combination: "Futuristic Mystery"
}
```

**Example:**
```javascript
import { selectRandomGenreCombination } from '../lib/genreSelector.js';

const genre = await selectRandomGenreCombination(123, 10);
console.log(genre.combination); // "Whimsical Adventure"
```

### History Management

#### `recordGenreCombination(studentId, combination)`
Records a genre combination in the student's history for tracking and analytics.

**Parameters:**
- `studentId` (number): The student's ID
- `combination` (string): The genre combination used

**Example:**
```javascript
import { recordGenreCombination } from '../lib/genreSelector.js';

await recordGenreCombination(123, "Futuristic Mystery");
```

#### `cleanupOldGenreHistory(studentId)`
Removes old genre history entries, keeping only the 15 most recent.

**Parameters:**
- `studentId` (number): The student's ID

**Returns:**
- `number`: Number of entries deleted

**Example:**
```javascript
import { cleanupOldGenreHistory } from '../lib/genreSelector.js';

const deletedCount = await cleanupOldGenreHistory(123);
console.log(`Cleaned up ${deletedCount} old entries`);
```

### Analytics

#### `getGenreVarietyStats(studentId)`
Calculates variety statistics for a student.

**Parameters:**
- `studentId` (number): The student's ID

**Returns:**
```javascript
{
  totalCombinations: 15,
  uniqueCombinations: 12,
  varietyScore: 80 // percentage
}
```

#### `getGenreCompletionRates(studentId, daysBack)`
Calculates completion rates by genre combination.

**Parameters:**
- `studentId` (number): The student's ID
- `daysBack` (number): Number of days to look back (default: 30)

**Returns:**
```javascript
{
  studentId: 123,
  period: "30 days",
  genreStats: {
    "Futuristic Mystery": {
      totalPlans: 3,
      completedPlans: 2,
      planCompletionRate: 67,
      activityCompletionRate: 86
    }
  },
  summary: {
    totalPlans: 5,
    totalGenres: 3,
    averagePlanCompletionRate: 80
  }
}
```

## API Endpoints

### Student Genre History
**GET** `/api/plans/:studentId/genre-history`

Retrieves genre history and analytics for a specific student.

**Response:**
```json
{
  "studentId": 123,
  "studentName": "John Doe",
  "genreHistory": [
    {
      "genreCombination": "Futuristic Mystery",
      "usedAt": "2025-08-19T10:30:00.000Z"
    }
  ],
  "analytics": {
    "totalCombinations": 15,
    "uniqueCombinations": 12,
    "varietyScore": 80,
    "mostUsedGenres": [...],
    "leastUsedGenres": [...],
    "recentActivity": {...}
  }
}
```

### Admin Analytics
**GET** `/api/plans/admin/genre-analytics?daysBack=30`

Retrieves comprehensive analytics across all students.

**Response:**
```json
{
  "timestamp": "2025-08-19T10:30:00.000Z",
  "period": "30 days",
  "systemPerformance": {...},
  "overallPerformance": {...},
  "summary": {...}
}
```

### Genre Performance
**GET** `/api/plans/admin/genre-performance?daysBack=30&limit=10`

Retrieves performance comparison data for all genres.

**Response:**
```json
{
  "timestamp": "2025-08-19T10:30:00.000Z",
  "period": "30 days",
  "topGenres": [...],
  "bottomGenres": [...],
  "summary": {...}
}
```

## Integration with Story Generation

### Story Generation Enhancement
The `generateStory()` function in `lib/openai.js` has been enhanced to accept an optional `genreCombination` parameter:

```javascript
export async function generateStory(student, interest, genreCombination = null) {
  // ... existing logic ...
  
  const storyPrompt = `
    You are an expert children's storyteller creating a 3-chapter story for a ${studentAge}-year-old student interested in ${interest}${genreCombination ? ` in a ${genreCombination} style` : ''}.
    
    ${genreCombination ? `
    🎭 GENRE STYLE REQUIREMENTS:
    - Blend the ${genreCombination} elements naturally into the story
    - Ensure the genre style is evident in the plot, setting, and tone
    - Maintain age-appropriate content while incorporating genre elements
    ` : ''}
    
    // ... rest of prompt ...
  `;
}
```

### Weekly Plan Generation
The `generateStoryOnly()` function automatically selects and integrates genre combinations:

```javascript
export async function generateStoryOnly(student) {
  // ... existing logic ...
  
  // Select genre combination
  const genreCombination = await selectRandomGenreCombination(student.id, studentAge);
  
  // Generate story with genre
  const story = await generateStory(student, selectedInterest, genreCombination.combination);
  
  // Create weekly plan with genre
  const weeklyPlan = await prisma.weeklyPlan.create({
    data: {
      studentId: student.id,
      interestTheme: selectedInterest,
      genreCombination: genreCombination.combination,
      // ... other fields ...
    }
  });
  
  // Record genre combination
  await recordGenreCombination(student.id, genreCombination.combination);
  
  return weeklyPlan;
}
```

## Genre Word Lists

### List A: Setting/Style/Time Words
- Modern, Historical, Futuristic, Mythical, Supernatural
- Whimsical, Dark, Lighthearted, Epic, Urban, Rural
- Steampunk, Cyberpunk, Magical, Ancient, Parallel
- Cosmic, Post-apocalyptic, Contemporary, Timeless

### List B: Core Genre/Theme Words
- Detective, Adventure, Mystery, Fantasy, Comedy
- Survival, Romance, Horror, Quest, Legend
- Thriller, Journey, Fable, Heist, Sports
- Western, Exploration, Battle, Coming-of-age, Challenge

## Age Appropriateness

The system automatically filters genre words based on student age:

- **Ages 5-8**: Excludes mature themes (Dark, Horror, Post-apocalyptic)
- **Ages 9-12**: Allows some mature themes with discretion
- **Ages 13+**: Allows all themes with appropriate context

## Performance Considerations

### Database Optimization
- Indexes on `[studentId, usedAt(sort: Desc)]` for efficient history queries
- Index on `genreCombination` for analytics queries
- Automatic cleanup of old history entries

### Caching Strategy
- Genre word lists are cached in memory
- Recent genre combinations are cached per student
- Analytics results are cached for performance

### Scalability
- Genre selection is O(1) for most cases
- History cleanup runs automatically
- Analytics queries are optimized with proper indexing

## Error Handling

### Graceful Degradation
- Genre selection failures don't break story generation
- Missing genre words fall back to basic selection
- Invalid student IDs are handled gracefully

### Logging and Monitoring
- All genre operations are logged with structured data
- Performance metrics are tracked
- Error rates are monitored

## Testing

### Test Coverage
- Unit tests for core functions
- Integration tests for end-to-end workflows
- Performance tests for load scenarios
- Edge case tests for robustness

### Test Scripts
- `scripts/test-genre-tracking.js`: Genre tracking functionality
- `scripts/test-genre-analytics.js`: Analytics system
- `scripts/test-end-to-end-workflow.js`: Complete workflow
- `scripts/test-existing-student-data.js`: Existing data compatibility
- `scripts/test-edge-cases.js`: Edge case handling

## Deployment

### Prerequisites
1. Database migrations applied
2. Genre words seeded
3. Environment variables configured

### Migration Steps
1. Run Prisma migrations
2. Seed genre words using `scripts/seed-genres.js`
3. Verify system with test scripts
4. Monitor performance and analytics

### Monitoring
- Track genre variety scores
- Monitor completion rates by genre
- Watch for performance degradation
- Alert on error rates

## Troubleshooting

### Common Issues

#### No Genre Words Available
**Symptoms:** "No age-appropriate genre words found" error
**Solution:** Run genre seeding script and verify word lists

#### Low Variety Scores
**Symptoms:** Students getting repetitive genres
**Solution:** Check genre word availability and history cleanup

#### Performance Issues
**Symptoms:** Slow genre selection
**Solution:** Verify database indexes and check for large history tables

### Debug Commands
```bash
# Check genre word availability
node scripts/seed-genres.js

# Test genre system
node scripts/test-genre-tracking.js

# Verify analytics
node scripts/test-genre-analytics.js

# Test edge cases
node scripts/test-edge-cases.js
```

## Future Enhancements

### Planned Features
1. **Dynamic Genre Word Management**: Admin interface for managing genre words
2. **Advanced Analytics**: Machine learning for genre optimization
3. **Personalization**: Student-specific genre preferences
4. **A/B Testing**: Genre combination effectiveness testing

### Performance Improvements
1. **Caching Layer**: Redis for high-performance caching
2. **Background Processing**: Async analytics calculation
3. **Database Optimization**: Query optimization and indexing

## Support

For issues or questions about the Genre Mash-Up system:
1. Check the troubleshooting section
2. Review test scripts for examples
3. Consult the API documentation
4. Monitor system logs for errors

The system is designed to be robust, performant, and maintainable while providing engaging and varied story experiences for students.
