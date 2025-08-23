# Product Requirements Document: 3-Day Reading Plan Refactor

## Introduction/Overview

This feature refactors the current 5-day reading plan into a streamlined 3-day plan aligned with 3-chapter stories. Each day provides a dedicated Reading Passage area and Activity area with user-controlled layout modes (Full Reading, Split, Full Activity). The goal is to create a more focused, manageable reading experience that maintains engagement while reducing cognitive load through better content organization and flexible viewing options.

## Goals

1. **Simplify Learning Cadence**: Reduce plan duration from 5 days to 3 days for better completion rates
2. **Improve Content Alignment**: Create 1:1 mapping between days and story chapters for clearer progression
3. **Enhance User Control**: Provide flexible layout modes (Reading, Split, Activity) to accommodate different learning preferences
4. **Maintain Engagement**: Preserve interactive activities while streamlining the experience
5. **Ensure Accessibility**: Support keyboard navigation and screen readers across all layout modes

## User Stories

1. **As a student**, I want to read one chapter per day so that I can focus on smaller, manageable content chunks without feeling overwhelmed.

2. **As a student**, I want to switch between reading-focused and activity-focused views so that I can concentrate on one task at a time or see both simultaneously.

3. **As a student**, I want to drag character names to match descriptions so that I can actively engage with character identification in a fun, interactive way.

4. **As a student**, I want to reorder story events by dragging cards so that I can demonstrate my understanding of sequence in an intuitive way.

5. **As a parent**, I want my child to complete reading plans more consistently so that their reading skills improve steadily.

6. **As a student**, I want my layout preferences to be remembered so that I don't have to reconfigure my preferred view each time.

## Functional Requirements

### Core Plan Structure
1. The system must create exactly 3 days per plan, mapped 1:1 to story chapters
2. Each day must correspond to one chapter (Day 1 → Chapter 1, Day 2 → Chapter 2, Day 3 → Chapter 3)
3. Stories must be AI-generated with 3 chapters, each 350-500 words in length
4. The system must archive existing 5-day plans and start fresh with 3-day plans for all new plans

### Layout System
5. Each day page must support three layout modes: Full Reading, Split, and Full Activity
6. The default layout mode must be Split view
7. Users must be able to switch between layout modes using a segmented control
8. Split mode must include a resizable divider between Reading and Activity panes
9. Layout preferences must persist per device using localStorage with key format: `rb-v2:plan3:<planId>:day:<index>:ui`
10. The system must remember divider position with default at 55% for reading pane

### Reading Experience
11. Reading pane must display chapter content with proper headings and paragraph structure
12. Each paragraph must have a unique anchor ID for jump-to-context functionality
13. The system must support scrolling to specific paragraphs and briefly highlighting them
14. Reading pane must be hidden in Full Activity mode and maximized in Full Reading mode

### Activity System
15. Each day must include exactly 5 activities: Who, Where, Sequence, Main Idea, Predict
16. **Who Activity**: Interactive drag-and-drop matching character names to description boxes
17. **Where Activity**: Text input field for location identification
18. **Sequence Activity**: Drag-and-drop pre-written event cards to establish correct order
19. **Main Idea Activity**: Text input field for central theme identification
20. **Predict Activity**: Text input field for next chapter predictions

### Validation & Completion
21. Activity responses must use simple keyword matching for validation
22. A day is complete when all 5 activities have any response AND student clicks "Mark Complete"
23. Plan completion must show a summary/celebration page
24. After plan completion, the system must automatically generate a new plan

### Mobile Experience
25. Mobile layout must focus on simplified single-pane experience with tab navigation
26. Mobile interface must optimize for touch with larger tap targets
27. Mobile must support both portrait and landscape orientations

### Data Persistence
28. All activity responses must auto-save with 400ms debounce
29. The system must show subtle "Saved" indicator after successful saves
30. Activity answers must be stored in JSON format per day: `{who: string[], where: string, sequence: string[], mainIdea: string, predict: string}`

## Non-Goals (Out of Scope)

1. **Text-to-Speech (TTS)**: Audio reading features are not included in this version
2. **Definition Lookups**: Vocabulary definition features are excluded
3. **Teacher Dashboard**: Educator oversight tools are not part of this refactor
4. **Advanced Analytics**: Detailed learning analytics beyond basic completion tracking
5. **Collaborative Features**: Multi-student or parent-child collaboration tools
6. **Offline Mode**: Functionality without internet connection
7. **Migration Tools**: Converting existing 5-day plans to 3-day format

## Design Considerations

### Layout Components
- **LayoutBar**: Segmented control with Reading | Split | Activity options, plus progress indicator
- **ReadingPane**: Chapter content with anchor highlighting and scroll-to functionality
- **ActivityPane**: Stepper interface with 5 sequential activities
- **ResizableSplit**: Draggable divider component with minimum width constraints

### Visual Design
- Use existing Tailwind CSS classes and shadcn/ui components
- Maintain current color scheme and typography
- Ensure 44px minimum touch targets for mobile
- Implement subtle animations for layout transitions and highlighting

### Accessibility
- Segmented control implemented as radiogroup with proper ARIA labels
- All interactive elements keyboard accessible
- Screen reader announcements for activity completion and layout changes
- High contrast support for text and interactive elements

## Technical Considerations

### Database Schema
```typescript
model Plan3 {
  id          String   @id @default(cuid())
  studentId   String
  storyId     String
  days        Plan3Day[]
  createdAt   DateTime @default(now())
}

model Plan3Day {
  id        String   @id @default(cuid())
  plan3Id   String   @index
  index     Int      // 1..3
  chapterId String
  answers   Json?    // Activity responses
}
```

### API Endpoints
- `POST /api/plan3` - Create new 3-day plan
- `GET /api/plan3/:planId` - Get plan summary
- `GET /api/plan3/:planId/day/:index` - Get day details with chapter and activities
- `POST /api/plan3/:planId/day/:index/answers` - Save activity responses

### State Management
- Use React hooks for local component state
- Implement `useReadingUiPrefs` hook for layout persistence
- Debounced auto-save hook for activity responses

### Performance
- Lazy load chapter content to improve initial page load
- Implement proper React key props for drag-and-drop lists
- Use React.memo for expensive components like ResizableSplit

## Success Metrics

1. **Completion Rate**: Increase plan completion rate by 25% compared to 5-day plans
2. **Engagement Time**: Maintain or increase average time spent per day (target: 15-20 minutes)
3. **Layout Usage**: Track layout mode preferences to validate user control value
4. **Activity Completion**: Achieve 90%+ completion rate for individual activities
5. **User Satisfaction**: Positive feedback on simplified experience through user testing

## Open Questions

1. **Activity Difficulty Scaling**: Should activity complexity increase from Day 1 to Day 3, or remain consistent?
2. **Progress Visualization**: Beyond percentage, should we show chapter-based progress indicators?
3. **Keyboard Shortcuts**: Are keyboard shortcuts (r/s/a for layout modes) necessary for the target age group?
4. **Error Handling**: How should the system handle cases where AI story generation fails?
5. **Content Moderation**: What safeguards ensure AI-generated stories are age-appropriate?
6. **Performance Thresholds**: What are acceptable load times for chapter content and layout switching?

## Implementation Priority

### Phase 1 (Core Functionality)
- Database schema and API endpoints
- Basic layout system with three modes
- Reading pane with chapter display
- Simple activity components (text inputs)

### Phase 2 (Interactive Features)
- Drag-and-drop functionality for Who and Sequence activities
- Jump-to-context with highlighting
- Auto-save and progress indicators

### Phase 3 (Polish & Optimization)
- Mobile responsive design
- Keyboard shortcuts and accessibility
- Performance optimizations
- Error handling and edge cases
