import React, { useState, useMemo, useCallback } from 'react';
import ActivityStepper, { ActivityStep } from './shared/ActivityStepper';
import { EnhancedActivitiesResponse, ActivityResponse } from '../../types/enhancedActivities';
import WhoActivityEnhanced from './WhoActivityEnhanced';
import WhereActivityEnhanced from './WhereActivityEnhanced';
import SequenceActivityEnhanced from './SequenceActivityEnhanced';
import MainIdeaActivityEnhanced from './MainIdeaActivityEnhanced';
import VocabularyActivityEnhanced from './VocabularyActivityEnhanced';
import PredictActivityEnhanced from './PredictActivityEnhanced';

interface EnhancedActivityPaneProps {
  data: EnhancedActivitiesResponse;
  onCompleteActivity?: (activityType: string, answers: any[], responses?: ActivityResponse[]) => void;
  onJumpToContext?: (anchorId: string) => void;
  className?: string;
}

const EnhancedActivityPane: React.FC<EnhancedActivityPaneProps> = ({
  data,
  onCompleteActivity,
  onJumpToContext,
  className = ''
}) => {
  const activities = data.activities;
  const progress = data.progress;

  const steps: ActivityStep[] = useMemo(() => {
    const list: ActivityStep[] = [];
    if (activities.who) list.push({ id: 'who', type: 'who', label: 'Who', completed: progress.who?.status === 'completed' });
    if (activities.where) list.push({ id: 'where', type: 'where', label: 'Where', completed: progress.where?.status === 'completed' });
    if (activities.sequence) list.push({ id: 'sequence', type: 'sequence', label: 'Sequence', completed: progress.sequence?.status === 'completed' });
    if (activities['main-idea']) list.push({ id: 'main-idea', type: 'main-idea', label: 'Main Idea', completed: progress['main-idea']?.status === 'completed' });
    if (activities.vocabulary) list.push({ id: 'vocabulary', type: 'vocabulary', label: 'Vocabulary', completed: progress.vocabulary?.status === 'completed' });
    if (activities.predict) list.push({ id: 'predict', type: 'predict', label: 'Predict', completed: progress.predict?.status === 'completed' });
    return list;
  }, [activities, progress]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const onStepClick = useCallback((index: number) => setCurrentIndex(index), []);

  const step = steps[currentIndex];

  const handleComplete = useCallback((activityType: string, answers: any[], responses?: ActivityResponse[]) => {
    onCompleteActivity?.(activityType, answers, responses);
  }, [onCompleteActivity]);

  const renderActivity = () => {
    if (!step) return null;
    switch (step.type) {
      case 'who':
        return (
          <WhoActivityEnhanced
            content={{ type: 'who', content: activities.who! }}
            progress={progress.who}
            onComplete={handleComplete}
            onProgressUpdate={() => {}}
            onJumpToContext={onJumpToContext}
          />
        );
      case 'where':
        return (
          <WhereActivityEnhanced
            content={{ type: 'where', content: activities.where! }}
            progress={progress.where}
            onComplete={handleComplete}
            onProgressUpdate={() => {}}
            onJumpToContext={onJumpToContext}
          />
        );
      case 'sequence':
        return (
          <SequenceActivityEnhanced
            content={{ type: 'sequence', content: activities.sequence! }}
            progress={progress.sequence}
            onComplete={handleComplete}
            onProgressUpdate={() => {}}
            onJumpToContext={onJumpToContext}
          />
        );
      case 'main-idea':
        return (
          <MainIdeaActivityEnhanced
            content={{ type: 'main-idea', content: activities['main-idea']! }}
            progress={progress['main-idea']}
            onComplete={handleComplete}
            onProgressUpdate={() => {}}
            onJumpToContext={onJumpToContext}
          />
        );
      case 'vocabulary':
        return (
          <VocabularyActivityEnhanced
            content={{ type: 'vocabulary', content: activities.vocabulary! }}
            progress={progress.vocabulary}
            onComplete={handleComplete}
            onProgressUpdate={() => {}}
            onJumpToContext={onJumpToContext}
          />
        );
      case 'predict':
        return (
          <PredictActivityEnhanced
            content={{ type: 'predict', content: activities.predict! }}
            progress={progress.predict}
            onComplete={handleComplete}
            onProgressUpdate={() => {}}
            onJumpToContext={onJumpToContext}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <ActivityStepper steps={steps} currentIndex={currentIndex} onStepClick={onStepClick} />
      <div>{renderActivity()}</div>
    </div>
  );
};

export default EnhancedActivityPane;


