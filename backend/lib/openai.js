// This file contains the logic for interacting with the OpenAI API
// to generate reading passages and questions for assessments.

import OpenAI from 'openai';

console.log('OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Constructs the prompt for the OpenAI API to generate an assessment.
 * @param {object} student - The student object from the database.
 * @returns {string} - The formatted prompt string.
 */
function constructPrompt(student) {
  const wordCount = 200 + (student.gradeLevel - 1) * 50; // Simple formula to scale word count by grade

  return `
    Please generate a short story suitable for a grade ${student.gradeLevel} student.
    The story should be approximately ${wordCount} words long.
    The topics of the story should be related to the student's interests: ${student.interests}.
    The story must be age-appropriate and engaging.

    After the story, please generate 8 multiple-choice questions based on the text:
    - 4 comprehension questions (e.g., main idea, inference, detail retrieval).
    - 4 vocabulary questions about specific words in the story.

    Return the entire response as a single, valid JSON object. Do not include any text or markdown formatting outside of the JSON object.
    The JSON object must have the following structure:
    {
      "passage": "The full text of the story...",
      "questions": [
        {
          "type": "comprehension" or "vocabulary",
          "question": "The full question text...",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "A"
        }
      ]
    }
  `;
}

/**
 * Generates a reading passage and questions for a student assessment.
 * @param {object} student - The student object from the database.
 * @returns {Promise<object>} - A promise that resolves to an object containing the passage and questions.
 */
export async function generateAssessment(student) {
  try {
    console.log(`Generating assessment for student: ${student.name}, Grade: ${student.gradeLevel}, Interests: ${student.interests}`);
    
    const prompt = constructPrompt(student);

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
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
