// This file contains the logic for interacting with the OpenAI API
// to generate reading passages and questions for assessments.

import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Word count ranges by grade level for reading passages.
 */
const WORD_COUNT_RANGES = {
  1: { min: 150, max: 200 },
  2: { min: 175, max: 225 },
  3: { min: 200, max: 250 },
  4: { min: 250, max: 325 },
  5: { min: 300, max: 375 },
  6: { min: 350, max: 425 },
  7: { min: 400, max: 500 },
  8: { min: 450, max: 550 },
  9: { min: 500, max: 600 },
  10: { min: 600, max: 700 },
  11: { min: 700, max: 800 },
  12: { min: 800, max: 900 },
};

/**
 * Gets the most recent completed assessment for a student.
 * @param {number} studentId - The student's ID.
 * @returns {Promise<object|null>} - The most recent assessment or null if none found.
 */
async function getMostRecentAssessment(studentId) {
  try {
    const assessment = await prisma.assessment.findFirst({
      where: {
        studentId: studentId,
        status: 'completed',
        readingLevelLabel: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    });
    return assessment;
  } catch (error) {
    console.error('Error fetching most recent assessment:', error);
    return null;
  }
}

/**
 * Adjusts the grade level based on the most recent assessment's reading level.
 * @param {number} currentGrade - The student's current grade level.
 * @param {string|null} readingLevelLabel - The reading level from the most recent assessment.
 * @returns {number} - The adjusted grade level.
 */
function adjustGradeLevel(currentGrade, readingLevelLabel) {
  if (!readingLevelLabel) {
    return currentGrade;
  }

  switch (readingLevelLabel) {
    case 'Above Grade Level':
      return Math.min(currentGrade + 1, 12);
    case 'At Grade Level':
      return currentGrade;
    case 'Slightly Below Grade Level':
      return Math.max(currentGrade - 1, 1);
    case 'Below Grade Level':
      return Math.max(currentGrade - 2, 1);
    default:
      return currentGrade;
  }
}

/**
 * Gets the word count range for a given grade level.
 * @param {number} gradeLevel - The grade level (1-12).
 * @returns {object} - Object with min and max word count.
 */
function getWordCountRange(gradeLevel) {
  const clampedGrade = Math.max(1, Math.min(12, gradeLevel));
  return WORD_COUNT_RANGES[clampedGrade];
}

/**
 * Selects a random interest from the student's interests.
 * @param {string} interests - Comma-separated string of interests.
 * @returns {string} - A randomly selected interest.
 */
function selectRandomInterest(interests) {
  const interestList = interests.split(',').map(interest => interest.trim());
  return interestList[Math.floor(Math.random() * interestList.length)];
}

/**
 * Constructs the prompt for the OpenAI API to generate an assessment.
 * @param {object} student - The student object from the database.
 * @param {string} selectedInterest - The randomly selected interest to focus on.
 * @param {number} adjustedGradeLevel - The adjusted grade level based on previous assessments.
 * @returns {string} - The formatted prompt string.
 */
function constructPrompt(student, selectedInterest, adjustedGradeLevel) {
  const wordCountRange = getWordCountRange(adjustedGradeLevel);
  const targetWordCount = Math.floor((wordCountRange.min + wordCountRange.max) / 2);

  return `
    Please generate a short story suitable for a grade ${adjustedGradeLevel} student.
    The story should be between ${wordCountRange.min} and ${wordCountRange.max} words long (target: approximately ${targetWordCount} words).
    The story should focus specifically on the topic of: ${selectedInterest}.
    The story must be age-appropriate and engaging for the grade level.

    After the story, please generate 8 multiple-choice questions based on the text:
    - 4 comprehension questions (e.g., main idea, inference, detail retrieval).
    - 4 vocabulary questions about specific words in the story. For vocabulary questions, include the sentence or phrase from the passage that contains the vocabulary word in the "context" field.

    Return the entire response as a single, valid JSON object. Do not include any text or markdown formatting outside of the JSON object.
    The "options" array should contain four strings with the option text only, without any prefixes like "A.", "B.", etc.
    For vocabulary questions, include a "context" field with the sentence or phrase from the passage that contains the vocabulary word.
    The JSON object must have the following structure:
    {
      "passage": "The full text of the story...",
      "questions": [
        {
          "type": "comprehension" or "vocabulary",
          "text": "The full question text (e.g., 'What did the main character do first?')",
          "options": ["Just the text for option A", "Just the text for option B", "Just the text for option C", "Just the text for option D"],
          "correctAnswer": "A",
          "context": "For vocabulary questions, include the relevant sentence or phrase from the passage"
        }
      ]
    }
    
    IMPORTANT: Make sure each question has a clear, complete question text in the "text" field. The question should be a full sentence that asks what the student needs to answer.
  `;
}

/**
 * Generates a 3-chapter story for a weekly plan.
 * @param {object} student - The student object from the database.
 * @param {string} interest - The selected interest theme for the story.
 * @returns {Promise<object>} - A promise that resolves to an object containing the 3 chapters.
 */
export async function generateStory(student, interest) {
  try {
    // Get the most recent assessment to determine reading level
    const mostRecentAssessment = await getMostRecentAssessment(student.id);
    
    // Adjust the grade level based on previous reading performance
    const adjustedGradeLevel = adjustGradeLevel(
      student.gradeLevel, 
      mostRecentAssessment?.readingLevelLabel
    );
    
    // Calculate student age
    const studentAge = new Date().getFullYear() - student.birthday.getFullYear();
    
    // Get incorrect words from the most recent assessment
    const incorrectWords = mostRecentAssessment?.studentAnswers ? 
      Object.entries(mostRecentAssessment.studentAnswers)
        .filter(([_, answer]) => answer !== mostRecentAssessment.questions[parseInt(_)].correctAnswer)
        .map(([index, _]) => mostRecentAssessment.questions[parseInt(index)].text)
        .join(', ') : '';
    
    const storyPrompt = `
You are an expert children's reading specialist and storyteller. 
Generate a 3-chapter short story for a student.

Requirements:
- Audience: A ${studentAge}-year-old student in grade ${student.gradeLevel}.
- Reading Level: Chapter 1 should be at the student's current reading level: ${adjustedGradeLevel}. 
  Chapters 2 and 3 should be approximately ½ a level higher.
- Interest Theme: The story should be about ${interest}.
- Word Reinforcement: Incorporate the following words naturally in the story, ensuring they appear 
  multiple times for practice: ${incorrectWords || 'grade-appropriate vocabulary'}.
- Engagement:
  - Each chapter should be 300–500 words.
  - Chapters 1 and 2 must end with a cliffhanger.
  - Include vivid descriptions and age-appropriate dialogue.
- Tone: Fun, engaging, encouraging, while slightly challenging.
- Output: Divide clearly into "Chapter 1," "Chapter 2," and "Chapter 3."

At the end of each chapter, output a 1-sentence summary labeled as "Chapter Summary."

Return the entire response as a single, valid JSON object with the following structure:
{
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "Chapter Title",
      "content": "Chapter content...",
      "summary": "Chapter summary..."
    },
    {
      "chapterNumber": 2,
      "title": "Chapter Title", 
      "content": "Chapter content...",
      "summary": "Chapter summary..."
    },
    {
      "chapterNumber": 3,
      "title": "Chapter Title",
      "content": "Chapter content...", 
      "summary": "Chapter summary..."
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: storyPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI API returned an empty response.');
    }

    // Parse the JSON string into an object
    const storyData = JSON.parse(content);
    
    console.log(`Successfully generated 3-chapter story for student: ${student.name}`);
    console.log(`- Interest Theme: ${interest}`);
    console.log(`- Adjusted Grade Level: ${adjustedGradeLevel}`);
    console.log(`- Chapters Generated: ${storyData.chapters.length}`);
    
    return storyData;

  } catch (error) {
    console.error('Error generating story from OpenAI:', error);
    throw new Error(`Failed to generate story: ${error.message}`);
  }
}

/**
 * Generates comprehension questions for a chapter.
 * @param {string} chapterText - The text content of the chapter.
 * @param {object} student - The student object from the database.
 * @returns {Promise<object>} - A promise that resolves to an object containing comprehension questions.
 */
export async function generateComprehensionQuestions(chapterText, student) {
  try {
    // Get the most recent assessment to determine reading level
    const mostRecentAssessment = await getMostRecentAssessment(student.id);
    
    // Adjust the grade level based on previous reading performance
    const adjustedGradeLevel = adjustGradeLevel(
      student.gradeLevel, 
      mostRecentAssessment?.readingLevelLabel
    );
    
    // Calculate student age
    const studentAge = new Date().getFullYear() - student.birthday.getFullYear();
    
    const comprehensionPrompt = `
You are an expert children's reading specialist. 
Based on the following story chapter, generate 4 comprehension questions 
appropriate for a ${studentAge}-year-old student in grade ${student.gradeLevel}.

Story Chapter:
${chapterText}

Requirements:
- Questions should align with reading level ${adjustedGradeLevel}.
- Mix:
  - 1 literal (recall)
  - 1 inferential (why/how)
  - 1 prediction/connection
  - 1 vocabulary-in-context
- Each question should have 4 options (A–D).
- Clearly indicate the correct answer.

Return the entire response as a single, valid JSON object with the following structure:
{
  "questions": [
    {
      "type": "comprehension",
      "text": "The full question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A"
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: comprehensionPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI API returned an empty response.');
    }

    // Parse the JSON string into an object
    const questionData = JSON.parse(content);
    
    console.log(`Successfully generated ${questionData.questions.length} comprehension questions for student: ${student.name}`);
    
    return questionData;

  } catch (error) {
    console.error('Error generating comprehension questions from OpenAI:', error);
    throw new Error(`Failed to generate comprehension questions: ${error.message}`);
  }
}

/**
 * Generates vocabulary activities for a chapter.
 * @param {string} chapterText - The text content of the chapter.
 * @param {object} student - The student object from the database.
 * @returns {Promise<object>} - A promise that resolves to an object containing vocabulary activities.
 */
export async function generateVocabularyActivities(chapterText, student) {
  try {
    // Get the most recent assessment to determine reading level
    const mostRecentAssessment = await getMostRecentAssessment(student.id);
    
    // Adjust the grade level based on previous reading performance
    const adjustedGradeLevel = adjustGradeLevel(
      student.gradeLevel, 
      mostRecentAssessment?.readingLevelLabel
    );
    
    // Calculate student age
    const studentAge = new Date().getFullYear() - student.birthday.getFullYear();
    
    // Get incorrect words from the most recent assessment
    const incorrectWords = mostRecentAssessment?.studentAnswers ? 
      Object.entries(mostRecentAssessment.studentAnswers)
        .filter(([_, answer]) => answer !== mostRecentAssessment.questions[parseInt(_)].correctAnswer)
        .map(([index, _]) => mostRecentAssessment.questions[parseInt(index)].text)
        .join(', ') : '';
    
    const vocabularyPrompt = `
You are an expert children's reading specialist. 
Based on the following story chapter, generate 4 vocabulary practice questions 
for a ${studentAge}-year-old student in grade ${student.gradeLevel}.

Story Chapter:
${chapterText}

Requirements:
- Include target words: ${incorrectWords || 'key vocabulary from the chapter'} if present. 
- If fewer than 4, choose key words from the chapter.
- Mix:
  - 1 synonym/antonym question
  - 1 context clue question
  - 1 fill-in-the-blank
  - 1 open-ended "use in a sentence"
- Multiple-choice questions must have 4 options (A–D).
- Label open-ended clearly.

Return the entire response as a single, valid JSON object with the following structure:
{
  "activities": [
    {
      "type": "vocabulary",
      "activityType": "synonym_antonym",
      "word": "target_word",
      "text": "What is a synonym for [word]?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A"
    },
    {
      "type": "vocabulary",
      "activityType": "context_clue",
      "word": "target_word",
      "text": "Based on the context, what does [word] mean?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "B"
    },
    {
      "type": "vocabulary",
      "activityType": "fill_blank",
      "word": "target_word",
      "text": "Complete the sentence: The character felt [blank] when...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "C"
    },
    {
      "type": "vocabulary",
      "activityType": "open_ended",
      "word": "target_word",
      "text": "Use the word '[word]' in a sentence of your own.",
      "isOpenEnded": true
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: vocabularyPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI API returned an empty response.');
    }

    // Parse the JSON string into an object
    const vocabularyData = JSON.parse(content);
    
    console.log(`Successfully generated ${vocabularyData.activities.length} vocabulary activities for student: ${student.name}`);
    
    return vocabularyData;

  } catch (error) {
    console.error('Error generating vocabulary activities from OpenAI:', error);
    throw new Error(`Failed to generate vocabulary activities: ${error.message}`);
  }
}

/**
 * Generates game and creative activities for days 4-7 of the weekly plan.
 * @param {object} story - The complete story object with all 3 chapters.
 * @param {object} student - The student object from the database.
 * @returns {Promise<object>} - A promise that resolves to an object containing activities for days 4-7.
 */
export async function generateGameAndCreativeActivities(story, student) {
  try {
    // Get the most recent assessment to determine reading level
    const mostRecentAssessment = await getMostRecentAssessment(student.id);
    
    // Adjust the grade level based on previous reading performance
    const adjustedGradeLevel = adjustGradeLevel(
      student.gradeLevel, 
      mostRecentAssessment?.readingLevelLabel
    );
    
    // Calculate student age
    const studentAge = new Date().getFullYear() - student.birthday.getFullYear();
    
    // Get incorrect words from the most recent assessment
    const incorrectWords = mostRecentAssessment?.studentAnswers ? 
      Object.entries(mostRecentAssessment.studentAnswers)
        .filter(([_, answer]) => answer !== mostRecentAssessment.questions[parseInt(_)].correctAnswer)
        .map(([index, _]) => mostRecentAssessment.questions[parseInt(index)].text)
        .join(', ') : '';
    
    // Combine all chapter content for context
    const fullStoryText = story.chapters.map(chapter => 
      `Chapter ${chapter.chapterNumber}: ${chapter.content}`
    ).join('\n\n');
    
    const gamePrompt = `
You are an expert elementary reading specialist and activity designer.
Generate fun, printable activities tied to the provided 3‑chapter story and topic.

Story Context:
${fullStoryText}

Student Interest: ${student.interests}

Requirements:
- Use the story and student interests as context.
- Activities by day:
  - Day 4: Sequencing puzzle, character choices game, and vocab scavenger hunt.
  - Day 5: Fun facts page, mini‑quiz, and crossword/word search.
  - Day 6: Creative prompt (alternate ending or diary entry) + book cover design.
  - Day 7: Drawing prompt (AI suggests 2–3 key moments). Optionally comic strip retell.
- Ensure age-appropriate language for ${studentAge} in grade ${student.gradeLevel}.
- Vocabulary must reinforce: ${incorrectWords || 'key story vocabulary'}.
- Output should clearly indicate activity type and instructions.

Return the entire response as a single, valid JSON object with the following structure:
{
  "day4": {
    "sequencingPuzzle": {
      "type": "game",
      "title": "Story Sequencing Puzzle",
      "instructions": "Put the story events in the correct order...",
      "events": ["Event 1", "Event 2", "Event 3", "Event 4", "Event 5"],
      "correctOrder": [1, 3, 2, 5, 4]
    },
    "characterChoices": {
      "type": "game",
      "title": "Character Choices Game",
      "instructions": "What would you do if you were the main character?",
      "scenarios": [
        {
          "situation": "The character faces a difficult choice...",
          "options": ["Option A", "Option B", "Option C"],
          "discussion": "Discuss why you chose this option."
        }
      ]
    },
    "vocabScavengerHunt": {
      "type": "game",
      "title": "Vocabulary Scavenger Hunt",
      "instructions": "Find these words in the story and write their meanings...",
      "words": ["word1", "word2", "word3", "word4"]
    }
  },
  "day5": {
    "funFacts": {
      "type": "information",
      "title": "Fun Facts About [Topic]",
      "facts": ["Fact 1", "Fact 2", "Fact 3", "Fact 4", "Fact 5"]
    },
    "miniQuiz": {
      "type": "quiz",
      "title": "Mini Quiz",
      "questions": [
        {
          "question": "Question 1?",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "A"
        }
      ]
    },
    "wordPuzzle": {
      "type": "puzzle",
      "title": "Word Search",
      "instructions": "Find these words in the puzzle...",
      "words": ["word1", "word2", "word3", "word4", "word5"],
      "puzzleGrid": "5x5 grid of letters"
    }
  },
  "day6": {
    "creativeWriting": {
      "type": "creative",
      "title": "Write an Alternate Ending",
      "prompt": "What if the story ended differently? Write your own ending..."
    },
    "characterDiary": {
      "type": "creative",
      "title": "Character Diary Entry",
      "prompt": "Write a diary entry from the main character's perspective..."
    },
    "bookCover": {
      "type": "creative",
      "title": "Design a Book Cover",
      "prompt": "Create a book cover for this story. Include title, author, and illustration ideas..."
    }
  },
  "day7": {
    "drawingPrompt": {
      "type": "creative",
      "title": "Draw a Scene",
      "prompt": "Choose one of these key moments to draw:",
      "suggestedMoments": ["Moment 1", "Moment 2", "Moment 3"]
    },
    "comicStrip": {
      "type": "creative",
      "title": "Comic Strip Retell (Optional)",
      "prompt": "Create a 3-panel comic strip retelling your favorite part of the story..."
    }
  }
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: gamePrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI API returned an empty response.');
    }

    // Parse the JSON string into an object
    const gameData = JSON.parse(content);
    
    console.log(`Successfully generated game and creative activities for days 4-7 for student: ${student.name}`);
    
    return gameData;

  } catch (error) {
    console.error('Error generating game and creative activities from OpenAI:', error);
    throw new Error(`Failed to generate game and creative activities: ${error.message}`);
  }
}

/**
 * Generates a complete weekly plan for a student.
 * @param {object} student - The student object from the database.
 * @returns {Promise<object>} - A promise that resolves to the complete weekly plan data structure.
 */
export async function generateFullWeeklyPlan(student) {
  try {
    console.log(`Starting weekly plan generation for student: ${student.name}`);
    
    // Select a random interest from the student's interests
    const selectedInterest = selectRandomInterest(student.interests);
    console.log(`Selected interest theme: ${selectedInterest}`);
    
    // Generate the 3-chapter story
    console.log('Generating 3-chapter story...');
    const storyData = await generateStory(student, selectedInterest);
    
    // Generate activities for each day
    const weeklyPlan = {
      studentId: student.id,
      interestTheme: selectedInterest,
      chapters: storyData.chapters,
      dailyActivities: []
    };
    
    // Day 1: Story Kickoff
    console.log('Generating Day 1 activities...');
    const day1Comprehension = await generateComprehensionQuestions(storyData.chapters[0].content, student);
    const day1Vocabulary = await generateVocabularyActivities(storyData.chapters[0].content, student);
    
    weeklyPlan.dailyActivities.push({
      dayOfWeek: 1,
      activityType: 'Story Kickoff',
      content: {
        predictionWarmUp: {
          type: 'prediction',
          title: 'Prediction Warm-Up',
          prompt: `Based on the title and your interest in ${selectedInterest}, what do you think this story will be about?`
        },
        chapter1: {
          title: storyData.chapters[0].title,
          content: storyData.chapters[0].content,
          summary: storyData.chapters[0].summary
        },
        vocabularyInContext: day1Vocabulary.activities,
        comprehensionQuestions: day1Comprehension.questions,
        reflectionPrompt: {
          type: 'reflection',
          title: 'Reflection',
          prompt: 'What was your favorite part of Chapter 1 and why?'
        }
      }
    });
    
    // Day 2: Building Connections
    console.log('Generating Day 2 activities...');
    const day2Comprehension = await generateComprehensionQuestions(storyData.chapters[1].content, student);
    const day2Vocabulary = await generateVocabularyActivities(storyData.chapters[1].content, student);
    
    weeklyPlan.dailyActivities.push({
      dayOfWeek: 2,
      activityType: 'Building Connections',
      content: {
        chapter1Review: {
          type: 'review',
          title: 'Quick Review of Chapter 1',
          questions: [
            'What was the main problem in Chapter 1?',
            'Who are the main characters?',
            'What happened at the end of Chapter 1?'
          ]
        },
        chapter2: {
          title: storyData.chapters[1].title,
          content: storyData.chapters[1].content,
          summary: storyData.chapters[1].summary
        },
        vocabularyWordMap: day2Vocabulary.activities,
        comprehensionQuestions: day2Comprehension.questions,
        characterSpotlight: {
          type: 'character',
          title: 'Character Spotlight',
          prompt: 'If you could ask the main character one question, what would it be?'
        }
      }
    });
    
    // Day 3: Story Climax
    console.log('Generating Day 3 activities...');
    const day3Comprehension = await generateComprehensionQuestions(storyData.chapters[2].content, student);
    const day3Vocabulary = await generateVocabularyActivities(storyData.chapters[2].content, student);
    
    weeklyPlan.dailyActivities.push({
      dayOfWeek: 3,
      activityType: 'Story Climax',
      content: {
        chapter2Review: {
          type: 'review',
          title: 'Quick Review of Chapter 2',
          questions: [
            'What new problem arose in Chapter 2?',
            'How did the characters try to solve it?',
            'What was the cliffhanger at the end?'
          ]
        },
        chapter3: {
          title: storyData.chapters[2].title,
          content: storyData.chapters[2].content,
          summary: storyData.chapters[2].summary
        },
        vocabularyChallenge: day3Vocabulary.activities,
        comprehensionQuestions: day3Comprehension.questions,
        quickRetell: {
          type: 'retell',
          title: 'Quick Retell',
          prompt: 'In your own words, tell the story from beginning to end in 3-4 sentences.'
        }
      }
    });
    
    // Days 4-7: Games and Creative Activities
    console.log('Generating Days 4-7 activities...');
    const gameActivities = await generateGameAndCreativeActivities(storyData, student);
    
    // Day 4: Story Review & Game
    weeklyPlan.dailyActivities.push({
      dayOfWeek: 4,
      activityType: 'Story Review & Game',
      content: gameActivities.day4
    });
    
    // Day 5: Topic Exploration
    weeklyPlan.dailyActivities.push({
      dayOfWeek: 5,
      activityType: 'Topic Exploration',
      content: gameActivities.day5
    });
    
    // Day 6: Creative Expression (Optional)
    weeklyPlan.dailyActivities.push({
      dayOfWeek: 6,
      activityType: 'Creative Expression',
      content: gameActivities.day6
    });
    
    // Day 7: Visual & Reflective (Optional)
    weeklyPlan.dailyActivities.push({
      dayOfWeek: 7,
      activityType: 'Visual & Reflective',
      content: gameActivities.day7
    });
    
    console.log(`Successfully generated complete weekly plan for student: ${student.name}`);
    console.log(`- Interest Theme: ${selectedInterest}`);
    console.log(`- Chapters Generated: ${storyData.chapters.length}`);
    console.log(`- Daily Activities Generated: ${weeklyPlan.dailyActivities.length}`);
    
    return weeklyPlan;
    
  } catch (error) {
    console.error('Error generating full weekly plan:', error);
    throw new Error(`Failed to generate full weekly plan: ${error.message}`);
  }
}

/**
 * Generates a reading passage and questions for a student assessment.
 * @param {object} student - The student object from the database.
 * @returns {Promise<object>} - A promise that resolves to an object containing the passage and questions.
 */
export async function generateAssessment(student) {
  try {
    // Get the most recent assessment to determine reading level
    const mostRecentAssessment = await getMostRecentAssessment(student.id);
    
    // Adjust the grade level based on previous reading performance
    const adjustedGradeLevel = adjustGradeLevel(
      student.gradeLevel, 
      mostRecentAssessment?.readingLevelLabel
    );
    
    // Select a random interest from the student's interests
    const selectedInterest = selectRandomInterest(student.interests);
    
    console.log(`Generating assessment for student: ${student.name}`);
    console.log(`- Original Grade: ${student.gradeLevel}`);
    console.log(`- Previous Reading Level: ${mostRecentAssessment?.readingLevelLabel || 'None'}`);
    console.log(`- Adjusted Grade Level: ${adjustedGradeLevel}`);
    console.log(`- Selected Interest: ${selectedInterest}`);
    
    const wordCountRange = getWordCountRange(adjustedGradeLevel);
    console.log(`- Target Word Count: ${wordCountRange.min}-${wordCountRange.max} words`);
    
    const prompt = constructPrompt(student, selectedInterest, adjustedGradeLevel);

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI API returned an empty response.');
    }

    // Parse the JSON string into an object
    const assessmentData = JSON.parse(content);
    
    // Log the actual word count of the generated passage
    const actualWordCount = assessmentData.passage.split(/\s+/).length;
    console.log(`- Generated Passage Word Count: ${actualWordCount} words`);
    console.log(`Successfully generated assessment for student: ${student.name}`);
    
    return assessmentData;

  } catch (error) {
    console.error('Error generating assessment from OpenAI:', error);
    
    // Provide more specific error messages
    if (error.code === 'invalid_api_key') {
      throw new Error('OpenAI API key is invalid or missing. Please check your environment variables.');
    } else if (error.code === 'model_not_found') {
      throw new Error('The specified OpenAI model is not available. Please check the model configuration.');
    } else {
      // In a real application, you might have more sophisticated fallback logic,
      // like using a pre-written passage from a database.
      throw new Error(`Failed to generate assessment: ${error.message}`);
    }
  }
}
