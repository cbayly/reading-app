// Model configuration for activity content generation
const MODEL_CONFIG = {
  model: 'gpt-4-turbo',
  temperature: 0.7,
  max_tokens: 2000
};
import OpenAI from 'openai';

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

/**
 * Enhanced activity content generation system
 * Extracts story-specific content for interactive reading activities
 */

const DEFAULT_TIMEOUT_MS = process.env.NODE_ENV === 'test' ? 100 : 90000; // 100ms in tests, 90s otherwise

/**
 * Base function for making AI calls with timeout protection
 * @param {string} prompt - The prompt to send to the AI
 * @param {object} modelConfig - Configuration for the AI model
 * @returns {Promise<object>} - The AI response
 */
async function makeAICall(prompt, modelConfig) {
  const timeoutMs = DEFAULT_TIMEOUT_MS;
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('AI call timed out')), timeoutMs);
  });

  try {
    const openai = getOpenAIClient();
    const aiPromise = openai.chat.completions.create({
      ...modelConfig,
      messages: [{ role: 'user', content: prompt }]
    });

    try {
      const response = await Promise.race([aiPromise, timeoutPromise]);
      clearTimeout(timeoutId);
      return response.choices[0].message.content;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('AI call failed:', error);
    throw new Error('Failed to generate content: ' + error.message);
  }
}

/**
 * Validates generated content for age-appropriateness and educational value
 * @param {object} content - The content to validate
 * @param {number} studentAge - The student's age
 * @returns {object} - Validation result { isValid: boolean, reason?: string }
 */
function validateContent(content, studentAge) {
  // Basic validation rules
  const invalidWords = ['violent', 'inappropriate', 'offensive'];
  const contentStr = JSON.stringify(content).toLowerCase();
  
  for (const word of invalidWords) {
    if (contentStr.includes(word)) {
      return { 
        isValid: false, 
        reason: `Content contains inappropriate word: ${word}` 
      };
    }
  }

  // Add more validation rules based on age groups
  if (studentAge <= 8) {
    // Additional rules for younger students
  }

  return { isValid: true };
}

/**
 * Extracts characters from story content with role identification and generates decoy characters
 * @param {string} chapterContent - The story chapter text
 * @param {number} studentAge - The student's age for age-appropriate content
 * @returns {Promise<object>} - Object containing real characters and decoy characters
 */
async function extractCharactersWithDecoys(chapterContent, studentAge) {
  const modelConfig = {
    ...MODEL_CONFIG,
    temperature: 0.8, // Slightly higher for creative decoy generation
    max_tokens: 1500
  };

  const prompt = `
Analyze this story chapter and extract characters for a reading comprehension activity.

STORY CONTENT:
${chapterContent}

REQUIREMENTS:
- Extract 3-5 main characters that appear in this specific chapter
- For each character, identify their role (protagonist, antagonist, supporting character, etc.)
- Generate 2-3 plausible decoy characters that could fit the story's setting/theme but don't appear
- Ensure all content is age-appropriate for a ${studentAge}-year-old student
- Include brief descriptions for each character (real and decoy)

OUTPUT FORMAT (valid JSON only):
{
  "realCharacters": [
    {
      "name": "Character Name",
      "role": "protagonist/antagonist/supporting",
      "description": "Brief description of the character's role in the story"
    }
  ],
  "decoyCharacters": [
    {
      "name": "Decoy Character Name", 
      "role": "plausible role",
      "description": "Brief description of why this character could fit the story"
    }
  ]
}

IMPORTANT: Return only valid JSON. Do not include any text outside the JSON structure.
`;

  try {
    const response = await makeAICall(prompt, modelConfig);
    
    // Parse the JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse character extraction response:', parseError);
      throw new Error('Invalid JSON response from AI character extraction');
    }

    // Validate the structure
    if (!parsedContent.realCharacters || !parsedContent.decoyCharacters) {
      throw new Error('Character extraction response missing required fields');
    }

    // Validate content appropriateness
    const validation = validateContent(parsedContent, studentAge);
    if (!validation.isValid) {
      throw new Error('Character content validation failed: ' + validation.reason);
    }

    // Ensure we have the right number of characters
    if (parsedContent.realCharacters.length < 2 || parsedContent.realCharacters.length > 6) {
      throw new Error('Invalid number of real characters extracted');
    }

    if (parsedContent.decoyCharacters.length < 1 || parsedContent.decoyCharacters.length > 4) {
      throw new Error('Invalid number of decoy characters generated');
    }

    return parsedContent;
  } catch (error) {
    console.error('Character extraction failed:', error);
    throw error;
  }
}

/**
 * Extracts settings from story content with descriptive text and generates decoy settings
 * @param {string} chapterContent - The story chapter text
 * @param {number} studentAge - The student's age for age-appropriate content
 * @returns {Promise<object>} - Object containing real settings and decoy settings
 */
async function extractSettingsWithDescriptions(chapterContent, studentAge) {
  const modelConfig = {
    ...MODEL_CONFIG,
    temperature: 0.8, // Slightly higher for creative decoy generation
    max_tokens: 1500
  };

  const prompt = `
Analyze this story chapter and extract settings for a reading comprehension activity.

STORY CONTENT:
${chapterContent}

REQUIREMENTS:
- Extract 3-5 main settings/locations that appear in this specific chapter
- For each setting, provide a descriptive text that helps students understand the location
- Generate 2-3 plausible decoy settings that could fit the story's world but don't appear
- Ensure all content is age-appropriate for a ${studentAge}-year-old student
- Include sensory details and atmosphere in descriptions when appropriate

OUTPUT FORMAT (valid JSON only):
{
  "realSettings": [
    {
      "name": "Setting Name",
      "description": "Detailed description of the setting including atmosphere, sensory details, and significance to the story"
    }
  ],
  "decoySettings": [
    {
      "name": "Decoy Setting Name",
      "description": "Detailed description of why this setting could plausibly exist in the story's world"
    }
  ]
}

IMPORTANT: Return only valid JSON. Do not include any text outside the JSON structure.
`;

  try {
    const response = await makeAICall(prompt, modelConfig);
    
    // Parse the JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse setting extraction response:', parseError);
      throw new Error('Invalid JSON response from AI setting extraction');
    }

    // Validate the structure
    if (!parsedContent.realSettings || !parsedContent.decoySettings) {
      throw new Error('Setting extraction response missing required fields');
    }

    // Validate content appropriateness
    const validation = validateContent(parsedContent, studentAge);
    if (!validation.isValid) {
      throw new Error('Setting content validation failed: ' + validation.reason);
    }

    // Ensure we have the right number of settings
    if (parsedContent.realSettings.length < 2 || parsedContent.realSettings.length > 6) {
      throw new Error('Invalid number of real settings extracted');
    }

    if (parsedContent.decoySettings.length < 1 || parsedContent.decoySettings.length > 4) {
      throw new Error('Invalid number of decoy settings generated');
    }

    return parsedContent;
  } catch (error) {
    console.error('Setting extraction failed:', error);
    throw error;
  }
}

/**
 * Extracts event sequence from story content for ordering activities
 * @param {string} chapterContent - The story chapter text
 * @param {number} studentAge - The student's age for age-appropriate content
 * @returns {Promise<object>} - Object containing ordered events and shuffled events for activity
 */
async function extractEventSequence(chapterContent, studentAge) {
  const modelConfig = {
    ...MODEL_CONFIG,
    temperature: 0.6, // Lower temperature for more consistent event extraction
    max_tokens: 1500
  };

  const prompt = `
Analyze this story chapter and extract a sequence of events for a reading comprehension ordering activity.

STORY CONTENT:
${chapterContent}

REQUIREMENTS:
- Extract 4-6 key events that occur in chronological order in this chapter
- Each event should be clearly distinct and represent a significant moment in the story
- Events should be written in simple, clear language appropriate for a ${studentAge}-year-old student
- Each event should be 1-2 sentences long and capture the essential action
- Ensure all content is age-appropriate and educational

OUTPUT FORMAT (valid JSON only):
{
  "orderedEvents": [
    {
      "id": 1,
      "text": "First event that happens in the story"
    },
    {
      "id": 2,
      "text": "Second event that happens in the story"
    }
  ]
}

IMPORTANT: 
- Return only valid JSON. Do not include any text outside the JSON structure.
- Events must be in the correct chronological order as they appear in the story.
- Each event should be self-contained and understandable on its own.
`;

  try {
    const response = await makeAICall(prompt, modelConfig);
    
    // Parse the JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse event sequence response:', parseError);
      throw new Error('Invalid JSON response from AI event sequence extraction');
    }

    // Validate the structure
    if (!parsedContent.orderedEvents) {
      throw new Error('Event sequence response missing required fields');
    }

    // Validate content appropriateness
    const validation = validateContent(parsedContent, studentAge);
    if (!validation.isValid) {
      throw new Error('Event sequence content validation failed: ' + validation.reason);
    }

    // Ensure we have the right number of events
    if (parsedContent.orderedEvents.length < 4 || parsedContent.orderedEvents.length > 6) {
      throw new Error('Invalid number of events extracted');
    }

    // Validate that each event has required fields
    for (let i = 0; i < parsedContent.orderedEvents.length; i++) {
      const event = parsedContent.orderedEvents[i];
      if (!event.id || !event.text) {
        throw new Error(`Event at index ${i} missing required fields`);
      }
      if (event.id !== i + 1) {
        throw new Error(`Event IDs must be sequential starting from 1`);
      }
    }

    // Create shuffled version for the activity
    const shuffledEvents = [...parsedContent.orderedEvents].sort(() => Math.random() - 0.5);

    return {
      orderedEvents: parsedContent.orderedEvents,
      shuffledEvents: shuffledEvents
    };
  } catch (error) {
    console.error('Event sequence extraction failed:', error);
    throw error;
  }
}

/**
 * Extracts main idea with multiple choice options and explanatory feedback
 * @param {string} chapterContent - The story chapter text
 * @param {number} studentAge - The student's age for age-appropriate content
 * @returns {Promise<object>} - Object containing main idea question and options with feedback
 */
async function extractMainIdeaWithOptions(chapterContent, studentAge) {
  const modelConfig = {
    ...MODEL_CONFIG,
    temperature: 0.7, // Balanced temperature for creative but consistent options
    max_tokens: 1500
  };

  const prompt = `
Analyze this story chapter and create a main idea comprehension question with multiple choice options.

STORY CONTENT:
${chapterContent}

REQUIREMENTS:
- Create exactly 4 multiple choice options (A, B, C, D)
- One option should be the correct main idea of the story
- The other 3 options should be plausible but incorrect
- Each option should be 1-2 sentences long and clearly stated
- Provide explanatory feedback for each option explaining why it's correct or incorrect
- Ensure all content is age-appropriate for a ${studentAge}-year-old student
- Use language appropriate for the student's reading level

OUTPUT FORMAT (valid JSON only):
{
  "question": "What is the main idea of this story?",
  "options": [
    {
      "id": "A",
      "text": "First option text",
      "isCorrect": true,
      "feedback": "This is correct because it captures the central theme and purpose of the story."
    },
    {
      "id": "B", 
      "text": "Second option text",
      "isCorrect": false,
      "feedback": "This is incorrect because it focuses on a minor detail rather than the main idea."
    },
    {
      "id": "C",
      "text": "Third option text", 
      "isCorrect": false,
      "feedback": "This is incorrect because it misinterprets the story's central message."
    },
    {
      "id": "D",
      "text": "Fourth option text",
      "isCorrect": false,
      "feedback": "This is incorrect because it describes a setting detail rather than the main idea."
    }
  ]
}

IMPORTANT: 
- Return only valid JSON. Do not include any text outside the JSON structure.
- Exactly one option must have "isCorrect": true.
- All feedback should be educational and help students understand the concept.
- Options should be clearly distinguishable from each other.
`;

  try {
    const response = await makeAICall(prompt, modelConfig);
    
    // Parse the JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse main idea response:', parseError);
      throw new Error('Invalid JSON response from AI main idea extraction');
    }

    // Validate the structure
    if (!parsedContent.question || !parsedContent.options) {
      throw new Error('Main idea response missing required fields');
    }

    // Validate content appropriateness
    const validation = validateContent(parsedContent, studentAge);
    if (!validation.isValid) {
      throw new Error('Main idea content validation failed: ' + validation.reason);
    }

    // Ensure we have exactly 4 options
    if (parsedContent.options.length !== 4) {
      throw new Error('Main idea must have exactly 4 options');
    }

    // Validate that each option has required fields
    let correctCount = 0;
    for (let i = 0; i < parsedContent.options.length; i++) {
      const option = parsedContent.options[i];
      if (!option.id || !option.text || typeof option.isCorrect !== 'boolean' || !option.feedback) {
        throw new Error(`Option at index ${i} missing required fields`);
      }
      if (option.isCorrect) {
        correctCount++;
      }
    }

    // Ensure exactly one correct answer
    if (correctCount !== 1) {
      throw new Error('Main idea must have exactly one correct answer');
    }

    return parsedContent;
  } catch (error) {
    console.error('Main idea extraction failed:', error);
    throw error;
  }
}

/**
 * Extracts vocabulary words with age-appropriate definitions and generates matching pairs
 * @param {string} chapterContent - The story chapter text
 * @param {number} studentAge - The student's age for age-appropriate content
 * @returns {Promise<object>} - Object containing vocabulary words, definitions, and decoy definitions
 */
async function extractVocabularyWithDefinitions(chapterContent, studentAge) {
  const modelConfig = {
    ...MODEL_CONFIG,
    temperature: 0.7, // Balanced temperature for creative but consistent definitions
    max_tokens: 1500
  };

  const prompt = `
Analyze this story chapter and extract vocabulary words for a reading comprehension matching activity.

STORY CONTENT:
${chapterContent}

REQUIREMENTS:
- Extract 4-6 vocabulary words that appear in this chapter and are appropriate for a ${studentAge}-year-old student
- Choose words that are challenging but not too difficult for the student's age level
- Provide age-appropriate definitions that are clear and educational
- Generate 2-3 decoy definitions that are plausible but incorrect for the vocabulary words
- Ensure all content is age-appropriate and educational
- Use simple, clear language in definitions

OUTPUT FORMAT (valid JSON only):
{
  "vocabularyWords": [
    {
      "word": "brave",
      "definition": "Showing courage and not being afraid to face difficult situations",
      "context": "The brave knight faced the dragon without fear."
    }
  ],
  "decoyDefinitions": [
    {
      "definition": "A type of armor worn by knights",
      "isUsed": false
    },
    {
      "definition": "A weapon used in battle",
      "isUsed": false
    }
  ]
}

IMPORTANT: 
- Return only valid JSON. Do not include any text outside the JSON structure.
- Vocabulary words should be from the actual story content.
- Definitions should be age-appropriate and educational.
- Decoy definitions should be plausible but clearly incorrect.
- Include context sentences to help students understand word usage.
`;

  try {
    const response = await makeAICall(prompt, modelConfig);
    
    // Parse the JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse vocabulary response:', parseError);
      throw new Error('Invalid JSON response from AI vocabulary extraction');
    }

    // Validate the structure
    if (!parsedContent.vocabularyWords || !parsedContent.decoyDefinitions) {
      throw new Error('Vocabulary response missing required fields');
    }

    // Validate content appropriateness
    const validation = validateContent(parsedContent, studentAge);
    if (!validation.isValid) {
      throw new Error('Vocabulary content validation failed: ' + validation.reason);
    }

    // Ensure we have the right number of vocabulary words
    if (parsedContent.vocabularyWords.length < 3 || parsedContent.vocabularyWords.length > 6) {
      throw new Error('Invalid number of vocabulary words extracted');
    }

    if (parsedContent.decoyDefinitions.length < 1 || parsedContent.decoyDefinitions.length > 4) {
      throw new Error('Invalid number of decoy definitions generated');
    }

    // Validate that each vocabulary word has required fields
    for (let i = 0; i < parsedContent.vocabularyWords.length; i++) {
      const vocab = parsedContent.vocabularyWords[i];
      if (!vocab.word || !vocab.definition || !vocab.context) {
        throw new Error(`Vocabulary word at index ${i} missing required fields`);
      }
    }

    // Validate that each decoy definition has required fields
    for (let i = 0; i < parsedContent.decoyDefinitions.length; i++) {
      const decoy = parsedContent.decoyDefinitions[i];
      if (!decoy.definition || typeof decoy.isUsed !== 'boolean') {
        throw new Error(`Decoy definition at index ${i} missing required fields`);
      }
    }

    return parsedContent;
  } catch (error) {
    console.error('Vocabulary extraction failed:', error);
    throw error;
  }
}

/**
 * Extracts prediction options with plausibility scoring for future events
 * @param {string} chapterContent - The story chapter text
 * @param {number} studentAge - The student's age for age-appropriate content
 * @returns {Promise<object>} - Object containing prediction options with plausibility scores
 */
async function extractPredictionOptions(chapterContent, studentAge) {
  const modelConfig = {
    ...MODEL_CONFIG,
    temperature: 0.8, // Higher temperature for creative prediction generation
    max_tokens: 1500
  };

  const prompt = `
Analyze this story chapter and create prediction options for what might happen next in the story.

STORY CONTENT:
${chapterContent}

REQUIREMENTS:
- Create 4-6 prediction options for what could happen next in the story
- Each prediction should be based on story clues and character development
- Provide a plausibility score (1-10) for each prediction based on story evidence
- Include explanatory feedback for each prediction explaining the reasoning
- Ensure all content is age-appropriate for a ${studentAge}-year-old student
- Use language appropriate for the student's reading level
- Predictions should be creative but grounded in the story's context

OUTPUT FORMAT (valid JSON only):
{
  "question": "What do you think will happen next in the story?",
  "predictions": [
    {
      "id": "A",
      "text": "The knight will find a magical sword to help defeat the dragon.",
      "plausibilityScore": 8,
      "feedback": "This is very plausible because the story shows the knight needs help, and magical items are common in fantasy stories."
    },
    {
      "id": "B",
      "text": "The dragon will become friends with the knight.",
      "plausibilityScore": 3,
      "feedback": "This is less likely because the story shows the dragon as a threat, though unexpected friendships can happen in stories."
    },
    {
      "id": "C",
      "text": "The villagers will build a wall around the castle.",
      "plausibilityScore": 6,
      "feedback": "This is somewhat plausible as a defensive measure, but the story hasn't shown the villagers taking action yet."
    },
    {
      "id": "D",
      "text": "A wizard will appear to help the knight.",
      "plausibilityScore": 7,
      "feedback": "This is quite plausible because wizards often help heroes in fantasy stories, and the knight needs assistance."
    }
  ]
}

IMPORTANT: 
- Return only valid JSON. Do not include any text outside the JSON structure.
- Plausibility scores should be 1-10, where 10 is most likely based on story evidence.
- All feedback should be educational and help students understand prediction skills.
- Predictions should be varied in plausibility to encourage critical thinking.
- Use story clues and character development to justify plausibility scores.
`;

  try {
    const response = await makeAICall(prompt, modelConfig);
    
    // Parse the JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse prediction response:', parseError);
      throw new Error('Invalid JSON response from AI prediction extraction');
    }

    // Validate the structure
    if (!parsedContent.question || !parsedContent.predictions) {
      throw new Error('Prediction response missing required fields');
    }

    // Validate content appropriateness
    const validation = validateContent(parsedContent, studentAge);
    if (!validation.isValid) {
      throw new Error('Prediction content validation failed: ' + validation.reason);
    }

    // Ensure we have the right number of predictions
    if (parsedContent.predictions.length < 4 || parsedContent.predictions.length > 6) {
      throw new Error('Invalid number of predictions generated');
    }

    // Validate that each prediction has required fields
    for (let i = 0; i < parsedContent.predictions.length; i++) {
      const prediction = parsedContent.predictions[i];
      if (!prediction.id || !prediction.text || typeof prediction.plausibilityScore !== 'number' || !prediction.feedback) {
        throw new Error(`Prediction at index ${i} missing required fields`);
      }
      
      // Validate plausibility score range
      if (prediction.plausibilityScore < 1 || prediction.plausibilityScore > 10) {
        throw new Error(`Prediction at index ${i} has invalid plausibility score (must be 1-10)`);
      }
    }

    return parsedContent;
  } catch (error) {
    console.error('Prediction extraction failed:', error);
    throw error;
  }
}

/**
 * Generates enhanced activity content for a story chapter
 * @param {string} chapterContent - The story chapter text
 * @param {object} student - Student information including age
 * @param {string} activityType - Type of activity to generate content for
 * @returns {Promise<object>} - Generated activity content
 */
export async function generateActivityContent(chapterContent, student, activityType) {
  const modelConfig = MODEL_CONFIG;
  
  try {
    // Generate content based on activity type
    let content;
    
    switch (activityType) {
      case 'who':
        content = await extractCharactersWithDecoys(chapterContent, student.age);
        break;
      case 'where':
        content = await extractSettingsWithDescriptions(chapterContent, student.age);
        break;
      case 'sequence':
        content = await extractEventSequence(chapterContent, student.age);
        break;
      case 'main-idea':
        content = await extractMainIdeaWithOptions(chapterContent, student.age);
        break;
      case 'vocabulary':
        content = await extractVocabularyWithDefinitions(chapterContent, student.age);
        break;
      case 'predict':
        content = await extractPredictionOptions(chapterContent, student.age);
        break;
      default:
        // Fallback to generic content generation
        content = await makeAICall(
          `Generate ${activityType} activity content for this story: ${chapterContent}`,
          modelConfig
        );
    }

    // Validate the generated content
    const validation = validateContent(content, student.age);
    if (!validation.isValid) {
      throw new Error('Content validation failed: ' + validation.reason);
    }

    return content;
  } catch (error) {
    console.error(`Failed to generate ${activityType} content:`, error);
    throw error;
  }
}

// Export functions for testing
export {
  makeAICall,
  validateContent,
  extractCharactersWithDecoys,
  extractSettingsWithDescriptions,
  extractEventSequence,
  extractMainIdeaWithOptions,
  extractVocabularyWithDefinitions,
  extractPredictionOptions
};
