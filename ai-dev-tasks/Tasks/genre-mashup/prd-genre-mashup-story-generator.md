# Product Requirements Document: Genre Mash-Up Story Generator

## Introduction/Overview

The Genre Mash-Up Story Generator is a feature that dynamically combines descriptive words from two curated lists to create unique story types for the reading app. This feature addresses the problem of repetitive story formats by ensuring students experience a wide variety of narrative styles (e.g., "Futuristic Detective", "Whimsical Quest", "Ancient Mystery") instead of encountering the same story patterns repeatedly.

The system will enhance the current interest-based story generation by adding an additional layer of genre diversity, creating more engaging and varied reading experiences for students across all grade levels.

## Goals

1. **Increase Story Variety**: Generate unique story combinations to prevent repetitive narrative formats
2. **Maintain Student Engagement**: Keep students interested through diverse storytelling approaches
3. **Preserve Age Appropriateness**: Ensure all genre combinations remain suitable for the target age group
4. **Seamless Integration**: Add genre variety without disrupting the current story generation workflow
5. **Track Story Completion**: Monitor completion rates to validate improved engagement

## User Stories

**As a student**, I want to experience different types of stories so that I don't get bored with repetitive formats.

**As a parent**, I want my child to be exposed to various literary genres so that they develop a broader appreciation for different storytelling styles.

**As a reading app**, I want to generate diverse story combinations so that students remain engaged with the content over time.

**As a content generator**, I want to combine student interests with varied genres so that stories feel both personalized and fresh.

## Functional Requirements

### Core Genre Selection Logic

1. The system must maintain two separate word lists:
   - **List A (Setting/Style/Time)**: 20 descriptive words including Modern, Historical, Futuristic, Mythical, Supernatural, Whimsical, Dark, Lighthearted, Epic, Urban, Rural, Steampunk, Cyberpunk, Magical, Ancient, Parallel, Cosmic, Post-apocalyptic, Contemporary, Timeless
   - **List B (Genre/Theme)**: 20 core genre words including Detective, Adventure, Mystery, Fantasy, Comedy, Survival, Romance, Horror, Quest, Legend, Thriller, Journey, Fable, Heist, Sports, Western, Exploration, Battle, Coming-of-age, Challenge

2. The system must use smart selection logic that avoids recent combinations for the same student to ensure variety over time.

3. The system must filter age-inappropriate combinations automatically (e.g., "Dark Horror" for younger students) based on student age and grade level.

4. The system must integrate genre mash-up as an additional layer on top of the existing interest-based selection, not replacing it.

### Story Generation Integration

5. The system must modify the existing OpenAI story generation prompts to include both the selected interest AND the genre mash-up combination.

6. The system must pass the genre combination to the AI with clear instructions on tone, style, and content appropriateness.

7. The system must maintain all existing story generation quality controls (word count, dialogue requirements, etc.).

### Data Storage and Tracking

8. The system must store genre word lists in the database for easy updates and maintenance.

9. The system must track which genre combinations each student has experienced to prevent immediate repetition.

10. The system must log genre selections for analytics and story completion rate analysis.

### User Experience

11. The system must operate completely automatically - users never see the genre selection process directly.

12. The system must generate genre combinations transparently without requiring user input or configuration.

13. The system must maintain the same story generation speed and reliability as the current system.

## Non-Goals (Out of Scope)

- User control over genre selection (students/parents cannot manually pick genres)
- Genre preference learning (system will not adapt based on completion rates)
- Custom genre creation by users
- Genre-based story filtering or search functionality
- Displaying genre combinations to users in the UI
- Genre-specific story templates or pre-written content

## Technical Considerations

### Database Schema Changes
- Create `genre_words` table with columns: `id`, `word`, `list_type` (A or B), `min_age`, `max_age`, `active`
- Add `genre_combination` field to existing story/plan tables to track what was used
- Create `student_genre_history` table to track recent combinations per student

### Integration Points
- Modify `generateStory()` function in `backend/lib/openai.js` to include genre selection
- Update story generation prompts to incorporate genre instructions
- Add genre filtering logic based on student age/grade level

### Performance Considerations
- Genre selection should add minimal overhead to story generation
- Database queries for genre history should be optimized
- Consider caching recent combinations per student

## Success Metrics

### Primary Metrics
- **Story Completion Rate**: Target 15% increase in story completion rates within 3 months of deployment
- **Session Duration**: Measure average time spent reading stories before and after implementation

### Secondary Metrics
- **Genre Variety Score**: Track number of unique genre combinations experienced per student over time
- **Story Generation Success Rate**: Ensure genre additions don't negatively impact story generation reliability
- **User Retention**: Monitor if increased variety impacts overall app usage patterns

## Open Questions

1. **Age Filtering Specifics**: What specific genre combinations should be filtered for different age groups? (e.g., should "Dark" be completely excluded for grades K-2?)

2. **Combination Frequency**: How many stories should a student read before they can encounter the same genre combination again? (suggested: 10-15 stories)

3. **Fallback Behavior**: What should happen if the smart selection algorithm can't find a "new" combination for a student who has experienced many stories?

4. **Analytics Dashboard**: Should there be admin visibility into genre distribution and student variety metrics?

5. **A/B Testing**: Should this feature be rolled out with A/B testing to measure impact on engagement metrics?

6. **List Updates**: What process should be established for adding/removing words from the genre lists over time?

---

**Target Implementation Timeline**: 2-3 weeks
**Primary Developer Audience**: Junior to mid-level developers
**Dependencies**: Existing story generation system, database access, OpenAI integration
