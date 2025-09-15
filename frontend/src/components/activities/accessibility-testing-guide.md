# Enhanced Activities Accessibility Testing Guide

This guide provides comprehensive accessibility testing procedures for the enhanced activities system, including automated testing, manual testing, and user testing protocols.

## Table of Contents

1. [Overview](#overview)
2. [Automated Testing](#automated-testing)
3. [Manual Testing Checklist](#manual-testing-checklist)
4. [User Testing Protocols](#user-testing-protocols)
5. [Testing Tools](#testing-tools)
6. [Common Issues and Solutions](#common-issues-and-solutions)
7. [Reporting and Documentation](#reporting-and-documentation)

## Overview

The enhanced activities system must meet WCAG 2.1 AA standards and provide an inclusive experience for all users, including those with disabilities. This guide covers testing procedures for:

- **Screen Reader Compatibility**: Full compatibility with JAWS, NVDA, VoiceOver, and TalkBack
- **Keyboard Navigation**: Complete keyboard-only operation
- **Visual Accessibility**: Proper contrast ratios and visual indicators
- **Cognitive Accessibility**: Clear instructions and error messages
- **Motor Accessibility**: Touch targets and interaction patterns

## Automated Testing

### Jest-Axe Integration

The enhanced activities system includes automated accessibility testing using jest-axe:

```typescript
// Example test for EnhancedActivityPane
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import EnhancedActivityPane from './EnhancedActivityPane';

expect.extend(toHaveNoViolations);

describe('EnhancedActivityPane Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(
      <EnhancedActivityPane
        planId="test-plan"
        dayIndex={1}
        studentId="123"
        activities={mockActivities}
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading structure', () => {
    render(
      <EnhancedActivityPane
        planId="test-plan"
        dayIndex={1}
        studentId="123"
        activities={mockActivities}
      />
    );
    
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });
});
```

### Running Accessibility Tests

```bash
# Run all accessibility tests
npm test -- --testPathPattern=accessibility

# Run specific component accessibility tests
npm test -- --testPathPattern=EnhancedActivityPane.test.tsx

# Run with verbose output
npm test -- --testPathPattern=accessibility --verbose
```

### Continuous Integration

Accessibility tests are integrated into the CI/CD pipeline:

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Testing
on: [push, pull_request]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --testPathPattern=accessibility
      - run: npm run test:accessibility:manual
```

## Manual Testing Checklist

### Screen Reader Testing

#### JAWS (Windows)
- [ ] All interactive elements are announced correctly
- [ ] Form labels are properly associated
- [ ] Error messages are announced immediately
- [ ] Progress indicators are announced
- [ ] Navigation landmarks are properly identified
- [ ] Dynamic content changes are announced

#### NVDA (Windows)
- [ ] All interactive elements are announced correctly
- [ ] Form labels are properly associated
- [ ] Error messages are announced immediately
- [ ] Progress indicators are announced
- [ ] Navigation landmarks are properly identified
- [ ] Dynamic content changes are announced

#### VoiceOver (macOS/iOS)
- [ ] All interactive elements are announced correctly
- [ ] Form labels are properly associated
- [ ] Error messages are announced immediately
- [ ] Progress indicators are announced
- [ ] Navigation landmarks are properly identified
- [ ] Dynamic content changes are announced
- [ ] Touch gestures work correctly on mobile

#### TalkBack (Android)
- [ ] All interactive elements are announced correctly
- [ ] Form labels are properly associated
- [ ] Error messages are announced immediately
- [ ] Progress indicators are announced
- [ ] Navigation landmarks are properly identified
- [ ] Dynamic content changes are announced
- [ ] Touch gestures work correctly

### Keyboard Navigation Testing

#### Tab Navigation
- [ ] All interactive elements are reachable via Tab
- [ ] Tab order follows logical document flow
- [ ] Focus indicators are clearly visible
- [ ] No keyboard traps exist
- [ ] Skip links work correctly

#### Keyboard Shortcuts
- [ ] Enter/Space activate buttons
- [ ] Arrow keys navigate within components
- [ ] Escape closes modals/dropdowns
- [ ] Ctrl+M activates main content
- [ ] Ctrl+N navigates to next activity

#### Focus Management
- [ ] Focus moves to new content when loaded
- [ ] Focus returns to trigger after modal close
- [ ] Focus is trapped within modals
- [ ] Focus indicators meet contrast requirements

### Visual Accessibility Testing

#### Color and Contrast
- [ ] All text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- [ ] Color is not the only way to convey information
- [ ] Focus indicators have sufficient contrast
- [ ] Error states are distinguishable without color

#### Typography and Layout
- [ ] Text can be resized up to 200% without loss of functionality
- [ ] Line spacing is at least 1.5 times the font size
- [ ] Paragraph spacing is at least 2 times the font size
- [ ] Text is not justified (aligned to both left and right margins)

#### Visual Indicators
- [ ] Required form fields are clearly marked
- [ ] Error states are clearly indicated
- [ ] Success states are clearly indicated
- [ ] Progress indicators are visible and meaningful

### Cognitive Accessibility Testing

#### Content and Language
- [ ] Instructions are clear and concise
- [ ] Error messages are helpful and actionable
- [ ] Technical jargon is avoided or explained
- [ ] Content is organized logically

#### Interaction Design
- [ ] Consistent navigation patterns
- [ ] Predictable interaction outcomes
- [ ] Clear feedback for all actions
- [ ] No unexpected changes of context

#### Time and Pressure
- [ ] No time limits that cannot be extended
- [ ] Users can pause and resume activities
- [ ] No auto-save without user consent
- [ ] Clear indication of time remaining (if applicable)

## User Testing Protocols

### Participant Recruitment

#### Target Demographics
- **Screen Reader Users**: 5-10 participants using JAWS, NVDA, VoiceOver, or TalkBack
- **Keyboard-Only Users**: 5-10 participants with motor disabilities
- **Low Vision Users**: 5-10 participants using screen magnification
- **Cognitive Disability Users**: 5-10 participants with learning disabilities
- **General Users**: 10-15 participants for baseline comparison

#### Recruitment Criteria
- Age range: 8-18 (target demographic)
- Mix of experience levels with technology
- Geographic diversity
- Various device types (desktop, tablet, mobile)

### Testing Scenarios

#### Scenario 1: Activity Navigation
**Objective**: Test navigation between activities
**Tasks**:
1. Navigate to the first activity
2. Complete the activity
3. Move to the next activity
4. Return to a previous activity
5. Check progress indicators

**Success Criteria**:
- All participants can complete all tasks
- No accessibility barriers encountered
- Clear feedback provided at each step

#### Scenario 2: Activity Completion
**Objective**: Test activity interaction and completion
**Tasks**:
1. Read activity instructions
2. Interact with activity elements
3. Submit answers
4. Receive feedback
5. Continue to next activity

**Success Criteria**:
- All participants can complete activities independently
- Clear error messages when mistakes are made
- Positive reinforcement for correct answers

#### Scenario 3: Progress Tracking
**Objective**: Test progress saving and restoration
**Tasks**:
1. Start an activity
2. Leave the page
3. Return to the page
4. Verify progress is restored
5. Continue from where left off

**Success Criteria**:
- Progress is reliably saved and restored
- Clear indication of saved progress
- No data loss during interruptions

#### Scenario 4: Error Recovery
**Objective**: Test error handling and recovery
**Tasks**:
1. Trigger various error conditions
2. Read error messages
3. Follow recovery instructions
4. Continue with activities

**Success Criteria**:
- Error messages are clear and actionable
- Recovery paths are obvious
- No dead ends or confusion

### Testing Environment

#### Equipment Setup
- **Desktop Testing**: Windows with JAWS/NVDA, macOS with VoiceOver
- **Mobile Testing**: iOS with VoiceOver, Android with TalkBack
- **Screen Magnification**: ZoomText, Windows Magnifier, macOS Zoom
- **Alternative Input**: Switch devices, eye tracking, voice control

#### Testing Tools
- **Screen Recording**: OBS Studio, QuickTime
- **Eye Tracking**: Tobii Eye Tracker (if available)
- **Analytics**: Custom accessibility event tracking
- **Feedback Collection**: Survey forms, interview guides

### Data Collection

#### Quantitative Metrics
- Task completion rates
- Time to complete tasks
- Error rates and types
- Navigation efficiency
- User satisfaction scores

#### Qualitative Feedback
- User comments and suggestions
- Pain points and frustrations
- Positive experiences
- Feature requests
- Improvement ideas

## Testing Tools

### Automated Testing Tools

#### Jest-Axe
```bash
npm install --save-dev jest-axe @testing-library/jest-dom
```

#### Lighthouse CI
```bash
npm install --save-dev @lhci/cli
```

#### Pa11y
```bash
npm install --save-dev pa11y
```

### Manual Testing Tools

#### Screen Readers
- **JAWS**: Professional screen reader for Windows
- **NVDA**: Free screen reader for Windows
- **VoiceOver**: Built-in screen reader for macOS/iOS
- **TalkBack**: Built-in screen reader for Android

#### Color and Contrast
- **WebAIM Contrast Checker**: Online contrast verification
- **Color Oracle**: Simulate color blindness
- **Stark**: Design tool with accessibility features

#### Keyboard Navigation
- **Keyboard Navigation Tester**: Custom testing tool
- **Focus Indicators**: Browser developer tools

### Browser Developer Tools

#### Chrome DevTools
- Accessibility panel
- Lighthouse audits
- Color contrast checker
- Focus indicators

#### Firefox DevTools
- Accessibility inspector
- Color contrast checker
- ARIA validation

#### Safari Web Inspector
- Accessibility panel
- VoiceOver integration
- Color contrast checker

## Common Issues and Solutions

### Screen Reader Issues

#### Problem: Elements Not Announced
**Solution**: Ensure proper ARIA labels and roles
```typescript
// Good
<button aria-label="Submit answer">Submit</button>

// Better
<button aria-describedby="submit-help">Submit</button>
<div id="submit-help">Submit your answer to continue</div>
```

#### Problem: Dynamic Content Not Announced
**Solution**: Use ARIA live regions
```typescript
<div aria-live="polite" aria-atomic="true">
  {feedbackMessage}
</div>
```

### Keyboard Navigation Issues

#### Problem: Focus Traps
**Solution**: Implement proper focus management
```typescript
useEffect(() => {
  const focusableElements = modalRef.current?.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements?.length) {
    focusableElements[0].focus();
  }
}, []);
```

#### Problem: Missing Focus Indicators
**Solution**: Ensure visible focus styles
```css
.focus-visible {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}
```

### Visual Accessibility Issues

#### Problem: Low Contrast
**Solution**: Use sufficient color contrast
```css
.text-primary {
  color: #1a1a1a; /* 4.5:1 contrast ratio */
  background-color: #ffffff;
}
```

#### Problem: Color-Only Information
**Solution**: Add additional visual indicators
```typescript
// Bad
<div className={isError ? 'text-red' : 'text-green'}>{message}</div>

// Good
<div className={`${isError ? 'text-red' : 'text-green'} ${isError ? 'border-red' : 'border-green'}`}>
  {isError && <Icon name="error" />}
  {message}
</div>
```

## Reporting and Documentation

### Test Report Template

#### Executive Summary
- Overall accessibility score
- Key findings
- Critical issues
- Recommendations

#### Detailed Findings
- Issue description
- WCAG criteria violated
- Impact on users
- Recommended solution
- Priority level

#### User Feedback Summary
- Participant demographics
- Key insights
- Common pain points
- Positive feedback
- Improvement suggestions

### Action Plan

#### Immediate Actions (Week 1)
- Fix critical accessibility issues
- Update automated tests
- Implement monitoring

#### Short-term Actions (Month 1)
- Address high-priority issues
- Update documentation
- Train development team

#### Long-term Actions (Quarter 1)
- Implement accessibility-first design
- Establish ongoing testing
- Create accessibility guidelines

### Continuous Monitoring

#### Automated Monitoring
- Daily accessibility scans
- Performance monitoring
- Error tracking

#### User Feedback Collection
- In-app feedback forms
- Regular user surveys
- Support ticket analysis

#### Regular Reviews
- Monthly accessibility audits
- Quarterly user testing
- Annual compliance review

---

*This accessibility testing guide should be updated regularly based on new WCAG guidelines, user feedback, and technological advances.*
