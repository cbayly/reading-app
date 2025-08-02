// This file contains the logic for interacting with the OpenAI API
// to generate reading passages and questions for assessments.

import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { 
  logAIRequestWithCapture, 
  CONTENT_TYPES 
} from './logging.js';

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
You are an expert children's storyteller creating a 3-chapter story for a ${studentAge}-year-old student interested in ${interest}.

🚨 CRITICAL REQUIREMENTS - READ CAREFULLY 🚨

📏 LENGTH REQUIREMENTS (NON-NEGOTIABLE):
- Each chapter MUST be EXACTLY 300-500 words
- Count every word carefully before submitting
- Stories under 300 words will be automatically rejected and regenerated
- This is a strict requirement - do not submit short chapters
- WRITE MORE - aim for 400-450 words per chapter
- Do not stop writing until you reach the minimum word count
- IMPORTANT: Write detailed descriptions, include multiple dialogue exchanges, and expand on every scene

🎯 THEME REQUIREMENTS (MOST IMPORTANT):
- The ENTIRE story must be about ${interest} and nothing else
- Every character, setting, conflict, and resolution must relate to ${interest}
- If the theme is "religion", create a story about religious values, traditions, or spiritual growth
- If the theme is "drums", create a story about drumming, percussion, or musical rhythm
- If the theme is "cats", create a story about cats and their adventures
- NO unrelated topics or tangential plot elements
- ${interest} must be the central focus of every chapter

📖 STORY STRUCTURE:
- Chapter 1: Introduce protagonist and ${interest}-related conflict (300-500 words)
- Chapter 2: Develop the ${interest}-centered challenge (300-500 words)
- Chapter 3: Resolve the ${interest}-based problem with a satisfying ending (300-500 words)

👤 CHARACTER REQUIREMENTS:
- Protagonist should be ${studentAge}-${studentAge + 2} years old
- Character must have a strong connection to ${interest}
- Character's journey must revolve around ${interest}

🎨 WRITING QUALITY:
- Include 3-5 pieces of natural dialogue per chapter (use quotation marks)
- Add vivid sensory details (sight, sound, touch, smell, taste)
- Use descriptive language that creates mental pictures
- Make each chapter engaging and age-appropriate
- Write in proper paragraphs with clear structure

📚 READING LEVEL:
- Start at grade ${adjustedGradeLevel} level
- Progress slightly in difficulty across chapters
- Use vocabulary appropriate for the student's age

⚠️ VALIDATION CHECKLIST (VERIFY BEFORE SUBMITTING):
□ Each chapter is 300-500 words exactly
□ Story is entirely about ${interest}
□ Protagonist is age-appropriate
□ Includes dialogue and sensory details
□ Has a clear beginning, middle, and end
□ Proper paragraph structure and formatting

🚨 FINAL WARNING: This story will be read by a child who deserves high-quality content. 
   Do not submit anything that doesn't meet these standards.
   If you cannot meet these requirements, regenerate until you can.

OUTPUT FORMAT: Valid JSON only. Do not include any text outside the JSON structure.

JSON STRUCTURE (copy exactly):
{
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "Chapter Title",
      "content": "Full chapter content...",
      "summary": "1-sentence summary"
    },
    {
      "chapterNumber": 2,
      "title": "Chapter Title", 
      "content": "Full chapter content...",
      "summary": "1-sentence summary"
    },
    {
      "chapterNumber": 3,
      "title": "Chapter Title",
      "content": "Full chapter content...",
      "summary": "1-sentence summary"
    }
  ]
}
`;

    const aiFunction = async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: storyPrompt }],
        temperature: 0.7,
        max_tokens: 4000,
      });
    };

    const modelConfig = {
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4000,
      reasoning: 'Creative narrative generation for engaging children\'s stories',
      isOverride: false
    };

    const result = await logAIRequestWithCapture({
      contentType: CONTENT_TYPES.STORY_CREATION,
      aiFunction,
      modelConfig,
      metadata: {
        studentId: student.id,
        studentName: student.name,
        interest: interest,
        adjustedGradeLevel,
        studentAge: new Date().getFullYear() - student.birthday.getFullYear()
      }
    });

    const content = result.result.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI API returned an empty response.');
    }

    // Parse the JSON string into an object
    let storyData;
    try {
      storyData = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw content:', content);
      
      // Try to clean the JSON and parse again
      try {
        let cleanedContent = content;
        // Remove any leading/trailing code block markers (``` or ```json)
        cleanedContent = cleanedContent.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
        // Now extract the JSON object
        const startIndex = cleanedContent.indexOf('{');
        const endIndex = cleanedContent.lastIndexOf('}') + 1;
        cleanedContent = cleanedContent.substring(startIndex, endIndex);
        storyData = JSON.parse(cleanedContent);
        console.log('Successfully parsed after cleaning JSON');
      } catch (cleanError) {
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
    }
    
    // Validate chapter lengths and theme adherence
    let needsRegeneration = false;
    let themeIssues = [];
    let qualityIssues = [];
    
    storyData.chapters.forEach((chapter, index) => {
      const wordCount = chapter.content.split(' ').length;
      console.log(`Chapter ${index + 1} word count: ${wordCount}`);
      
      if (wordCount < 300) {
        console.warn(`Chapter ${index + 1} is too short (${wordCount} words). Minimum required: 300 words.`);
        needsRegeneration = true;
        qualityIssues.push(`Chapter ${index + 1} is too short (${wordCount} words)`);
      }
      
      // Check theme adherence
      const contentLower = chapter.content.toLowerCase();
      const interestLower = interest.toLowerCase();
      const titleLower = chapter.title.toLowerCase();
      
      // Check if the theme appears in the content or title
      if (!contentLower.includes(interestLower) && !titleLower.includes(interestLower)) {
        themeIssues.push(`Chapter ${index + 1} does not mention the theme "${interest}"`);
        needsRegeneration = true;
      }
      
      // Check for proper dialogue formatting
      const dialogueCount = (chapter.content.match(/"/g) || []).length;
      if (dialogueCount < 4) { // At least 2 dialogue exchanges (4 quotes)
        qualityIssues.push(`Chapter ${index + 1} lacks proper dialogue (only ${dialogueCount} quotes found)`);
        needsRegeneration = true;
      }
      
      // Check for paragraph structure
      if (!chapter.content.includes('\n') && chapter.content.length > 500) {
        qualityIssues.push(`Chapter ${index + 1} lacks proper paragraph structure`);
        needsRegeneration = true;
      }
    });
    
    if (themeIssues.length > 0) {
      console.warn('Theme adherence issues found:', themeIssues);
    }
    
    if (qualityIssues.length > 0) {
      console.warn('Quality issues found:', qualityIssues);
    }
    
    if (needsRegeneration) {
      console.log('Regenerating story due to quality issues...');
      
      let regenerationReason = '';
      if (themeIssues.length > 0) {
        regenerationReason += `\n\n🚨 THEME VIOLATION: The story must be entirely about "${interest}". Every chapter must mention and revolve around this theme.`;
      }
      if (qualityIssues.length > 0) {
        regenerationReason += `\n\n📝 QUALITY ISSUES: ${qualityIssues.join(', ')}`;
      }
      regenerationReason += '\n\n📏 LENGTH ISSUE: Each chapter MUST be between 300-500 words. Do not stop writing until you reach the minimum word count.';
      regenerationReason += '\n\n🚨 CRITICAL: The previous chapters were too short. You MUST write longer chapters. Aim for 400-450 words each.';
      regenerationReason += '\n\n📝 WRITING TIP: Expand on descriptions, add more dialogue, include more details about the theme.';
      regenerationReason += '\n\n💬 DIALOGUE: Include proper dialogue with quotation marks.';
      regenerationReason += '\n\n📄 STRUCTURE: Use proper paragraph breaks and formatting.';
      
      const regenerationPrompt = storyPrompt + regenerationReason + '\n\n🚨 CRITICAL: Regenerate the story following ALL requirements strictly. The previous version was rejected for quality issues.';
      
      const regenerationAIFunction = async () => {
        return await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: regenerationPrompt }],
          temperature: 0.7,
          max_tokens: 4000,
        });
      };

      const regenerationResult = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.STORY_CREATION,
        aiFunction: regenerationAIFunction,
        modelConfig: {
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 4000,
          reasoning: 'Story regeneration due to quality issues',
          isOverride: false
        },
        metadata: {
          studentId: student.id,
          studentName: student.name,
          interest: interest,
          adjustedGradeLevel,
          isRegeneration: true,
          qualityIssues,
          themeIssues
        }
      });
      
      const regenerationContent = regenerationResult.result.choices[0].message.content;
      if (regenerationContent) {
        let regeneratedStoryData;
        try {
          regeneratedStoryData = JSON.parse(regenerationContent);
        } catch (parseError) {
          console.error('JSON parsing error in regeneration:', parseError);
          console.error('Raw regeneration content:', regenerationContent);
          // Try to clean the JSON and parse again
          try {
            let cleanedContent = regenerationContent;
            // Remove any leading/trailing code block markers (``` or ```json)
            cleanedContent = cleanedContent.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
            // Now extract the JSON object
            const startIndex = cleanedContent.indexOf('{');
            const endIndex = cleanedContent.lastIndexOf('}') + 1;
            cleanedContent = cleanedContent.substring(startIndex, endIndex);
            regeneratedStoryData = JSON.parse(cleanedContent);
            console.log('Successfully parsed regeneration after cleaning JSON');
          } catch (cleanError) {
            throw new Error(`Failed to parse regenerated JSON response: ${parseError.message}`);
          }
        }
        console.log(`Successfully regenerated 3-chapter story for student: ${student.name}`);
        console.log(`- Interest Theme: ${interest}`);
        console.log(`- Adjusted Grade Level: ${adjustedGradeLevel}`);
        console.log(`- Chapters Generated: ${regeneratedStoryData.chapters.length}`);
        return regeneratedStoryData;
      }
    }
    
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
- Questions should focus on the story content and themes, not generic topics.

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

    const aiFunction = async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: comprehensionPrompt }],
        temperature: 0.7,
      });
    };

    const modelConfig = {
      model: 'gpt-4o',
      temperature: 0.7,
      reasoning: 'Structured comprehension question generation for reading assessment',
      isOverride: false
    };

    const result = await logAIRequestWithCapture({
      contentType: CONTENT_TYPES.DAILY_TASK_GENERATION,
      aiFunction,
      modelConfig,
      metadata: {
        studentId: student.id,
        studentName: student.name,
        adjustedGradeLevel,
        studentAge: new Date().getFullYear() - student.birthday.getFullYear(),
        taskType: 'comprehension_questions'
      }
    });

    const content = result.result.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI API returned an empty response.');
    }

    // Parse the JSON string into an object
    let questionData;
    try {
      questionData = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw content:', content);
      
      // Try to clean the JSON and parse again
      try {
        let cleanedContent = content;
        // Remove any leading/trailing code block markers (``` or ```json)
        cleanedContent = cleanedContent.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
        // Now extract the JSON object
        const startIndex = cleanedContent.indexOf('{');
        const endIndex = cleanedContent.lastIndexOf('}') + 1;
        cleanedContent = cleanedContent.substring(startIndex, endIndex);
        questionData = JSON.parse(cleanedContent);
        console.log('Successfully parsed comprehension questions after cleaning JSON');
      } catch (cleanError) {
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
    }
    
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

    const aiFunction = async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: vocabularyPrompt }],
        temperature: 0.7,
      });
    };

    const modelConfig = {
      model: 'gpt-4o',
      temperature: 0.7,
      reasoning: 'Vocabulary activity generation for reading comprehension',
      isOverride: false
    };

    const result = await logAIRequestWithCapture({
      contentType: CONTENT_TYPES.DAILY_TASK_GENERATION,
      aiFunction,
      modelConfig,
      metadata: {
        studentId: student.id,
        studentName: student.name,
        adjustedGradeLevel,
        studentAge: new Date().getFullYear() - student.birthday.getFullYear(),
        taskType: 'vocabulary_activities'
      }
    });

    const content = result.result.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI API returned an empty response.');
    }

    // Parse the JSON string into an object
    let vocabularyData;
    try {
      vocabularyData = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw content:', content);
      
      // Try to clean the JSON and parse again
      try {
        let cleanedContent = content;
        // Remove any leading/trailing code block markers (``` or ```json)
        cleanedContent = cleanedContent.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
        // Now extract the JSON object
        const startIndex = cleanedContent.indexOf('{');
        const endIndex = cleanedContent.lastIndexOf('}') + 1;
        cleanedContent = cleanedContent.substring(startIndex, endIndex);
        vocabularyData = JSON.parse(cleanedContent);
        console.log('Successfully parsed vocabulary activities after cleaning JSON');
      } catch (cleanError) {
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
    }
    
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

CRITICAL REQUIREMENTS:
- ALL activities must be directly related to the story's theme and the student's interest: ${student.interests}.
- Use the story and student interests as context for EVERY activity.
- Activities by day:
  - Day 4: Sequencing puzzle, character choices game, and vocab scavenger hunt.
  - Day 5: Fun facts page, mini‑quiz, and crossword/word search.
  - Day 6: Creative prompt (alternate ending or diary entry) + book cover design.
  - Day 7: Drawing prompt (AI suggests 2–3 key moments). Optionally comic strip retell.
- Ensure age-appropriate language for ${studentAge} in grade ${student.gradeLevel}.
- Vocabulary must reinforce: ${incorrectWords || 'key story vocabulary'}.
- Output should clearly indicate activity type and instructions.
- DO NOT create generic activities. Every activity must connect to the story's specific theme and the student's interest.

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

    const aiFunction = async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: gamePrompt }],
        temperature: 0.8,
      });
    };

    const modelConfig = {
      model: 'gpt-4o',
      temperature: 0.8,
      reasoning: 'Creative game and activity generation for engaging learning experiences',
      isOverride: false
    };

    const result = await logAIRequestWithCapture({
      contentType: CONTENT_TYPES.DAILY_TASK_GENERATION,
      aiFunction,
      modelConfig,
      metadata: {
        studentId: student.id,
        studentName: student.name,
        taskType: 'game_creative_activities'
      }
    });

    const content = result.result.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI API returned an empty response.');
    }

    // Parse the JSON string into an object
    let gameData;
    try {
      gameData = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw content:', content);
      
      // Try to clean the JSON and parse again
      try {
        let cleanedContent = content;
        // Remove any leading/trailing code block markers (``` or ```json)
        cleanedContent = cleanedContent.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
        // Now extract the JSON object
        const startIndex = cleanedContent.indexOf('{');
        const endIndex = cleanedContent.lastIndexOf('}') + 1;
        cleanedContent = cleanedContent.substring(startIndex, endIndex);
        gameData = JSON.parse(cleanedContent);
        console.log('Successfully parsed game activities after cleaning JSON');
      } catch (cleanError) {
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
    }
    
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
export async function generateStoryOnly(student) {
  try {
    console.log(`Starting story-only generation for student: ${student.name}`);
    
    // Select a random interest from the student's interests
    const selectedInterest = selectRandomInterest(student.interests);
    console.log(`Selected interest theme: ${selectedInterest}`);
    
    // Generate the 3-chapter story
    console.log('Generating 3-chapter story...');
    const storyData = await generateStory(student, selectedInterest);
    
    // Create plan structure with just the story (no activities)
    const weeklyPlan = {
      studentId: student.id,
      interestTheme: selectedInterest,
      chapters: storyData.chapters,
      dailyActivities: []
    };
    
    console.log(`Successfully generated story-only plan for student: ${student.name}`);
    console.log(`- Interest Theme: ${selectedInterest}`);
    console.log(`- Chapters Generated: ${storyData.chapters.length}`);
    console.log(`- Daily Activities: 0 (to be generated on-demand)`);
    
    return weeklyPlan;
    
  } catch (error) {
    console.error('Error generating story-only plan:', error);
    throw new Error(`Failed to generate story-only plan: ${error.message}`);
  }
}

export async function generateDayActivity(student, plan, dayOfWeek) {
  try {
    console.log(`Generating Day ${dayOfWeek} activity for student: ${student.name}`);
    
    const interestTheme = plan.interestTheme;
    const chapters = plan.chapters;
    
    // Determine which chapter to use based on day
    let targetChapter;
    let activityType;
    let content = {};
    
    switch (dayOfWeek) {
      case 1:
        // Day 1: Story Kickoff
        targetChapter = chapters[0];
        activityType = 'Story Kickoff';
        
        // Generate comprehension and vocabulary activities for Chapter 1
        const day1Comprehension = await generateComprehensionQuestions(targetChapter.content, student);
        const day1Vocabulary = await generateVocabularyActivities(targetChapter.content, student);
        
        content = {
          predictionWarmUp: {
            type: 'prediction',
            title: 'Prediction Warm-Up',
            prompt: `Based on the title and your interest in ${interestTheme}, what do you think this story will be about?`
          },
          chapter1: {
            title: targetChapter.title,
            content: targetChapter.content,
            summary: targetChapter.summary
          },
          vocabularyInContext: day1Vocabulary.activities,
          comprehensionQuestions: day1Comprehension.questions,
          reflectionPrompt: {
            type: 'reflection',
            title: 'Reflection',
            prompt: 'What was your favorite part of Chapter 1 and why?'
          }
        };
        break;
        
      case 2:
        // Day 2: Building Connections
        targetChapter = chapters[1];
        activityType = 'Building Connections';
        
        const day2Comprehension = await generateComprehensionQuestions(targetChapter.content, student);
        const day2Vocabulary = await generateVocabularyActivities(targetChapter.content, student);
        
        content = {
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
            title: targetChapter.title,
            content: targetChapter.content,
            summary: targetChapter.summary
          },
          vocabularyWordMap: day2Vocabulary.activities,
          comprehensionQuestions: day2Comprehension.questions,
          characterSpotlight: {
            type: 'character',
            title: 'Character Spotlight',
            prompt: 'If you could ask the main character one question, what would it be?'
          }
        };
        break;
        
      case 3:
        // Day 3: Story Climax
        targetChapter = chapters[2];
        activityType = 'Story Climax';
        
        const day3Comprehension = await generateComprehensionQuestions(targetChapter.content, student);
        const day3Vocabulary = await generateVocabularyActivities(targetChapter.content, student);
        
        content = {
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
            title: targetChapter.title,
            content: targetChapter.content,
            summary: targetChapter.summary
          },
          vocabularyChallenge: day3Vocabulary.activities,
          comprehensionQuestions: day3Comprehension.questions,
          quickRetell: {
            type: 'retell',
            title: 'Quick Retell',
            prompt: 'In your own words, tell the story from beginning to end in 3-4 sentences.'
          }
        };
        break;
        
      case 4:
      case 5:
      case 6:
      case 7:
        // Days 4-7: Games and Creative Activities
        const gameActivities = await generateGameAndCreativeActivities({ chapters }, student);
        
        switch (dayOfWeek) {
          case 4:
            activityType = 'Story Review & Game';
            content = gameActivities.day4;
            break;
          case 5:
            activityType = 'Topic Exploration';
            content = gameActivities.day5;
            break;
          case 6:
            activityType = 'Creative Expression';
            content = gameActivities.day6;
            break;
          case 7:
            activityType = 'Visual & Reflective';
            content = gameActivities.day7;
            break;
        }
        break;
        
      default:
        throw new Error(`Invalid day of week: ${dayOfWeek}. Must be between 1-7.`);
    }
    
    const dailyActivity = {
      planId: plan.id,
      dayOfWeek: dayOfWeek,
      activityType: activityType,
      content: content,
      completed: false
    };
    
    console.log(`Successfully generated Day ${dayOfWeek} activity for student: ${student.name}`);
    console.log(`- Activity Type: ${activityType}`);
    console.log(`- Interest Theme: ${interestTheme}`);
    
    return dailyActivity;
    
  } catch (error) {
    console.error(`Error generating Day ${dayOfWeek} activity:`, error);
    throw new Error(`Failed to generate Day ${dayOfWeek} activity: ${error.message}`);
  }
}

/**
 * Validates story quality by checking word count and dialogue presence
 * @param {object} storyData - The story data object with chapters
 * @returns {object} - Validation result with isValid boolean and issues array
 */
function validateStoryQuality(storyData) {
  const issues = [];
  let isValid = true;
  
  if (!storyData || !storyData.chapters || !Array.isArray(storyData.chapters)) {
    return {
      isValid: false,
      issues: ['Invalid story data structure']
    };
  }
  
  storyData.chapters.forEach((chapter, index) => {
    const chapterNumber = index + 1;
    
    // Check word count (350-400 words per chapter)
    const wordCount = chapter.content.split(' ').length;
    if (wordCount < 350) {
      issues.push(`Chapter ${chapterNumber}: Too short (${wordCount} words, minimum 350 required)`);
      isValid = false;
    } else if (wordCount > 400) {
      issues.push(`Chapter ${chapterNumber}: Too long (${wordCount} words, maximum 400 recommended)`);
      // This is a warning, not a failure
    }
    
    // Check for dialogue presence (at least 3 pieces of dialogue)
    const dialogueMatches = chapter.content.match(/"[^"]*"/g) || [];
    const dialogueCount = dialogueMatches.length;
    if (dialogueCount < 3) {
      issues.push(`Chapter ${chapterNumber}: Insufficient dialogue (${dialogueCount} pieces, minimum 3 required)`);
      isValid = false;
    }
    
    // Check for basic story elements
    if (!chapter.title || chapter.title.trim().length === 0) {
      issues.push(`Chapter ${chapterNumber}: Missing or empty title`);
      isValid = false;
    }
    
    if (!chapter.content || chapter.content.trim().length === 0) {
      issues.push(`Chapter ${chapterNumber}: Missing or empty content`);
      isValid = false;
    }
    
    if (!chapter.summary || chapter.summary.trim().length === 0) {
      issues.push(`Chapter ${chapterNumber}: Missing or empty summary`);
      isValid = false;
    }
  });
  
  return {
    isValid,
    issues
  };
}

/**
 * Validates activity quality and completeness based on activity type
 * @param {object} activity - The daily activity object
 * @param {number} dayOfWeek - The day of the week (1-7)
 * @returns {object} - Validation result with isValid boolean and issues array
 */
function validateActivityQuality(activity, dayOfWeek) {
  const issues = [];
  let isValid = true;
  
  if (!activity || typeof activity !== 'object') {
    return {
      isValid: false,
      issues: ['Invalid activity data structure']
    };
  }
  
  // Check required fields
  if (!activity.activityType || activity.activityType.trim().length === 0) {
    issues.push('Missing or empty activity type');
    isValid = false;
  }
  
  if (!activity.content || typeof activity.content !== 'object') {
    issues.push('Missing or invalid content structure');
    isValid = false;
  }
  
  if (dayOfWeek < 1 || dayOfWeek > 7) {
    issues.push(`Invalid day of week: ${dayOfWeek}. Must be between 1-7.`);
    isValid = false;
  }
  
  // Validate content based on activity type and day
  const content = activity.content;
  
  switch (dayOfWeek) {
    case 1: // Story Kickoff
      if (!content.predictionWarmUp) {
        issues.push('Day 1: Missing prediction warm-up activity');
        isValid = false;
      }
      if (!content.chapter1) {
        issues.push('Day 1: Missing Chapter 1 content');
        isValid = false;
      }
      if (!content.vocabularyInContext || !Array.isArray(content.vocabularyInContext)) {
        issues.push('Day 1: Missing or invalid vocabulary activities');
        isValid = false;
      }
      if (!content.comprehensionQuestions || !Array.isArray(content.comprehensionQuestions)) {
        issues.push('Day 1: Missing or invalid comprehension questions');
        isValid = false;
      }
      if (!content.reflectionPrompt) {
        issues.push('Day 1: Missing reflection prompt');
        isValid = false;
      }
      break;
      
    case 2: // Building Connections
      if (!content.chapter1Review) {
        issues.push('Day 2: Missing Chapter 1 review');
        isValid = false;
      }
      if (!content.chapter2) {
        issues.push('Day 2: Missing Chapter 2 content');
        isValid = false;
      }
      if (!content.vocabularyWordMap || !Array.isArray(content.vocabularyWordMap)) {
        issues.push('Day 2: Missing or invalid vocabulary word map');
        isValid = false;
      }
      if (!content.comprehensionQuestions || !Array.isArray(content.comprehensionQuestions)) {
        issues.push('Day 2: Missing or invalid comprehension questions');
        isValid = false;
      }
      if (!content.characterSpotlight) {
        issues.push('Day 2: Missing character spotlight activity');
        isValid = false;
      }
      break;
      
    case 3: // Story Climax
      if (!content.chapter2Review) {
        issues.push('Day 3: Missing Chapter 2 review');
        isValid = false;
      }
      if (!content.chapter3) {
        issues.push('Day 3: Missing Chapter 3 content');
        isValid = false;
      }
      if (!content.vocabularyChallenge || !Array.isArray(content.vocabularyChallenge)) {
        issues.push('Day 3: Missing or invalid vocabulary challenge');
        isValid = false;
      }
      if (!content.comprehensionQuestions || !Array.isArray(content.comprehensionQuestions)) {
        issues.push('Day 3: Missing or invalid comprehension questions');
        isValid = false;
      }
      if (!content.quickRetell) {
        issues.push('Day 3: Missing quick retell activity');
        isValid = false;
      }
      break;
      
    case 4:
    case 5:
    case 6:
    case 7:
      // Days 4-7: Games and Creative Activities
      if (!content || Object.keys(content).length === 0) {
        issues.push(`Day ${dayOfWeek}: Missing content for game/creative activity`);
        isValid = false;
      }
      
      // Check for at least one main activity
      const hasMainActivity = content.game || content.exploration || content.creative || content.visual;
      if (!hasMainActivity) {
        issues.push(`Day ${dayOfWeek}: Missing main activity content`);
        isValid = false;
      }
      break;
      
    default:
      issues.push(`Unknown day of week: ${dayOfWeek}`);
      isValid = false;
  }
  
  // Validate that arrays have content
  Object.keys(content).forEach(key => {
    if (Array.isArray(content[key]) && content[key].length === 0) {
      issues.push(`Empty array for ${key}`);
      isValid = false;
    }
  });
  
  return {
    isValid,
    issues
  };
}

/**
 * Generates fallback activity templates when AI generation fails
 * @param {object} student - The student object
 * @param {object} plan - The weekly plan object
 * @param {number} dayOfWeek - The day of the week (1-7)
 * @returns {object} - Fallback activity object
 */
function generateFallbackActivity(student, plan, dayOfWeek) {
  const interestTheme = plan.interestTheme;
  const chapters = plan.chapters;
  
  let activityType;
  let content = {};
  
  switch (dayOfWeek) {
    case 1:
      activityType = 'Story Kickoff';
      content = {
        predictionWarmUp: {
          type: 'prediction',
          title: 'Prediction Warm-Up',
          prompt: `Based on the title and your interest in ${interestTheme}, what do you think this story will be about?`
        },
        chapter1: chapters[0] ? {
          title: chapters[0].title,
          content: chapters[0].content,
          summary: chapters[0].summary
        } : {
          title: 'Chapter 1',
          content: 'Chapter content will be available soon.',
          summary: 'Chapter summary will be available soon.'
        },
        vocabularyInContext: [
          {
            text: 'Sample vocabulary word',
            options: ['Option A', 'Option B', 'Option C'],
            correct: 'Option A'
          }
        ],
        comprehensionQuestions: [
          {
            text: 'What is the main character\'s name?',
            options: ['A', 'B', 'C'],
            correct: 'A'
          }
        ],
        reflectionPrompt: {
          type: 'reflection',
          title: 'Reflection',
          prompt: 'What was your favorite part of Chapter 1 and why?'
        }
      };
      break;
      
    case 2:
      activityType = 'Building Connections';
      content = {
        chapter1Review: {
          type: 'review',
          title: 'Quick Review of Chapter 1',
          questions: [
            'What was the main problem in Chapter 1?',
            'Who are the main characters?',
            'What happened at the end of Chapter 1?'
          ]
        },
        chapter2: chapters[1] ? {
          title: chapters[1].title,
          content: chapters[1].content,
          summary: chapters[1].summary
        } : {
          title: 'Chapter 2',
          content: 'Chapter content will be available soon.',
          summary: 'Chapter summary will be available soon.'
        },
        vocabularyWordMap: [
          {
            word: 'Sample word',
            definition: 'Sample definition',
            sentence: 'Sample sentence using the word.'
          }
        ],
        comprehensionQuestions: [
          {
            text: 'What new challenge did the character face?',
            options: ['A', 'B', 'C'],
            correct: 'A'
          }
        ],
        characterSpotlight: {
          type: 'character',
          title: 'Character Spotlight',
          prompt: 'If you could ask the main character one question, what would it be?'
        }
      };
      break;
      
    case 3:
      activityType = 'Story Climax';
      content = {
        chapter2Review: {
          type: 'review',
          title: 'Quick Review of Chapter 2',
          questions: [
            'What new problem arose in Chapter 2?',
            'How did the characters try to solve it?',
            'What was the cliffhanger at the end?'
          ]
        },
        chapter3: chapters[2] ? {
          title: chapters[2].title,
          content: chapters[2].content,
          summary: chapters[2].summary
        } : {
          title: 'Chapter 3',
          content: 'Chapter content will be available soon.',
          summary: 'Chapter summary will be available soon.'
        },
        vocabularyChallenge: [
          {
            word: 'Challenge word',
            definition: 'Challenge definition',
            context: 'Challenge context sentence.'
          }
        ],
        comprehensionQuestions: [
          {
            text: 'How did the story end?',
            options: ['A', 'B', 'C'],
            correct: 'A'
          }
        ],
        quickRetell: {
          type: 'retell',
          title: 'Quick Retell',
          prompt: 'In your own words, tell the story from beginning to end in 3-4 sentences.'
        }
      };
      break;
      
    case 4:
      activityType = 'Story Review & Game';
      content = {
        game: {
          title: 'Story Review Game',
          description: 'Review the story through an interactive game.',
          instructions: 'Answer questions about the story to earn points.'
        }
      };
      break;
      
    case 5:
      activityType = 'Topic Exploration';
      content = {
        exploration: {
          title: 'Explore the Topic',
          description: 'Learn more about the story\'s theme.',
          activities: ['Research', 'Discussion', 'Creative Writing']
        }
      };
      break;
      
    case 6:
      activityType = 'Creative Expression';
      content = {
        creative: {
          title: 'Creative Expression',
          description: 'Express your creativity related to the story.',
          activities: ['Drawing', 'Writing', 'Role Play']
        }
      };
      break;
      
    case 7:
      activityType = 'Visual & Reflective';
      content = {
        visual: {
          title: 'Visual & Reflective',
          description: 'Create visual representations and reflect on the story.',
          activities: ['Drawing', 'Collage', 'Reflection Writing']
        }
      };
      break;
      
    default:
      throw new Error(`Invalid day of week: ${dayOfWeek}`);
  }
  
  return {
    planId: plan.id,
    dayOfWeek: dayOfWeek,
    activityType: activityType,
    content: content,
    completed: false
  };
}

/**
 * Activity type mapping for different days of the week
 * Defines the structure and requirements for each activity type
 */
const ACTIVITY_TYPE_MAPPING = {
  1: {
    type: 'Story Kickoff',
    category: 'comprehension',
    difficulty: 'beginner',
    focus: 'prediction_and_engagement',
    requiredComponents: [
      'predictionWarmUp',
      'chapter1',
      'vocabularyInContext',
      'comprehensionQuestions',
      'reflectionPrompt'
    ],
    description: 'Introduces the story and builds anticipation through prediction activities',
    learningObjectives: [
      'Make predictions based on context clues',
      'Engage with story content',
      'Build vocabulary in context',
      'Develop comprehension skills',
      'Practice reflection and critical thinking'
    ]
  },
  2: {
    type: 'Building Connections',
    category: 'comprehension',
    difficulty: 'intermediate',
    focus: 'character_development_and_connections',
    requiredComponents: [
      'chapter1Review',
      'chapter2',
      'vocabularyWordMap',
      'comprehensionQuestions',
      'characterSpotlight'
    ],
    description: 'Deepens understanding through character analysis and story connections',
    learningObjectives: [
      'Review and recall story elements',
      'Analyze character motivations and actions',
      'Expand vocabulary through word mapping',
      'Make connections between story events',
      'Develop empathy and character understanding'
    ]
  },
  3: {
    type: 'Story Climax',
    category: 'comprehension',
    difficulty: 'advanced',
    focus: 'resolution_and_synthesis',
    requiredComponents: [
      'chapter2Review',
      'chapter3',
      'vocabularyChallenge',
      'comprehensionQuestions',
      'quickRetell'
    ],
    description: 'Brings the story to resolution and synthesizes learning',
    learningObjectives: [
      'Understand story resolution and themes',
      'Master challenging vocabulary',
      'Synthesize story elements',
      'Practice story retelling',
      'Develop narrative comprehension'
    ]
  },
  4: {
    type: 'Story Review & Game',
    category: 'creative',
    difficulty: 'beginner',
    focus: 'interactive_review',
    requiredComponents: [
      'game'
    ],
    description: 'Reinforces learning through interactive games and activities',
    learningObjectives: [
      'Review story content in engaging ways',
      'Practice recall and memory',
      'Develop game-based learning skills',
      'Build confidence through success'
    ]
  },
  5: {
    type: 'Topic Exploration',
    category: 'creative',
    difficulty: 'intermediate',
    focus: 'theme_expansion',
    requiredComponents: [
      'exploration'
    ],
    description: 'Expands on story themes and topics through research and discussion',
    learningObjectives: [
      'Explore story themes in depth',
      'Develop research skills',
      'Practice discussion and communication',
      'Connect story to real-world topics'
    ]
  },
  6: {
    type: 'Creative Expression',
    category: 'creative',
    difficulty: 'intermediate',
    focus: 'artistic_expression',
    requiredComponents: [
      'creative'
    ],
    description: 'Encourages artistic and creative responses to the story',
    learningObjectives: [
      'Express understanding through art',
      'Develop creative thinking skills',
      'Practice different forms of expression',
      'Build confidence in creative abilities'
    ]
  },
  7: {
    type: 'Visual & Reflective',
    category: 'creative',
    difficulty: 'advanced',
    focus: 'synthesis_and_reflection',
    requiredComponents: [
      'visual'
    ],
    description: 'Synthesizes learning through visual projects and deep reflection',
    learningObjectives: [
      'Create visual representations of learning',
      'Practice deep reflection and synthesis',
      'Develop metacognitive skills',
      'Present learning in creative formats'
    ]
  }
};

/**
 * Gets activity type information for a specific day
 * @param {number} dayOfWeek - The day of the week (1-7)
 * @returns {object} - Activity type mapping information
 */
function getActivityTypeInfo(dayOfWeek) {
  if (!ACTIVITY_TYPE_MAPPING[dayOfWeek]) {
    throw new Error(`Invalid day of week: ${dayOfWeek}. Must be between 1-7.`);
  }
  return ACTIVITY_TYPE_MAPPING[dayOfWeek];
}

/**
 * Gets all activity types for a week
 * @returns {object} - Complete activity type mapping
 */
function getAllActivityTypes() {
  return ACTIVITY_TYPE_MAPPING;
}

/**
 * Calculates progressive difficulty based on day number and student level
 * @param {number} dayOfWeek - The day of the week (1-7)
 * @param {object} student - The student object
 * @param {object} plan - The weekly plan object
 * @returns {object} - Difficulty configuration object
 */
function calculateProgressiveDifficulty(dayOfWeek, student, plan) {
  const baseGradeLevel = student.gradeLevel;
  const activityInfo = getActivityTypeInfo(dayOfWeek);
  
  // Calculate difficulty multiplier based on day
  let difficultyMultiplier = 1.0;
  let complexityLevel = 'standard';
  let questionCount = 3;
  let vocabularyCount = 3;
  let timeEstimate = 15;
  
  switch (dayOfWeek) {
    case 1:
      // Day 1: Introduction - Keep it accessible
      difficultyMultiplier = 0.9;
      complexityLevel = 'introductory';
      questionCount = 2;
      vocabularyCount = 2;
      timeEstimate = 12;
      break;
      
    case 2:
      // Day 2: Building - Slight increase
      difficultyMultiplier = 1.0;
      complexityLevel = 'standard';
      questionCount = 3;
      vocabularyCount = 3;
      timeEstimate = 15;
      break;
      
    case 3:
      // Day 3: Climax - Moderate challenge
      difficultyMultiplier = 1.1;
      complexityLevel = 'challenging';
      questionCount = 4;
      vocabularyCount = 4;
      timeEstimate = 18;
      break;
      
    case 4:
      // Day 4: Review - Consolidate learning
      difficultyMultiplier = 1.0;
      complexityLevel = 'review';
      questionCount = 3;
      vocabularyCount = 3;
      timeEstimate = 20;
      break;
      
    case 5:
      // Day 5: Exploration - Expand knowledge
      difficultyMultiplier = 1.2;
      complexityLevel = 'exploratory';
      questionCount = 4;
      vocabularyCount = 4;
      timeEstimate = 25;
      break;
      
    case 6:
      // Day 6: Creative - Apply learning
      difficultyMultiplier = 1.1;
      complexityLevel = 'creative';
      questionCount = 3;
      vocabularyCount = 3;
      timeEstimate = 30;
      break;
      
    case 7:
      // Day 7: Synthesis - Mastery level
      difficultyMultiplier = 1.3;
      complexityLevel = 'mastery';
      questionCount = 5;
      vocabularyCount = 5;
      timeEstimate = 35;
      break;
      
    default:
      throw new Error(`Invalid day of week: ${dayOfWeek}`);
  }
  
  // Adjust based on student's reading level from previous assessments
  const mostRecentAssessment = plan.mostRecentAssessment;
  if (mostRecentAssessment?.readingLevelLabel) {
    switch (mostRecentAssessment.readingLevelLabel) {
      case 'Above Grade Level':
        difficultyMultiplier *= 1.2;
        questionCount = Math.min(questionCount + 1, 6);
        vocabularyCount = Math.min(vocabularyCount + 1, 6);
        break;
      case 'Below Grade Level':
        difficultyMultiplier *= 0.8;
        questionCount = Math.max(questionCount - 1, 2);
        vocabularyCount = Math.max(vocabularyCount - 1, 2);
        break;
      case 'At Grade Level':
      default:
        // Keep standard difficulty
        break;
    }
  }
  
  // Calculate adjusted grade level for this day
  const adjustedGradeLevel = Math.round(baseGradeLevel * difficultyMultiplier);
  
  return {
    dayOfWeek,
    baseGradeLevel,
    adjustedGradeLevel,
    difficultyMultiplier,
    complexityLevel,
    questionCount,
    vocabularyCount,
    timeEstimate,
    activityType: activityInfo.type,
    category: activityInfo.category,
    focus: activityInfo.focus,
    learningObjectives: activityInfo.learningObjectives,
    
    // Difficulty indicators for UI
    difficultyLabel: getDifficultyLabel(complexityLevel),
    challengeLevel: getChallengeLevel(difficultyMultiplier),
    estimatedTime: `${timeEstimate} minutes`,
    
    // Content generation hints
    contentHints: {
      questionComplexity: getQuestionComplexity(complexityLevel),
      vocabularyDifficulty: getVocabularyDifficulty(complexityLevel),
      activityDepth: getActivityDepth(complexityLevel),
      engagementLevel: getEngagementLevel(dayOfWeek)
    }
  };
}

/**
 * Gets difficulty label for UI display
 * @param {string} complexityLevel - The complexity level
 * @returns {string} - User-friendly difficulty label
 */
function getDifficultyLabel(complexityLevel) {
  const labels = {
    'introductory': 'Getting Started',
    'standard': 'Standard',
    'challenging': 'Challenging',
    'review': 'Review & Practice',
    'exploratory': 'Explore & Discover',
    'creative': 'Creative & Fun',
    'mastery': 'Mastery Level'
  };
  return labels[complexityLevel] || 'Standard';
}

/**
 * Gets challenge level for progress tracking
 * @param {number} difficultyMultiplier - The difficulty multiplier
 * @returns {string} - Challenge level
 */
function getChallengeLevel(difficultyMultiplier) {
  if (difficultyMultiplier < 0.9) return 'easy';
  if (difficultyMultiplier < 1.1) return 'medium';
  if (difficultyMultiplier < 1.3) return 'hard';
  return 'expert';
}

/**
 * Gets question complexity for content generation
 * @param {string} complexityLevel - The complexity level
 * @returns {string} - Question complexity guidance
 */
function getQuestionComplexity(complexityLevel) {
  const complexity = {
    'introductory': 'Simple recall and basic understanding questions',
    'standard': 'Mix of recall, understanding, and basic analysis',
    'challenging': 'Analysis, synthesis, and evaluation questions',
    'review': 'Comprehensive review with varied question types',
    'exploratory': 'Open-ended questions that encourage exploration',
    'creative': 'Creative thinking and application questions',
    'mastery': 'Complex analysis, synthesis, and evaluation questions'
  };
  return complexity[complexityLevel] || 'Standard question complexity';
}

/**
 * Gets vocabulary difficulty for content generation
 * @param {string} complexityLevel - The complexity level
 * @returns {string} - Vocabulary difficulty guidance
 */
function getVocabularyDifficulty(complexityLevel) {
  const difficulty = {
    'introductory': 'Basic, frequently used words',
    'standard': 'Grade-appropriate vocabulary with some challenging words',
    'challenging': 'Advanced vocabulary with context clues',
    'review': 'Mix of previously learned and new vocabulary',
    'exploratory': 'Topic-specific and domain vocabulary',
    'creative': 'Expressive and descriptive vocabulary',
    'mastery': 'Complex vocabulary with multiple meanings'
  };
  return difficulty[complexityLevel] || 'Standard vocabulary difficulty';
}

/**
 * Gets activity depth for content generation
 * @param {string} complexityLevel - The complexity level
 * @returns {string} - Activity depth guidance
 */
function getActivityDepth(complexityLevel) {
  const depth = {
    'introductory': 'Surface-level engagement with clear guidance',
    'standard': 'Moderate depth with some independent thinking',
    'challenging': 'Deep engagement requiring critical thinking',
    'review': 'Comprehensive coverage of learned material',
    'exploratory': 'In-depth exploration of topics and themes',
    'creative': 'Open-ended creative expression and application',
    'mastery': 'Synthesis and application of all learned concepts'
  };
  return depth[complexityLevel] || 'Standard activity depth';
}

/**
 * Gets engagement level based on day number
 * @param {number} dayOfWeek - The day of the week
 * @returns {string} - Engagement level guidance
 */
function getEngagementLevel(dayOfWeek) {
  if (dayOfWeek <= 3) return 'high'; // Story days are highly engaging
  if (dayOfWeek <= 5) return 'medium'; // Review and exploration days
  return 'moderate'; // Creative and reflection days
}

/**
 * Caching utilities for storing and retrieving AI prompts and outputs
 */
const CACHE_UTILS = {
  /**
   * Stores AI prompt and output in the database
   * @param {number} planId - The weekly plan ID
   * @param {string} cacheKey - The cache key (e.g., 'story', 'day1_activity')
   * @param {object} prompt - The AI prompt used
   * @param {object} output - The AI output received
   * @param {object} prisma - Prisma client instance
   * @returns {Promise<void>}
   */
  async storeCache(planId, cacheKey, prompt, output, prisma) {
    try {
      console.log(`📦 Storing cache for plan ${planId}, key: ${cacheKey}`);
      
      // Get existing cache data
      const existingPlan = await prisma.weeklyPlan.findUnique({
        where: { id: planId },
        select: { cachedPrompt: true, cachedOutput: true }
      });
      
      const existingPrompts = existingPlan?.cachedPrompt || {};
      const existingOutputs = existingPlan?.cachedOutput || {};
      
      // Add new cache entry
      const updatedPrompts = {
        ...existingPrompts,
        [cacheKey]: {
          prompt,
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
      
      const updatedOutputs = {
        ...existingOutputs,
        [cacheKey]: {
          output,
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
      
      // Update the database
      await prisma.weeklyPlan.update({
        where: { id: planId },
        data: {
          cachedPrompt: updatedPrompts,
          cachedOutput: updatedOutputs
        }
      });
      
      console.log(`✅ Successfully stored cache for ${cacheKey}`);
    } catch (error) {
      console.error(`❌ Failed to store cache for ${cacheKey}:`, error);
      // Don't throw error - caching failure shouldn't break the main flow
    }
  },
  
  /**
   * Retrieves cached AI prompt and output from the database
   * @param {number} planId - The weekly plan ID
   * @param {string} cacheKey - The cache key to retrieve
   * @param {object} prisma - Prisma client instance
   * @returns {Promise<object|null>} - Cached data or null if not found
   */
  async getCache(planId, cacheKey, prisma) {
    try {
      console.log(`🔍 Retrieving cache for plan ${planId}, key: ${cacheKey}`);
      
      const plan = await prisma.weeklyPlan.findUnique({
        where: { id: planId },
        select: { cachedPrompt: true, cachedOutput: true }
      });
      
      if (!plan?.cachedPrompt?.[cacheKey] || !plan?.cachedOutput?.[cacheKey]) {
        console.log(`📭 No cache found for ${cacheKey}`);
        return null;
      }
      
      const cachedData = {
        prompt: plan.cachedPrompt[cacheKey],
        output: plan.cachedOutput[cacheKey]
      };
      
      console.log(`✅ Successfully retrieved cache for ${cacheKey}`);
      return cachedData;
    } catch (error) {
      console.error(`❌ Failed to retrieve cache for ${cacheKey}:`, error);
      return null;
    }
  },
  
  /**
   * Checks if cached data is still valid (within cache duration)
   * @param {object} cachedData - The cached data object
   * @param {number} maxAgeHours - Maximum age in hours (default: 24)
   * @returns {boolean} - True if cache is still valid
   */
  isCacheValid(cachedData, maxAgeHours = 24) {
    if (!cachedData?.prompt?.timestamp) {
      return false;
    }
    
    const cacheTime = new Date(cachedData.prompt.timestamp);
    const currentTime = new Date();
    const ageInHours = (currentTime - cacheTime) / (1000 * 60 * 60);
    
    return ageInHours < maxAgeHours;
  },
  
  /**
   * Clears specific cache entries
   * @param {number} planId - The weekly plan ID
   * @param {string|Array} cacheKeys - Cache key(s) to clear
   * @param {object} prisma - Prisma client instance
   * @returns {Promise<void>}
   */
  async clearCache(planId, cacheKeys, prisma) {
    try {
      console.log(`🗑️ Clearing cache for plan ${planId}, keys:`, cacheKeys);
      
      const plan = await prisma.weeklyPlan.findUnique({
        where: { id: planId },
        select: { cachedPrompt: true, cachedOutput: true }
      });
      
      if (!plan) {
        console.log(`📭 Plan ${planId} not found for cache clearing`);
        return;
      }
      
      const keysToClear = Array.isArray(cacheKeys) ? cacheKeys : [cacheKeys];
      const existingPrompts = plan.cachedPrompt || {};
      const existingOutputs = plan.cachedOutput || {};
      
      // Remove specified keys
      keysToClear.forEach(key => {
        delete existingPrompts[key];
        delete existingOutputs[key];
      });
      
      // Update the database
      await prisma.weeklyPlan.update({
        where: { id: planId },
        data: {
          cachedPrompt: existingPrompts,
          cachedOutput: existingOutputs
        }
      });
      
      console.log(`✅ Successfully cleared cache for keys:`, keysToClear);
    } catch (error) {
      console.error(`❌ Failed to clear cache:`, error);
    }
  },
  
  /**
   * Gets cache statistics for a plan
   * @param {number} planId - The weekly plan ID
   * @param {object} prisma - Prisma client instance
   * @returns {Promise<object>} - Cache statistics
   */
  async getCacheStats(planId, prisma) {
    try {
      const plan = await prisma.weeklyPlan.findUnique({
        where: { id: planId },
        select: { cachedPrompt: true, cachedOutput: true }
      });
      
      if (!plan) {
        return { totalEntries: 0, keys: [], oldestEntry: null, newestEntry: null };
      }
      
      const prompts = plan.cachedPrompt || {};
      const outputs = plan.cachedOutput || {};
      const keys = Object.keys(prompts);
      
      let oldestEntry = null;
      let newestEntry = null;
      
      keys.forEach(key => {
        const timestamp = prompts[key]?.timestamp;
        if (timestamp) {
          const entryTime = new Date(timestamp);
          if (!oldestEntry || entryTime < oldestEntry) {
            oldestEntry = entryTime;
          }
          if (!newestEntry || entryTime > newestEntry) {
            newestEntry = entryTime;
          }
        }
      });
      
      return {
        totalEntries: keys.length,
        keys,
        oldestEntry: oldestEntry?.toISOString(),
        newestEntry: newestEntry?.toISOString(),
        hasValidCache: keys.length > 0
      };
    } catch (error) {
      console.error(`❌ Failed to get cache stats:`, error);
      return { totalEntries: 0, keys: [], oldestEntry: null, newestEntry: null };
    }
  }
};

/**
 * Implements 3-tier fallback logic for failed activity generation
 * @param {object} student - The student object
 * @param {object} plan - The weekly plan object
 * @param {number} dayOfWeek - The day of the week (1-7)
 * @returns {object} - Generated activity object
 */
export async function generateActivityWithFallback(student, plan, dayOfWeek) {
  let attempt = 1;
  const maxAttempts = 2; // Try original generation twice
  
  // Tier 1: Try original AI generation (up to 2 attempts)
  while (attempt <= maxAttempts) {
    try {
      console.log(`Attempt ${attempt}: Generating Day ${dayOfWeek} activity via AI...`);
      const activity = await generateDayActivity(student, plan, dayOfWeek);
      
      // Validate the generated activity
      const validation = validateActivityQuality(activity, dayOfWeek);
      if (validation.isValid) {
        console.log(`✅ Successfully generated Day ${dayOfWeek} activity on attempt ${attempt}`);
        return activity;
      } else {
        console.warn(`⚠️ Generated activity failed validation on attempt ${attempt}:`, validation.issues);
        if (attempt === maxAttempts) {
          console.log('🔄 All AI attempts failed, moving to fallback template...');
          break;
        }
      }
    } catch (error) {
      console.error(`❌ AI generation failed on attempt ${attempt}:`, error.message);
      if (attempt === maxAttempts) {
        console.log('🔄 All AI attempts failed, moving to fallback template...');
        break;
      }
    }
    attempt++;
  }
  
  // Tier 2: Use fallback template
  try {
    console.log(`🛠️ Generating Day ${dayOfWeek} activity using fallback template...`);
    const fallbackActivity = generateFallbackActivity(student, plan, dayOfWeek);
    console.log(`✅ Successfully generated Day ${dayOfWeek} activity using fallback template`);
    return fallbackActivity;
  } catch (error) {
    console.error(`❌ Fallback template generation failed:`, error.message);
    
    // Tier 3: Return error with minimal activity structure
    console.log('🚨 All fallback methods failed, returning error structure...');
    throw new Error(`Failed to generate Day ${dayOfWeek} activity after all fallback attempts: ${error.message}`);
  }
}

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

    const aiFunction = async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });
    };

    const modelConfig = {
      model: 'gpt-4o',
      temperature: 0.7,
      reasoning: 'Reading assessment generation with adaptive difficulty',
      isOverride: false
    };

    const result = await logAIRequestWithCapture({
      contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
      aiFunction,
      modelConfig,
      metadata: {
        studentId: student.id,
        studentName: student.name,
        originalGrade: student.gradeLevel,
        adjustedGradeLevel,
        selectedInterest,
        wordCountRange: `${wordCountRange.min}-${wordCountRange.max}`,
        previousReadingLevel: mostRecentAssessment?.readingLevelLabel || 'None'
      }
    });

    const content = result.result.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI API returned an empty response.');
    }

    // Parse the JSON string into an object
    let assessmentData;
    try {
      assessmentData = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw content:', content);
      
      // Try to clean the JSON and parse again
      try {
        let cleanedContent = content;
        // Remove any leading/trailing code block markers (``` or ```json)
        cleanedContent = cleanedContent.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
        // Now extract the JSON object
        const startIndex = cleanedContent.indexOf('{');
        const endIndex = cleanedContent.lastIndexOf('}') + 1;
        cleanedContent = cleanedContent.substring(startIndex, endIndex);
        assessmentData = JSON.parse(cleanedContent);
        console.log('Successfully parsed assessment data after cleaning JSON');
      } catch (cleanError) {
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
    }
    
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
