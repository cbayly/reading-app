import React, { useState, useEffect } from 'react';
import { Activity } from '@/types/weekly-plan';

interface ChoiceReflectionActivityProps {
  activity: Activity;
  onUpdate: (responses: any) => void;
  isReadOnly?: boolean;
}

interface ReflectionField {
  label: string;
  required: boolean;
}

interface ReflectionOption {
  label: string;
  fields: ReflectionField[];
}

export default function ChoiceReflectionActivity({ 
  activity, 
  onUpdate, 
  isReadOnly = false 
}: ChoiceReflectionActivityProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [responses, setResponses] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [hasNotifiedCompletion, setHasNotifiedCompletion] = useState(false);

  // Initialize from existing response if available
  useEffect(() => {
    if (activity.response?.choice) {
      setSelectedChoice(activity.response.choice);
      setResponses(activity.response.responses || []);
      setHasNotifiedCompletion(!!activity.response.completed);
    }
  }, [activity.response]);

  // Check if all responses are complete
  useEffect(() => {
    if (!selectedChoice) {
      setIsComplete(false);
      return;
    }

    const option = activity.data?.options?.[selectedChoice];
    if (!option) {
      setIsComplete(false);
      return;
    }

    const allComplete = option.fields.every((field, index) => {
      if (!field.required) return true;
      return responses[index] && responses[index].trim().length >= 10;
    });

    setIsComplete(allComplete);
  }, [selectedChoice, responses, activity.data]);

  // Handle choice selection
  const handleChoiceSelect = (choice: string) => {
    if (isReadOnly) return;
    
    setSelectedChoice(choice);
    setHasNotifiedCompletion(false); // Reset completion flag when choice changes
    // Initialize responses array with empty strings
    const option = activity.data?.options?.[choice];
    if (option) {
      setResponses(new Array(option.fields.length).fill(''));
    }
  };

  // Handle response change
  const handleResponseChange = (index: number, value: string) => {
    if (isReadOnly) return;
    
    setResponses(prev => {
      const newResponses = [...prev];
      newResponses[index] = value;
      return newResponses;
    });
    setHasNotifiedCompletion(false); // Reset completion flag when responses change
  };

  // Update parent component when complete
  useEffect(() => {
    if (isComplete && selectedChoice && !hasNotifiedCompletion) {
      const responseData = {
        completed: true,
        choice: selectedChoice,
        responses: responses
      };
      onUpdate(responseData);
      setHasNotifiedCompletion(true);
    }
  }, [isComplete, selectedChoice, responses, onUpdate, hasNotifiedCompletion]);

  const options = activity.data?.options || {};

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <h4 className="font-medium text-purple-900 mb-2">Reflection Activity</h4>
        <p className="text-sm text-purple-800">
          {isReadOnly 
            ? "Your reflection has been completed. You can review your responses below."
            : "Choose your reflection style and provide thoughtful responses for all required fields."
          }
        </p>
        {isReadOnly && (
          <div className="mt-2 p-2 bg-purple-100 rounded border border-purple-200">
            <div className="flex items-center text-purple-800">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Read-only mode - Activity completed</span>
            </div>
          </div>
        )}
      </div>

      {/* Choice Selection */}
      {!isReadOnly && (
        <div className="space-y-4">
          <h5 className="font-medium text-gray-900">Choose your reflection style:</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(options).map(([key, option]: [string, ReflectionOption]) => (
              <button
                key={key}
                onClick={() => handleChoiceSelect(key)}
                disabled={isReadOnly}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  selectedChoice === key
                    ? 'border-purple-500 bg-purple-50 text-purple-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-25'
                } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="font-medium mb-2">{option.label}</div>
                <div className="text-sm text-gray-600">
                  {option.fields.length} field{option.fields.length !== 1 ? 's' : ''} to complete
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Response Fields */}
      {selectedChoice && (
        <div className="space-y-4">
          <h5 className="font-medium text-gray-900">Your Responses:</h5>
          {options[selectedChoice]?.fields.map((field, index) => (
            <div key={index} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <textarea
                value={responses[index] || ''}
                onChange={(e) => handleResponseChange(index, e.target.value)}
                disabled={isReadOnly}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  isReadOnly ? 'bg-gray-100 cursor-default' : 'bg-white'
                }`}
                placeholder={field.required ? "Required response (minimum 10 characters)" : "Optional response"}
              />
              {responses[index] && (
                <div className="text-xs text-gray-500">
                  {responses[index].trim().length} characters
                  {field.required && responses[index].trim().length < 10 && (
                    <span className="text-red-500 ml-2">Minimum 10 characters required</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Progress */}
      {selectedChoice && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {isComplete ? '✅ All responses complete!' : 'Complete all required fields to finish'}
          </span>
          {selectedChoice && (
            <span>
              {responses.filter((r, i) => {
                const field = options[selectedChoice]?.fields[i];
                return field?.required ? (r && r.trim().length >= 10) : true;
              }).length} of {options[selectedChoice]?.fields.filter(f => f.required).length} required fields
            </span>
          )}
        </div>
      )}
    </div>
  );
}
