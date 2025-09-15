import React, { useState, useEffect } from 'react';
import { getPlan3DayDetails } from '@/lib/api';
import api from '@/lib/api';
import EnhancedActivityPane from './EnhancedActivityPane';
import { 
  EnhancedActivitiesResponse, 
  EnhancedWhoContent, 
  EnhancedWhereContent, 
  EnhancedSequenceContent, 
  EnhancedMainIdeaContent, 
  EnhancedPredictContent,
  ActivityProgress 
} from '../../types/enhancedActivities';

interface Plan3ActivityWrapperProps {
  planId: string;
  dayIndex: number;
  studentId: string;
  dayDetails?: any; // Add optional dayDetails prop
  activities?: any[]; // Legacy prop for compatibility
  onJumpToContext?: (anchorId: string) => void;
  className?: string;
}

const Plan3ActivityWrapper: React.FC<Plan3ActivityWrapperProps> = ({
  planId,
  dayIndex,
  studentId,
  dayDetails: propDayDetails,
  onJumpToContext,
  className = ''
}) => {
  console.log('🎯 Plan3ActivityWrapper: Component rendered with props:', { planId, dayIndex, studentId });
  
  const [data, setData] = useState<EnhancedActivitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to transform backend activity data to frontend format
  const transformActivityData = (activities: any[]) => {
    const transformedActivities: any = {};
    
    console.log('🔧 transformActivityData called with:', activities?.map((a: any) => ({ type: a.type, hasData: !!a.data })));
    
    // Transform WHO activity
    const whoActivity = activities.find((a: any) => a.type === 'who');
    if (whoActivity?.data) {
      transformedActivities.who = {
        realCharacters: whoActivity.data.realCharacters || [],
        decoyCharacters: whoActivity.data.decoyCharacters || [],
        question: "Who are the characters in this chapter?",
        instructions: "Select the characters that appear in this story."
      };
    }

    // Transform WHERE activity
    const whereActivity = activities.find((a: any) => a.type === 'where');
    if (whereActivity?.data) {
      transformedActivities.where = {
        realSettings: whereActivity.data.realSettings || [],
        decoySettings: whereActivity.data.decoySettings || [],
        question: "Where does this chapter take place?",
        instructions: "Select the settings that appear in this story."
      };
    }

    // Transform SEQUENCE activity
    const sequenceActivity = activities.find((a: any) => a.type === 'sequence');
    if (sequenceActivity?.data) {
      transformedActivities.sequence = {
        events: sequenceActivity.data.events || [],
        question: "What happened in this chapter? Put the events in order.",
        instructions: "Drag the events to put them in the correct order from the chapter."
      };
    }

    // Transform MAIN IDEA activity
    const mainIdeaActivity = activities.find((a: any) => a.type === 'main-idea');
    if (mainIdeaActivity?.data) {
      transformedActivities['main-idea'] = {
        question: mainIdeaActivity.data.question || "What is the main idea of this chapter?",
        options: mainIdeaActivity.data.options || [],
        instructions: "Select the option that best describes the main idea of this story."
      };
    }

    // Transform PREDICT activity
    const predictActivity = activities.find((a: any) => a.type === 'predict');
    if (predictActivity?.data) {
      transformedActivities.predict = {
        question: predictActivity.data.question || "What do you think will happen next?",
        options: predictActivity.data.options || [],
        instructions: predictActivity.data.instructions || "Write your prediction about what might happen next."
      };
    }

    // Transform VOCABULARY activity
    const vocabularyActivity = activities.find((a: any) => a.type === 'vocabulary');
    console.log('🔧 Looking for vocabulary activity:', { 
      found: !!vocabularyActivity, 
      type: vocabularyActivity?.type, 
      hasData: !!vocabularyActivity?.data,
      dataKeys: vocabularyActivity?.data ? Object.keys(vocabularyActivity.data) : []
    });
    
    if (vocabularyActivity?.data) {
      // Handle both old and new data structures for backward compatibility
      let realWords: any[] = [];
      let decoyWords: any[] = [];
      
      if (vocabularyActivity.data.realWords && vocabularyActivity.data.decoyWords) {
        // New structure: realWords + decoyWords
        realWords = (vocabularyActivity.data.realWords || []).map((word: any) => ({
          word: word.word,
          definition: word.definition,
          contextSentence: word.context,
          isReal: true
        }));
        
        decoyWords = (vocabularyActivity.data.decoyWords || []).map((decoy: any) => ({
          word: decoy.word,
          definition: decoy.definition,
          contextSentence: decoy.context,
          isReal: false
        }));
      } else if (vocabularyActivity.data.vocabularyWords && vocabularyActivity.data.decoyDefinitions) {
        // Old structure: vocabularyWords + decoyDefinitions (legacy support)
        realWords = (vocabularyActivity.data.vocabularyWords || []).map((word: any) => ({
          word: word.word,
          definition: word.definition,
          contextSentence: word.context,
          isReal: true
        }));
        
        decoyWords = (vocabularyActivity.data.decoyDefinitions || []).map((decoy: any) => ({
          word: '', // Old structure didn't have words for decoys
          definition: decoy.definition,
          contextSentence: '',
          isReal: false
        }));
      }
      
      if (realWords.length > 0 || decoyWords.length > 0) {
        transformedActivities.vocabulary = {
          realWords,
          decoyWords,
          question: "What do these vocabulary words mean?",
          instructions: "Match each vocabulary word with its correct definition from the story."
        };
        
        console.log('🔧 Vocabulary transformation result:', {
          realWordsCount: realWords.length,
          decoyWordsCount: decoyWords.length,
          finalStructure: transformedActivities.vocabulary,
          dataStructure: vocabularyActivity.data.realWords ? 'new' : 'legacy'
        });
      } else {
        console.log('⚠️ Vocabulary activity data is empty or malformed');
      }
    } else {
      console.log('⚠️ Vocabulary activity not found or missing data');
    }

    return transformedActivities;
  };

  // Deterministic shuffle function that produces consistent results
  const shuffleArray = (array: any[], seed: string) => {
    const shuffled = [...array];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use the hash as a seed for shuffling
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.abs(hash % (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      hash = ((hash << 5) - hash) + i; // Update hash for next iteration
    }
    
    return shuffled;
  };

  // Helper function to create proper ActivityProgress objects
  const createActivityProgress = (activity: any): ActivityProgress => ({
    id: activity?.id || `activity-${activity?.type || 'unknown'}`,
    activityType: activity?.type === 'main_idea' ? 'main-idea' : (activity?.type || 'who'),
    status: activity?.completed ? 'completed' : 'not_started',
    attempts: 0,
    responses: []
  });

  useEffect(() => {
    let isMounted = true;
    
    const fetchActivityData = async () => {
      try {
        if (!isMounted) return;
        
        setLoading(true);
        console.log('🔄 Plan3ActivityWrapper: Starting to fetch activity data for', { planId, dayIndex, studentId });
        
        // Use enhanced activities API to get proper progress data
        let enhancedData: EnhancedActivitiesResponse;
        try {
          // Try the enhanced activities API first
          const { data: enhancedResponse } = await api.get(`/enhanced-activities/${planId}/${dayIndex}`);
          enhancedData = enhancedResponse;
          console.log('✅ Plan3ActivityWrapper: Successfully fetched from enhanced activities API:', {
            activitiesCount: Object.keys(enhancedData.activities).length,
            activityTypes: Object.keys(enhancedData.activities),
            progressKeys: Object.keys(enhancedData.progress || {}),
            progressData: enhancedData.progress
          });
        } catch (enhancedError) {
          console.log('⚠️ Enhanced activities API failed, falling back to legacy API:', enhancedError);
          
          // Fallback to legacy API
          const dayDetails = propDayDetails || await getPlan3DayDetails(planId, dayIndex);
          
          console.log('📋 Day details received:', {
            planId,
            dayIndex,
            activitiesCount: dayDetails.activities?.length || 0,
            activities: dayDetails.activities?.map((a: any) => ({ id: a.id, type: a.type, title: a.title }))
          });
          
          // Debug: Log all available activity types
          if (dayDetails.activities) {
            console.log('🔍 Available activity types:', dayDetails.activities.map((a: any) => a.type));
            console.log('🔍 Full activities data:', dayDetails.activities);
          }
          
          // Transform the backend activities to frontend format
          const transformedActivities = transformActivityData(dayDetails.activities);

          // Transform the data to match EnhancedActivitiesResponse format
          enhancedData = {
            planId,
            dayIndex,
            studentAge: 10, // Default age, could be extracted from student data
            activities: transformedActivities,
            progress: {
              who: createActivityProgress(dayDetails.activities?.find((a: any) => a.type === 'who')),
              where: createActivityProgress(dayDetails.activities?.find((a: any) => a.type === 'where')),
              sequence: createActivityProgress(dayDetails.activities?.find((a: any) => a.type === 'sequence')),
              'main-idea': createActivityProgress(dayDetails.activities?.find((a: any) => a.type === 'main-idea')),
              vocabulary: createActivityProgress(dayDetails.activities?.find((a: any) => a.type === 'vocabulary')),
              predict: createActivityProgress(dayDetails.activities?.find((a: any) => a.type === 'predict')),
            }
          };

          console.log('✅ Plan3ActivityWrapper: Successfully transformed legacy data:', {
            activitiesCount: Object.keys(enhancedData.activities).length,
            activityTypes: Object.keys(enhancedData.activities),
            hasData: !!enhancedData,
            whoActivity: enhancedData.activities.who
          });
        }
        
        console.log('🧠 Main Idea options:', enhancedData.activities['main-idea']?.options);
        console.log('📚 Vocabulary activity:', enhancedData.activities.vocabulary);
        
        if (isMounted) {
          setData(enhancedData);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('❌ Plan3ActivityWrapper: Error fetching activity data:', err);
          setError(err.message || 'Failed to load activities');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (planId && dayIndex && studentId) {
      // Always try to fetch from enhanced activities API first, even with propDayDetails
      // This ensures we get the correct progress data from the ActivityProgress table
      fetchActivityData();
    }

    return () => {
      isMounted = false;
    };
  }, [planId, dayIndex, studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading activities...</p>
          <p className="mt-2 text-sm text-gray-500">This may take a moment on first visit</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center p-4">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-gray-600">No activity data available</p>
      </div>
    );
  }

  return (
    <EnhancedActivityPane
      data={data}
      onJumpToContext={onJumpToContext}
      className={className}
      studentId={studentId}
    />
  );
};

export default Plan3ActivityWrapper;
