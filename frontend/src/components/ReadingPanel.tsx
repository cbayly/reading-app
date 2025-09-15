import React, { useState } from 'react';
import { Day, Story } from '@/types/weekly-plan';

interface ReadingPanelProps {
  day: Day;
  story: Story | undefined;
  isReadOnly?: boolean;
}

export default function ReadingPanel({ day, story, isReadOnly = false }: ReadingPanelProps) {
  // For Day 4, start with all chapters collapsed. For other days, start with all expanded.
  const [expandedChapters, setExpandedChapters] = useState<number[]>(
    day.dayIndex === 4 ? [] : [1, 2, 3]
  );

  if (!story) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Reading Content</h2>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📚</div>
          <p className="text-gray-600">Story content not available</p>
        </div>
      </div>
    );
  }

  const getChaptersForDay = (dayIndex: number) => {
    // Generate meaningful chapter titles based on story theme
    const generateChapterTitles = () => {
      const theme = story.themes[0]?.toLowerCase() || 'adventure';
      
      // Create chapter titles based on common story structure and theme
      const titles = {
        1: `The Beginning: ${story.themes[0] || 'Adventure'} Begins`,
        2: `The Challenge: Facing ${story.themes[0] || 'Obstacles'}`,
        3: `The Resolution: ${story.themes[0] || 'Triumph'} and Growth`
      };
      
      // Customize based on specific themes
      if (theme.includes('music')) {
        return {
          1: 'The First Note: Discovering Music',
          2: 'The Melody: Practice and Perseverance', 
          3: 'The Harmony: Finding Your Voice'
        };
      } else if (theme.includes('chili') || theme.includes('cooking')) {
        return {
          1: 'The Recipe: Learning the Basics',
          2: 'The Heat: Facing Challenges',
          3: 'The Flavor: Perfecting the Craft'
        };
      } else if (theme.includes('friendship')) {
        return {
          1: 'The Meeting: New Friends',
          2: 'The Test: Overcoming Differences',
          3: 'The Bond: True Friendship'
        };
      } else if (theme.includes('courage') || theme.includes('bravery')) {
        return {
          1: 'The Call: Facing Fears',
          2: 'The Journey: Building Courage',
          3: 'The Victory: Overcoming Obstacles'
        };
      }
      
      return titles;
    };

    const chapterTitles = generateChapterTitles();

    switch (dayIndex) {
      case 1:
        return [{ number: 1, title: chapterTitles[1], content: story.part1 }];
      case 2:
        return [{ number: 2, title: chapterTitles[2], content: story.part2 }];
      case 3:
        return [{ number: 3, title: chapterTitles[3], content: story.part3 }];
      case 4:
        return [
          { number: 1, title: chapterTitles[1], content: story.part1 },
          { number: 2, title: chapterTitles[2], content: story.part2 },
          { number: 3, title: chapterTitles[3], content: story.part3 }
        ];
      case 5:
        return []; // Day 5 doesn't have reading content
      default:
        return [];
    }
  };

  const toggleChapter = (chapterNumber: number) => {
    setExpandedChapters(prev => 
      prev.includes(chapterNumber)
        ? prev.filter(num => num !== chapterNumber)
        : [...prev, chapterNumber]
    );
  };

  const chapters = getChaptersForDay(day.dayIndex);

  if (chapters.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Reading Content</h2>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎨</div>
          <p className="text-gray-600">No reading content for this day</p>
          <p className="text-sm text-gray-500 mt-2">Focus on the creative activities!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Reading Content</h2>
        {day.dayIndex === 4 && (
          <div className="flex gap-2">
            <button
              onClick={() => setExpandedChapters([1, 2, 3])}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={() => setExpandedChapters([])}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      {/* Story Title and Themes */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{story.title}</h3>
        <div className="flex flex-wrap gap-2">
          {story.themes.map((theme, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded-full"
            >
              {theme}
            </span>
          ))}
        </div>
      </div>

      {/* Chapters */}
      <div className="space-y-4">
        {chapters.map((chapter) => {
          const isExpanded = expandedChapters.includes(chapter.number);
          const isDay4 = day.dayIndex === 4;

          return (
            <div key={chapter.number} className="border rounded-lg overflow-hidden">
              {/* Chapter Header */}
              <div 
                className={`p-4 transition-colors ${
                  isDay4 
                    ? 'hover:bg-gray-50 cursor-pointer' 
                    : 'bg-gray-50'
                }`}
                onClick={() => isDay4 && toggleChapter(chapter.number)}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">
                    {chapter.title}
                  </h4>
                  {isDay4 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Chapter Content */}
              {(!isDay4 || isExpanded) && (
                <div className="p-4 border-t">
                  <div className="prose prose-sm max-w-none no-hyphens">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {chapter.content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Vocabulary Section (for Day 1) */}
      {day.dayIndex === 1 && story.vocabulary && story.vocabulary.length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-gray-900 mb-3">Key Vocabulary from the Story</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {story.vocabulary.map((vocab, index) => (
              <div key={index} className="bg-white p-3 rounded border">
                <div className="font-medium text-gray-900">{vocab.word}</div>
                <div className="text-sm text-gray-600">{vocab.definition}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reading Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">Reading Instructions</h4>
        <div className="text-sm text-gray-600 space-y-2">
          {day.dayIndex === 1 && (
            <p>📖 Read the first chapter carefully. Pay attention to the vocabulary words highlighted above - you'll need to match them with their definitions in the activity.</p>
          )}
          {day.dayIndex === 2 && (
            <p>📖 Read the second chapter and think about the main events, characters, and their actions. You'll be asked comprehension questions about this chapter.</p>
          )}
          {day.dayIndex === 3 && (
            <p>📖 Read the final chapter and reflect on the story's ending. Think about what you liked and what could be improved.</p>
          )}
          {day.dayIndex === 4 && (
            <p>📖 Review all three chapters. Chapters start collapsed by default - click on each chapter title to expand it and read the content. You can also use the "Expand All" button to see everything at once.</p>
          )}
          {day.dayIndex === 5 && (
            <p>🎨 No reading required for Day 5! Focus on the creative activities that will help you engage with the story in new ways.</p>
          )}
        </div>
      </div>
    </div>
  );
}
