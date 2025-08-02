# PRD: Weekly Plan with On-Demand Daily Activities

## Introduction/Overview

The current Weekly Plan implementation generates all 7 days of activities upfront, resulting in inconsistent story quality and shorter-than-desired content that fails to engage young readers. This refactor will split the generation process into two phases: first generating a high-quality, engaging 3-chapter story, then generating daily activities on-demand as students progress through their weekly plan.

**Goal**: Improve story quality and engagement while providing a more dynamic, progressive learning experience through on-demand activity generation.

## Goals

1. **Improve Story Quality**: Generate longer, more engaging stories (350-400 words per chapter) with proper dialogue, character development, and narrative hooks that children want to read
2. **Implement Progressive Learning**: Generate activities dynamically as students complete each day, ensuring sequential progression
3. **Optimize Resource Usage**: Reduce upfront AI token consumption by deferring activity generation until needed
4. **Maintain Narrative Consistency**: Ensure all activities align with the pre-generated story content and themes
5. **Enable Caching**: Store generated content for reusability and performance optimization

## User Stories

### Student Stories
- **As a student**, I want to read engaging, longer stories so that I'm excited to continue with the weekly plan
- **As a student**, I want activities that build on each other so that my learning progresses naturally day by day
- **As a student**, I want to complete days in order so that the story and activities make sense together

### Parent Stories  
- **As a parent**, I want high-quality story content so that my child stays engaged with reading
- **As a parent**, I want to see my child's progress through the week so that I can track their learning journey
- **As a parent**, I want the system to automatically provide the next day's activity so that my child can continue without interruption

### System Stories
- **As the system**, I want to generate activities on-demand so that I can optimize resource usage and maintain quality
- **As the system**, I want to cache generated content so that I can provide fast responses and avoid redundant AI calls

## Functional Requirements

### Story Generation (Phase 1)
1. **FR-001**: The system must generate a complete 3-chapter story when a weekly plan is created
2. **FR-002**: Each chapter must contain 350-400 words with proper validation
3. **FR-003**: Each chapter must include dialogue, character development, and narrative progression
4. **FR-004**: The story must be themed around the student's selected interest
5. **FR-005**: Chapter summaries must be ≤25 words each
6. **FR-006**: The system must validate story quality before saving to database

### Activity Generation (Phase 2)
7. **FR-007**: Daily activities must be generated only after the previous day is marked complete
8. **FR-008**: Day 1 activity must be available for generation immediately after story creation
9. **FR-009**: Each activity must align with its corresponding story chapter content
10. **FR-010**: The system must prevent students from skipping ahead to future days
11. **FR-011**: Activities must increase in difficulty progressively from Day 1 to Day 7
12. **FR-012**: Generated activities must be validated for completeness and quality

### Data & Caching
13. **FR-013**: The system must cache both generated activities and the AI prompts used to create them
14. **FR-014**: Cached content must be retained for 6 months
15. **FR-015**: The system must store student responses for each completed activity
16. **FR-016**: Plans must track completion status for each day

### API Endpoints
17. **FR-017**: `POST /api/plans/generate` must create story and plan without activities
18. **FR-018**: `POST /api/plans/activity/generate` must generate activities for specific days on-demand
19. **FR-019**: `GET /api/plans/:studentId` must return plan with story and any existing activities
20. **FR-020**: `PUT /api/plans/activity/:activityId` must save student responses and mark activities complete

### Error Handling
21. **FR-021**: The system must implement 3-tier fallback for failed activity generation:
    - Retry with enhanced quality prompt
    - Use simplified fallback template
    - Display error with retry option
22. **FR-022**: Failed generations must not block student progress on other days
23. **FR-023**: The system must log generation failures for analysis

## Non-Goals (Out of Scope)

1. **PDF Generation**: Deferred to future release
2. **Cross-Day Adaptive Activities**: Performance-based difficulty adjustment across days (future enhancement)
3. **Activity Regeneration**: Parents cannot request activity regeneration in this version
4. **Activity Redo**: Students cannot repeat completed activities
5. **Backward Compatibility**: Existing test data migration not required

## Design Considerations

### Database Schema Updates
- Modify `WeeklyPlan` model to include `cachedPrompt` and `cachedOutput` JSON fields
- Add completion tracking to `DailyActivity` model
- Maintain existing relationships between plans, chapters, and activities

### UI/UX Changes
- **WeeklyPlanView**: Display full story upfront with chapter navigation
- **Daily Activity Cards**: Show "Generate Activity" button for uncompleted days
- **Progress Indicators**: Visual representation of completed vs. pending days
- **Sequential Flow**: Disable future day access until previous days complete

## Technical Considerations

### AI Generation Pipeline
- **Story Phase**: Enhanced prompts for longer, higher-quality content with validation
- **Activity Phase**: Context-aware generation using chapter content and student level
- **Validation**: Automated quality checks for word count, content requirements, and format

### Performance Optimization
- Cache AI responses at both story and activity levels
- Implement lazy loading for activity generation
- Use database indexing for efficient plan and activity retrieval

### Dependencies
- Existing OpenAI integration (`lib/openai.js`)
- Current Prisma schema and database setup
- Frontend components (`WeeklyPlanView`, activity cards)

## Success Metrics

1. **Story Quality**: 95% of generated stories meet 350-400 word requirement per chapter
2. **Student Engagement**: Increased time spent reading story content (tracked via activity completion time)
3. **Completion Rate**: 80% of students complete at least 5 days of their weekly plan
4. **Resource Efficiency**: 60% reduction in upfront AI token usage
5. **Performance**: Activity generation completes within 30 seconds of request
6. **Error Rate**: <5% activity generation failures requiring fallback

## Open Questions

1. **Activity Types**: Should we define specific activity types for each day (e.g., Day 1 = comprehension, Day 2 = vocabulary) or allow dynamic selection?
2. **Quality Metrics**: What specific criteria should be used to validate story and activity quality beyond word count?
3. **Student Analytics**: Should we track reading time, engagement metrics, or other behavioral data during story consumption?
4. **Prompt Evolution**: How should we handle improvements to AI prompts for existing cached content?
5. **Load Testing**: What are the expected concurrent user loads for activity generation?

## Implementation Priority

### Phase 1: Core Infrastructure
- Database schema updates
- Story generation with quality validation
- Basic on-demand activity generation

### Phase 2: UI/UX Enhancement  
- Updated WeeklyPlanView with story display
- Sequential day progression controls
- Activity generation triggers

### Phase 3: Optimization & Polish
- Advanced caching strategies
- Error handling and fallbacks
- Performance monitoring and analytics