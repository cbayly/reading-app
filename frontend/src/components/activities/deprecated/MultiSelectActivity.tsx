import React, { useState, useEffect } from 'react';
import { Activity } from '@/types/weekly-plan';

interface MultiSelectActivityProps {
  activity: Activity;
  onUpdate: (responses: any) => void;
  isReadOnly?: boolean;
}

interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'checkbox' | 'rating' | 'creative';
  options?: string[];
  selectedAnswers: string[];
  required: boolean;
}

export default function MultiSelectActivity({ activity, onUpdate, isReadOnly = false }: MultiSelectActivityProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Initialize questions from activity data
  useEffect(() => {
    if (activity.data?.questions) {
      const initialQuestions = activity.data.questions.map((question: any) => ({
        id: question.id || `question-${Math.random()}`,
        text: question.text,
        type: question.type || 'multiple-choice',
        options: question.options || [],
        selectedAnswers: [],
        required: question.required !== false
      }));
      setQuestions(initialQuestions);
    } else {
      // Default questions for Day 5
      const defaultQuestions: Question[] = [
        {
          id: 'favorite-character',
          text: 'Who was your favorite character in the story?',
          type: 'multiple-choice',
          options: ['The main character', 'A supporting character', 'The villain', 'A magical creature'],
          selectedAnswers: [],
          required: true
        },
        {
          id: 'story-genre',
          text: 'What type of story would you like to read next?',
          type: 'checkbox',
          options: ['Adventure', 'Mystery', 'Fantasy', 'Science Fiction', 'Historical', 'Comedy'],
          selectedAnswers: [],
          required: true
        },
        {
          id: 'story-rating',
          text: 'How much did you enjoy this story?',
          type: 'rating',
          options: ['1 - Not very much', '2 - A little', '3 - Okay', '4 - Pretty good', '5 - Loved it!'],
          selectedAnswers: [],
          required: true
        },
        {
          id: 'creative-response',
          text: 'If you could add one thing to this story, what would it be?',
          type: 'creative',
          options: [],
          selectedAnswers: [],
          required: false
        }
      ];
      setQuestions(defaultQuestions);
    }
  }, [activity.data]);

  // Check if all required questions are answered
  useEffect(() => {
    const allComplete = questions.every(question => {
      if (!question.required) return true;
      return question.selectedAnswers.length > 0;
    });
    setIsComplete(allComplete && questions.length > 0);
  }, [questions]);

  // Handle answer selection
  const handleAnswerSelect = (questionId: string, answer: string) => {
    if (isReadOnly) return;
    
    setQuestions(prev => prev.map(question => {
      if (question.id !== questionId) return question;
      
      let newSelectedAnswers: string[];
      
      if (question.type === 'checkbox') {
        // Toggle answer for checkbox
        newSelectedAnswers = question.selectedAnswers.includes(answer)
          ? question.selectedAnswers.filter(a => a !== answer)
          : [...question.selectedAnswers, answer];
      } else {
        // Single selection for other types
        newSelectedAnswers = [answer];
      }
      
      return { ...question, selectedAnswers: newSelectedAnswers };
    }));
  };

  // Handle creative response
  const handleCreativeResponse = (questionId: string, response: string) => {
    if (isReadOnly) return;
    
    setQuestions(prev => prev.map(question => 
      question.id === questionId 
        ? { ...question, selectedAnswers: [response] }
        : question
    ));
  };

  // Render question based on type
  const renderQuestion = (question: Question) => {
    const isAnswered = question.selectedAnswers.length > 0;

    return (
      <div key={question.id} className="border rounded-lg p-4">
        {/* Question Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">{question.text}</h4>
            <div className="flex items-center gap-2">
              {question.required && (
                <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                  Required
                </span>
              )}
              {isReadOnly && (
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                  Read-only
                </span>
              )}
            </div>
          </div>
          {isAnswered && (
            <div className="flex items-center text-sm text-green-600">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Answered
            </div>
          )}
        </div>

        {/* Question Content */}
        {question.type === 'multiple-choice' && (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <label key={index} className={`flex items-center ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={question.selectedAnswers.includes(option)}
                  onChange={() => handleAnswerSelect(question.id, option)}
                  disabled={isReadOnly}
                  className={`w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 ${
                    isReadOnly ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                <span className={`ml-3 text-gray-700 ${isReadOnly ? 'opacity-75' : ''}`}>{option}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'checkbox' && (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <label key={index} className={`flex items-center ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  value={option}
                  checked={question.selectedAnswers.includes(option)}
                  onChange={() => handleAnswerSelect(question.id, option)}
                  disabled={isReadOnly}
                  className={`w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${
                    isReadOnly ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                <span className={`ml-3 text-gray-700 ${isReadOnly ? 'opacity-75' : ''}`}>{option}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'rating' && (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <label key={index} className={`flex items-center ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={question.selectedAnswers.includes(option)}
                  onChange={() => handleAnswerSelect(question.id, option)}
                  disabled={isReadOnly}
                  className={`w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 ${
                    isReadOnly ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                <span className={`ml-3 text-gray-700 ${isReadOnly ? 'opacity-75' : ''}`}>{option}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'creative' && (
          <div>
            <textarea
              value={question.selectedAnswers[0] || ''}
              onChange={(e) => handleCreativeResponse(question.id, e.target.value)}
              disabled={isReadOnly}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isReadOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'
              }`}
              placeholder={isReadOnly ? "Response completed" : "Share your creative idea here..."}
            />
          </div>
        )}
      </div>
    );
  };

  // Update parent component when complete
  useEffect(() => {
    if (isComplete) {
      const responseData = {
        completed: true,
        questions: questions.map(question => ({
          id: question.id,
          text: question.text,
          type: question.type,
          answers: question.selectedAnswers
        }))
      };
      onUpdate(responseData);
    }
  }, [isComplete, questions, onUpdate]);

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h4 className="font-medium text-green-900 mb-2">Creative Activities</h4>
        <p className="text-sm text-green-800">
          {isReadOnly 
            ? "This activity has been completed. You can review your responses below."
            : "Let's have some fun with the story! Answer these questions to help us understand what you liked and what you'd like to read next."
          }
        </p>
        {isReadOnly && (
          <div className="mt-2 p-2 bg-green-100 rounded border border-green-200">
            <div className="flex items-center text-green-800">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Read-only mode - Activity completed</span>
            </div>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map(renderQuestion)}
      </div>

      {/* Completion Status */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Completed: {questions.filter(q => q.required ? q.selectedAnswers.length > 0 : true).length} of {questions.length}
        </span>
        {isComplete && (
          <span className="text-sm font-medium text-green-600">
            ✅ All questions answered!
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
              <h4 className="font-medium text-green-900">Great job!</h4>
              <p className="text-sm text-green-700">
                You've completed all the creative activities. Your feedback helps us create better stories for you!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
