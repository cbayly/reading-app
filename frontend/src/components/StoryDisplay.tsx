import React, { useState } from 'react';
import { Chapter } from '@/types/weekly-plan';

interface StoryDisplayProps {
  chapters: Chapter[];
  onChapterChange?: (chapterIndex: number) => void;
  className?: string;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ 
  chapters, 
  onChapterChange,
  className = '' 
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isReadingMode, setIsReadingMode] = useState(false);

  const currentChapter = chapters[currentChapterIndex];

  const handleChapterChange = (index: number) => {
    if (index >= 0 && index < chapters.length) {
      setCurrentChapterIndex(index);
      onChapterChange?.(index);
    }
  };

  const toggleReadingMode = () => {
    setIsReadingMode(!isReadingMode);
  };

  if (!chapters || chapters.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-lg font-semibold mb-2">No Chapters Available</h3>
          <p>Chapters will appear here once the story is generated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Header with navigation */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Story Chapters</h2>
            <p className="text-blue-100 text-sm">
              Chapter {currentChapterIndex + 1} of {chapters.length}
            </p>
          </div>
          <button
            onClick={toggleReadingMode}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            {isReadingMode ? '📖 Exit Reading' : '📖 Reading Mode'}
          </button>
        </div>
      </div>

      {/* Chapter navigation */}
      <div className="bg-gray-50 p-4 border-b">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleChapterChange(currentChapterIndex - 1)}
            disabled={currentChapterIndex === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          
          <div className="flex space-x-2">
            {chapters.map((_, index) => (
              <button
                key={index}
                onClick={() => handleChapterChange(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  index === currentChapterIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleChapterChange(currentChapterIndex + 1)}
            disabled={currentChapterIndex === chapters.length - 1}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Chapter content */}
      <div className={`p-6 ${isReadingMode ? 'max-w-4xl mx-auto' : ''}`}>
        {currentChapter && (
          <div className="space-y-6">
            {/* Chapter title */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {currentChapter.title}
              </h3>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded"></div>
            </div>

            {/* Chapter content */}
            <div className={`prose prose-lg max-w-none no-hyphens ${
              isReadingMode 
                ? 'text-lg leading-relaxed font-serif' 
                : 'text-base leading-normal'
            }`}>
              <div className="whitespace-pre-wrap text-gray-700">
                {currentChapter.content}
              </div>
            </div>

            {/* Chapter summary */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Chapter Summary</h4>
              <p className="text-blue-700 text-sm leading-relaxed">
                {currentChapter.summary}
              </p>
            </div>

            {/* Reading progress indicator */}
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Reading Progress</span>
                <span>{Math.round(((currentChapterIndex + 1) / chapters.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentChapterIndex + 1) / chapters.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with chapter info */}
      <div className="bg-gray-50 p-4 border-t">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <span className="font-medium">Chapter {currentChapterIndex + 1}</span>
            <span className="mx-2">•</span>
            <span>{currentChapter?.title}</span>
          </div>
          <div>
            <span>Created: {currentChapter?.createdAt ? new Date(currentChapter.createdAt).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryDisplay; 