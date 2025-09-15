# GenericSplitLayout Component

A reusable layout component that provides a consistent reading and activity interface with three view modes: Reading, Split, and Activities.

## Features

- **Three View Modes**: Reading (full-width reading), Split (side-by-side), Activities (full-width activities)
- **Resizable Split View**: Adjustable divider between reading and activity content
- **Loading States**: Built-in loading spinners for both reading and activity content
- **Print Support**: Configurable print functionality for reading and activity content
- **Responsive Design**: Mobile-friendly with automatic view switching
- **Keyboard Shortcuts**: R (Reading), S (Split), A (Activities)
- **Back Navigation**: Optional back button with custom handler
- **Progress Tracking**: Optional progress display

## Usage

### Basic Example

```tsx
import GenericSplitLayout from '@/components/layout/GenericSplitLayout';

function MyPage() {
  return (
    <GenericSplitLayout
      readingContent={<MyReadingComponent />}
      activityContent={<MyActivityComponent />}
      title="My Reading Plan"
      subtitle="Day 1"
    />
  );
}
```

### Advanced Example

```tsx
import GenericSplitLayout from '@/components/layout/GenericSplitLayout';

function AssessmentPage() {
  const [readingCompleted, setReadingCompleted] = useState(false);
  
  return (
    <GenericSplitLayout
      readingContent={
        <PassageReader
          passage={assessment.passage}
          onComplete={() => setReadingCompleted(true)}
          showCompleteButton={!readingCompleted}
        />
      }
      activityContent={
        <AssessmentQuestions
          questions={assessment.questions}
          readingCompleted={readingCompleted}
        />
      }
      title="Reading Assessment"
      subtitle={studentName}
      onBack={() => router.push('/dashboard')}
      defaultView={readingCompleted ? 'split' : 'reading'}
      printConfig={{
        readingPrintable: true,
        activitiesPrintable: false
      }}
      splitConfig={{
        defaultSplitValue: 0.6,
        minLeftWidth: 400,
        minRightWidth: 350,
        showDivider: true
      }}
      activityLoading={false}
      loadingMessage="Loading assessment..."
    />
  );
}
```

## Props

### Required Props

- `readingContent`: React.ReactNode - The content to display in the reading panel
- `activityContent`: React.ReactNode - The content to display in the activity panel
- `title`: string - The main title displayed in the header

### Optional Props

- `subtitle?: string` - Secondary title displayed next to the main title
- `onViewChange?: (view: LayoutMode) => void` - Callback when view mode changes
- `defaultView?: LayoutMode` - Initial view mode ('reading', 'split', 'activity')
- `showViewTabs?: boolean` - Whether to show the view mode selector (default: true)
- `isLoading?: boolean` - Global loading state
- `onBack?: () => void` - Back button handler
- `className?: string` - Additional CSS classes
- `printConfig?: { readingPrintable?: boolean; activitiesPrintable?: boolean }` - Print configuration
- `splitConfig?: { defaultSplitValue?: number; minLeftWidth?: number; minRightWidth?: number; showDivider?: boolean }` - Split view configuration
- `readingLoading?: boolean` - Loading state for reading content
- `activityLoading?: boolean` - Loading state for activity content
- `loadingMessage?: string` - Custom loading message

## View Modes

### Reading Mode
- Full-width display of reading content
- Ideal for focused reading without distractions
- Print-friendly when `printConfig.readingPrintable` is true

### Split Mode
- Side-by-side display of reading and activity content
- Resizable divider (when `splitConfig.showDivider` is true)
- Configurable minimum widths for both panels
- Print-friendly when both print configs are true

### Activity Mode
- Full-width display of activity content
- Ideal for focused work on activities
- Print-friendly when `printConfig.activitiesPrintable` is true

## Loading States

The component handles loading states gracefully:

- **Global Loading**: Disables view switching when `isLoading` is true
- **Reading Loading**: Shows spinner in reading panel when `readingLoading` is true
- **Activity Loading**: Shows spinner in activity panel when `activityLoading` is true
- **Auto-switching**: Automatically switches to reading view when activities are loading

## Print Support

Configure what content is printable:

```tsx
printConfig={{
  readingPrintable: true,    // Allow printing reading content
  activitiesPrintable: false // Don't allow printing activities
}}
```

## Split View Configuration

Customize the split view behavior:

```tsx
splitConfig={{
  defaultSplitValue: 0.6,    // 60% reading, 40% activities
  minLeftWidth: 400,         // Minimum reading panel width
  minRightWidth: 350,        // Minimum activity panel width
  showDivider: true          // Show resizable divider
}}
```

## Keyboard Shortcuts

- **R**: Switch to Reading view
- **S**: Switch to Split view (disabled on mobile or when loading)
- **A**: Switch to Activity view (disabled when loading)

## Mobile Behavior

- Split view is automatically hidden on mobile devices
- View switching is handled automatically
- Touch-friendly interface

## Examples

### Daily Reading Plan
```tsx
<GenericSplitLayout
  readingContent={<EnhancedReadingPane chapter={dayContent} />}
  activityContent={<EnhancedActivityPane activities={activities} />}
  title={plan.name}
  subtitle={`Day ${dayIndex}`}
  onBack={handleBackToPlan}
  activityLoading={activitiesLoading}
/>
```

### Reading Assessment
```tsx
<GenericSplitLayout
  readingContent={<PassageReader passage={assessment.passage} />}
  activityContent={<AssessmentQuestions questions={assessment.questions} />}
  title="Reading Assessment"
  subtitle={studentName}
  defaultView="reading"
  printConfig={{ readingPrintable: true, activitiesPrintable: false }}
/>
```

### Writing Exercise
```tsx
<GenericSplitLayout
  readingContent={<WritingPrompt prompt={prompt} />}
  activityContent={<WritingEditor onSave={handleSave} />}
  title="Writing Exercise"
  subtitle="Creative Writing"
  splitConfig={{ defaultSplitValue: 0.4, minLeftWidth: 300, minRightWidth: 500 }}
/>
```
