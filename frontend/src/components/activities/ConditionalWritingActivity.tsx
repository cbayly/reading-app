import React, { useState, useEffect } from 'react';
import { Activity } from '@/types/weekly-plan';
import { useTextInputAutosave } from '@/hooks/useAutosave';
import AutosaveIndicator from '@/components/AutosaveIndicator';

interface ConditionalWritingActivityProps {
  activity: Activity;
  onUpdate: (responses: any) => void;
  isReadOnly?: boolean;
  planId?: number;
  dayIndex?: number;
}

export default function ConditionalWritingActivity({ 
  activity, 
  onUpdate, 
  isReadOnly = false,
  planId,
  dayIndex
}: ConditionalWritingActivityProps) {
  const [response, setResponse] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [day3Choice, setDay3Choice] = useState<string | null>(null);
  const [hasNotifiedCompletion, setHasNotifiedCompletion] = useState(false);

  // Get the appropriate prompt based on Day 3 choice
  const getConditionalPrompt = () => {
    if (!day3Choice || !activity.data?.conditionalPrompt) {
      return activity.prompt; // Fallback to default prompt
    }
    const conditionalPrompts = activity.data.conditionalPrompt as Record<string, string>;
    const specificPrompt = conditionalPrompts[day3Choice];
    return specificPrompt || activity.prompt;
  };

  // Fetch Day 3 choice from the plan
  useEffect(() => {
    const fetchDay3Choice = async () => {
      if (!planId) {
        return;
      }
      
      try {
        const response = await fetch(`/api/plans/${planId}`);
        const planData = await response.json();
        
        // Find Day 3 reflection activity
        const day3 = planData.days?.find((d: any) => d.dayIndex === 3);
        const reflectionActivity = day3?.activities?.find((a: any) => a.type === 'reflection');
        
        if (reflectionActivity?.response?.choice) {
          setDay3Choice(reflectionActivity.response.choice);
        }
      } catch (error) {
        console.error('Error fetching Day 3 choice:', error);
      }
    };

    fetchDay3Choice();
  }, [planId]);

  // Initialize from existing response if available
  useEffect(() => {
    if (activity.response?.text) {
      setResponse(activity.response.text);
      setIsComplete(!!activity.response.completed);
      setHasNotifiedCompletion(!!activity.response.completed);
    }
  }, [activity.response]);

  // Check if response is complete (minimum 50 words)
  useEffect(() => {
    const wordCount = response.trim().split(/\s+/).filter(word => word.length > 0).length;
    setIsComplete(wordCount >= 50);
  }, [response]);

  // Handle text input changes
  const handleResponseChange = (value: string) => {
    if (isReadOnly) return;
    setResponse(value);
    setHasNotifiedCompletion(false); // Reset completion flag when response changes
  };

  // Get word count
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Update parent component when complete
  useEffect(() => {
    if (isComplete && response.trim() && !hasNotifiedCompletion) {
      const responseData = {
        completed: true,
        text: response,
        wordCount: getWordCount(response)
      };
      onUpdate(responseData);
      setHasNotifiedCompletion(true);
    }
  }, [isComplete, response, onUpdate, hasNotifiedCompletion]);

  const currentPrompt = getConditionalPrompt();
  const wordCount = getWordCount(response);
  const minWords = 50;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Creative Writing</h4>
        <p className="text-sm text-blue-800">
          {isReadOnly 
            ? "Your writing has been completed. You can review your response below."
            : "Write a thoughtful response based on the prompt below."
          }
        </p>
        {isReadOnly && (
          <div className="mt-2 p-2 bg-blue-100 rounded border border-blue-200">
            <div className="flex items-center text-blue-800">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Read-only mode - Activity completed</span>
            </div>
          </div>
        )}
      </div>

      {/* Writing Prompt */}
      <div className="space-y-4">
        <h5 className="font-medium text-gray-900">Writing Prompt:</h5>
        <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
          <p className="text-gray-800 font-medium">{currentPrompt}</p>
          {!day3Choice && (
            <p className="text-sm text-gray-600 mt-2">
              <em>Note: This prompt will be customized based on your Day 3 reflection choice.</em>
            </p>
          )}
        </div>
      </div>

      {/* Writing Area */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Your Response <span className="text-red-500">*</span>
        </label>
        <textarea
          value={response}
          onChange={(e) => handleResponseChange(e.target.value)}
          disabled={isReadOnly}
          rows={8}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            isReadOnly ? 'bg-gray-100 cursor-default' : 'bg-white'
          }`}
          placeholder="Write your response here... (minimum 50 words)"
        />
        
        {/* Word Count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {wordCount} word{wordCount !== 1 ? 's' : ''}
            {wordCount < minWords && (
              <span className="text-red-500 ml-2">
                (minimum {minWords} words required)
              </span>
            )}
          </span>
          <span className={`font-medium ${
            wordCount >= minWords ? 'text-green-600' : 'text-gray-500'
          }`}>
            {wordCount >= minWords ? '✅ Complete' : 'Incomplete'}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {isComplete ? '✅ Writing complete!' : 'Write at least 50 words to complete this activity'}
        </span>
      </div>
    </div>
  );
}
