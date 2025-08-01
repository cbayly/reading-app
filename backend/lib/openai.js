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
