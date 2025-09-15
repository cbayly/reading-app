import React, { useState, useEffect } from 'react';
import { Activity } from '@/types/weekly-plan';
import { useTextInputAutosave } from '@/hooks/useAutosave';
import AutosaveIndicator from '@/components/AutosaveIndicator';

interface ReflectionActivityProps {
  activity: Activity;
  onUpdate: (responses: any) => void;
  isReadOnly?: boolean;
  planId?: number;
  dayIndex?: number;
}

interface ReflectionResponse {
  question: string;
  answer: string;
  minWords?: number;
  maxWords?: number;
}

export default function ReflectionActivity({ 
  activity, 
  onUpdate, 
  isReadOnly = false,
  planId,
  dayIndex
}: ReflectionActivityProps) {
  const [responses, setResponses] = useState<ReflectionResponse[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Initialize responses from activity data
  useEffect(() => {
    if (activity.data?.questions) {
      const initialResponses = activity.data.questions.map((question: any) => ({
        question: question.text,
        answer: '',
        minWords: question.minWords || 10,
        maxWords: question.maxWords || 200
      }));
      setResponses(initialResponses);
    }
  }, [activity.data]);

  // Check if all responses are complete
  useEffect(() => {
    const allComplete = responses.every(response => 
      response.answer.trim().length >= (response.minWords || 10)
    );
    setIsComplete(allComplete && responses.length > 0);
  }, [responses]);

  // Handle text input changes
  const handleAnswerChange = (index: number, value: string) => {
    if (isReadOnly) return;
    
    setResponses(prev => prev.map((response, i) => 
      i === index ? { ...response, answer: value } : response
    ));
  };

  // Get word count for a response
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Get word count status
  const getWordCountStatus = (response: ReflectionResponse) => {
    const wordCount = getWordCount(response.answer);
    const minWords = response.minWords || 10;
    const maxWords = response.maxWords || 200;

    if (wordCount < minWords) {
      return { status: 'too-short', color: 'text-red-600' };
    } else if (wordCount > maxWords) {
      return { status: 'too-long', color: 'text-red-600' };
    } else {
      return { status: 'good', color: 'text-green-600' };
    }
  };

  // Update parent component when complete
  useEffect(() => {
    if (isComplete) {
      const responseData = {
        completed: true,
        responses: responses.map(response => ({
          question: response.question,
          answer: response.answer,
          wordCount: getWordCount(response.answer)
        }))
      };
      onUpdate(responseData);
    }
  }, [isComplete, responses, onUpdate]);

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <h4 className="font-medium text-purple-900 mb-2">Reflection Questions</h4>
        <p className="text-sm text-purple-800">
          Take some time to think about the story and share your thoughts. Write thoughtful responses to each question below.
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {responses.map((response, index) => {
          const wordCount = getWordCount(response.answer);
          const wordCountStatus = getWordCountStatus(response);
          const minWords = response.minWords || 10;
          const maxWords = response.maxWords || 200;

          // Create autosave hook for this response
          const autosave = useTextInputAutosave({
            initialValue: response.answer,
            delay: 800,
            onSave: async (value: string) => {
              // Update local state
              handleAnswerChange(index, value);
              
              // If we have plan context, save to API
              if (planId && dayIndex) {
                const updatedResponses = responses.map((r, i) => 
                  i === index ? { ...r, answer: value } : r
                );
                
                const responseData = {
                  responses: updatedResponses.map(r => ({
                    question: r.question,
                    answer: r.answer,
                    wordCount: getWordCount(r.answer)
                  }))
                };
                
                onUpdate(responseData);
              }
            },
            onError: (error) => {
              console.error('Autosave failed:', error);
            },
            enabled: !isReadOnly,
            saveOnBlur: true,
            saveOnChange: true,
          });

          return (
            <div key={index} className="border rounded-lg p-4">
              {/* Question */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  Question {index + 1}
                </h4>
                <p className="text-gray-700">{response.question}</p>
              </div>

              {/* Answer Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor={`answer-${index}`} className="block text-sm font-medium text-gray-700">
                    Your Answer
                  </label>
                  {/* Autosave Indicator */}
                  {!isReadOnly && (
                    <AutosaveIndicator
                      isSaving={autosave.isSaving}
                      lastSaved={autosave.lastSaved}
                      hasUnsavedChanges={autosave.hasUnsavedChanges}
                      error={autosave.error}
                      className="text-xs"
                    />
                  )}
                </div>
                <textarea
                  id={`answer-${index}`}
                  {...autosave.inputProps}
                  disabled={isReadOnly}
                  rows={6}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : 'bg-white'
                  } ${
                    wordCountStatus.status === 'too-short' || wordCountStatus.status === 'too-long'
                      ? 'border-red-300'
                      : wordCountStatus.status === 'good'
                      ? 'border-green-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="Write your response here..."
                />
              </div>

              {/* Word Count */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${wordCountStatus.color}`}>
                    {wordCount} words
                  </span>
                  <span className="text-xs text-gray-500">
                    (min: {minWords}, max: {maxWords})
                  </span>
                </div>
                
                {/* Status Indicator */}
                <div className="flex items-center gap-1">
                  {wordCountStatus.status === 'good' && (
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {wordCountStatus.status === 'too-short' && (
                    <span className="text-xs text-red-600">Too short</span>
                  )}
                  {wordCountStatus.status === 'too-long' && (
                    <span className="text-xs text-red-600">Too long</span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    wordCountStatus.status === 'good'
                      ? 'bg-green-500'
                      : wordCountStatus.status === 'too-long'
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (wordCount / maxWords) * 100)}%`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Status */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Completed: {responses.filter(r => getWordCount(r.answer) >= (r.minWords || 10)).length} of {responses.length}
        </span>
        {isComplete && (
          <span className="text-sm font-medium text-green-600">
            ✅ All responses complete!
          </span>
        )}
      </div>

      {/* Completion Message */}
      {isComplete && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-medium text-green-900">Great reflection!</h4>
              <p className="text-sm text-green-700">
                You've provided thoughtful responses to all the reflection questions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
