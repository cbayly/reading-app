'use client';

import React from 'react';

interface Question {
  type: 'comprehension' | 'vocabulary';
  text?: string;
  question?: string;
  options: string[];
  correctAnswer: string;
  context?: string;
  // For vocabulary questions, the target word to define
  word?: string;
}

interface AssessmentQuestionPaneProps {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<number, string>;
  onAnswer: (answer: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  readingCompleted: boolean;
  studentName: string;
  // When true, render all questions in a single scrollable list
  renderAll?: boolean;
  // Provide per-index answer handler for renderAll mode
  onAnswerAtIndex?: (index: number, answer: string) => void;
  // Optional submit handler (used in renderAll mode)
  onSubmit?: () => void;
  // Function to change the current question index
  onQuestionIndexChange?: (index: number) => void;
}

const AssessmentQuestionPane: React.FC<AssessmentQuestionPaneProps> = ({
  questions,
  currentQuestionIndex,
  answers,
  onAnswer,
  onNext,
  onPrevious,
  readingCompleted,
  studentName,
  renderAll = false,
  onAnswerAtIndex,
  onSubmit,
  onQuestionIndexChange
}) => {
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const renderHighlighted = (text: string, target?: string) => {
    if (!target) return text;
    const pattern = new RegExp(`(${escapeRegExp(target)})`, 'gi');
    return text.split(pattern).map((part, idx) =>
      pattern.test(part) ? (
        <strong key={idx} className="font-semibold">{part}</strong>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
  };

  if (!readingCompleted) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Complete the Reading First
          </h3>
          <p className="text-gray-600 text-sm">
            Please read the passage completely before answering the questions. This helps ensure accurate assessment of {studentName}'s reading comprehension.
          </p>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Questions Available
          </h3>
          <p className="text-gray-600 text-sm">
            The assessment questions could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const hasAnswered = answers[currentQuestionIndex];

  // Render all questions in a single scroll when requested
  if (renderAll) {
    const allAnswered = questions.every((_, idx) => Boolean(answers[idx]));
    return (
      <div className="h-full p-6 overflow-auto">
        <div className="mx-auto w-full max-w-4xl px-4">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Questions</h2>
            </div>
            <div className="p-6 space-y-8">
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="pb-6 border-b last:border-b-0 border-gray-200">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Question {qIndex + 1}</span>
                    <span className="text-xs font-medium text-gray-500">
                      {q.type === 'comprehension' ? 'Comprehension' : 'Vocabulary'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {q.type === 'vocabulary' && q.word
                      ? (
                        <>What does the word "{q.word}" most likely mean in the sentence below?</>
                      )
                      : (q.text || q.question || 'Question text not available')}
                  </h3>
                  {q.context && (
                    <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-700 italic">"{renderHighlighted(q.context, q.word)}"</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {q.options.map((option, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isSelected = answers[qIndex] === letter;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => (onAnswerAtIndex ? onAnswerAtIndex(qIndex, letter) : onAnswer(letter))}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                              : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                          }`}
                        >
                          <span className="font-medium">{letter}.</span> {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => onSubmit && onSubmit()}
                disabled={!allAnswered}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !allAnswered ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Submit Answers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6 overflow-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium text-gray-600">
            {currentQuestion.type === 'comprehension' ? 'Comprehension' : 'Vocabulary'}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className="h-2 bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {currentQuestion.type === 'vocabulary' && currentQuestion.word
            ? (
              <>What does the word "{currentQuestion.word}" most likely mean in the sentence below?</>
            )
            : (currentQuestion.text || currentQuestion.question || 'Question text not available')}
        </h2>
        
        {/* Context for vocabulary questions */}
        {currentQuestion.context && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700 italic">
              "{renderHighlighted(currentQuestion.context, currentQuestion.word)}"
            </p>
          </div>
        )}

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, D
            const isSelected = answers[currentQuestionIndex] === letter;

            return (
              <button
                key={index}
                onClick={() => onAnswer(letter)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                <span className="font-medium">{letter}.</span> {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={onPrevious}
          disabled={currentQuestionIndex === 0}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentQuestionIndex === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={!hasAnswered}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !hasAnswered
              ? 'bg-blue-300 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLastQuestion ? 'Submit Answers' : 'Next Question'}
        </button>
      </div>

      {/* Question Navigation */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Question Navigation</h4>
        <div className="grid grid-cols-5 gap-2">
          {questions.map((_, index) => {
            const isAnswered = answers[index];
            const isCurrent = index === currentQuestionIndex;
            
            return (
              <button
                key={index}
                onClick={() => {
                  // Allow navigation to answered questions or the next unanswered question
                  if (isAnswered || index <= Math.max(...Object.keys(answers).map(Number), -1) + 1) {
                    if (onQuestionIndexChange) {
                      onQuestionIndexChange(index);
                    }
                  }
                }}
                className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : isAnswered
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-500 border border-gray-300'
                }`}
                disabled={!isAnswered && index > Math.max(...Object.keys(answers).map(Number), -1) + 1}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AssessmentQuestionPane;
