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
 * Enhanced activity content generation system with caching and robust error handling
 * Extracts story-specific content for interactive reading activities
 */

const DEFAULT_TIMEOUT_MS = process.env.NODE_ENV === 'test' ? 100 : 90000; // 100ms in tests, 90s otherwise

// Content cache for storing generated activity content
const contentCache = new Map();

// Cache configuration
const CACHE_CONFIG = {
  maxSize: 1000, // Maximum number of cached entries
  ttl: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  cleanupInterval: 60 * 60 * 1000 // 1 hour cleanup interval
};

// Error handling and retry configuration
const ERROR_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second base delay
  maxDelay: 10000, // 10 seconds max delay
  circuitBreakerThreshold: 5, // Number of failures before circuit breaker opens
  circuitBreakerTimeout: 60000, // 1 minute circuit breaker timeout
  timeoutMs: DEFAULT_TIMEOUT_MS
};

// Circuit breaker state
const circuitBreaker = {
  failures: 0,
  lastFailureTime: 0,
  state: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
};

/**
 * Classifies errors for appropriate handling
 * @param {Error} error - The error to classify
 * @returns {object} - Error classification { type: string, retryable: boolean, message: string }
 */
function classifyError(error) {
  const errorMessage = error.message.toLowerCase();
  
  // Network and timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('connection')) {
    return {
      type: 'NETWORK',
      retryable: true,
      message: 'Network or timeout error occurred'
    };
  }
  
  // Rate limiting errors
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return {
      type: 'RATE_LIMIT',
      retryable: true,
      message: 'Rate limit exceeded, will retry with backoff'
    };
  }
  
  // Authentication errors
  if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('invalid api key')) {
    return {
      type: 'AUTH',
      retryable: false,
      message: 'Authentication failed - check API key'
    };
  }
  
  // Quota exceeded errors
  if (errorMessage.includes('quota') || errorMessage.includes('billing') || errorMessage.includes('payment')) {
    return {
      type: 'QUOTA',
      retryable: false,
      message: 'API quota exceeded or billing issue'
    };
  }
  
  // Server errors (5xx)
  if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('504')) {
    return {
      type: 'SERVER',
      retryable: true,
      message: 'Server error occurred'
    };
  }
  
  // Content filtering errors
  if (errorMessage.includes('content filter') || errorMessage.includes('inappropriate')) {
    return {
      type: 'CONTENT_FILTER',
      retryable: false,
      message: 'Content was flagged as inappropriate'
    };
  }
  
  // Default to unknown error
  return {
    type: 'UNKNOWN',
    retryable: true,
    message: 'Unknown error occurred'
  };
}

/**
 * Calculates exponential backoff delay with jitter
 * @param {number} attempt - Current attempt number
 * @returns {number} - Delay in milliseconds
 */
function calculateBackoffDelay(attempt) {
  const delay = Math.min(
    ERROR_CONFIG.baseDelay * Math.pow(2, attempt - 1),
    ERROR_CONFIG.maxDelay
  );
  
  // Add jitter (±25% random variation)
  const jitter = delay * 0.25 * (Math.random() - 0.5);
  return Math.max(100, delay + jitter);
}

/**
 * Checks if circuit breaker should allow the request
 * @returns {boolean} - Whether request should proceed
 */
function shouldAllowRequest() {
  const now = Date.now();
  
  switch (circuitBreaker.state) {
    case 'CLOSED':
      return true;
    
    case 'OPEN':
      if (now - circuitBreaker.lastFailureTime > ERROR_CONFIG.circuitBreakerTimeout) {
        circuitBreaker.state = 'HALF_OPEN';
        return true;
      }
      return false;
    
    case 'HALF_OPEN':
      return true;
    
    default:
      return true;
  }
}

/**
 * Records a failure for circuit breaker
 */
function recordFailure() {
  circuitBreaker.failures++;
  circuitBreaker.lastFailureTime = Date.now();
  
  if (circuitBreaker.failures >= ERROR_CONFIG.circuitBreakerThreshold) {
    circuitBreaker.state = 'OPEN';
    console.warn('Circuit breaker opened due to repeated failures');
  }
}

/**
 * Records a success for circuit breaker
 */
function recordSuccess() {
  circuitBreaker.failures = 0;
  circuitBreaker.state = 'CLOSED';
}

/**
 * Generates a cache key for content based on story and activity parameters
 * @param {string} chapterContent - The story chapter text
 * @param {number} studentAge - The student's age
 * @param {string} activityType - Type of activity
 * @returns {string} - Unique cache key
 */
function generateCacheKey(chapterContent, studentAge, activityType) {
  // Create a hash of the chapter content (first 1000 characters for performance)
  const contentHash = chapterContent.substring(0, 1000).replace(/\s+/g, ' ').trim();
  
  // Combine parameters for unique key
  const key = `${activityType}_${studentAge}_${contentHash}`;
  
  // Create a simple hash for the key to keep it manageable
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `content_${Math.abs(hash)}`;
}

/**
 * Retrieves content from cache if available and not expired
 * @param {string} cacheKey - The cache key to look up
 * @returns {object|null} - Cached content or null if not found/expired
 */
function getCachedContent(cacheKey) {
  const cached = contentCache.get(cacheKey);
  
  if (!cached) {
    return null;
  }
  
  // Check if cache entry has expired
  if (Date.now() - cached.timestamp > CACHE_CONFIG.ttl) {
    contentCache.delete(cacheKey);
    return null;
  }
  
  return cached.content;
}

/**
 * Stores content in cache with timestamp
 * @param {string} cacheKey - The cache key
 * @param {object} content - The content to cache
 */
function setCachedContent(cacheKey, content) {
  // Check cache size and remove oldest entries if necessary
  if (contentCache.size >= CACHE_CONFIG.maxSize) {
    cleanupCache();
  }
  
  contentCache.set(cacheKey, {
    content: content,
    timestamp: Date.now()
  });
}

/**
 * Cleans up expired cache entries and removes oldest entries if cache is full
 */
function cleanupCache() {
  const now = Date.now();
  const expiredKeys = [];
  
  // Find expired entries
  for (const [key, value] of contentCache.entries()) {
    if (now - value.timestamp > CACHE_CONFIG.ttl) {
      expiredKeys.push(key);
    }
  }
  
  // Remove expired entries
  expiredKeys.forEach(key => contentCache.delete(key));
  
  // If still over limit, remove oldest entries
  if (contentCache.size >= CACHE_CONFIG.maxSize) {
    const entries = Array.from(contentCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, Math.floor(CACHE_CONFIG.maxSize * 0.2)); // Remove 20% of oldest entries
    toRemove.forEach(([key]) => contentCache.delete(key));
  }
}

/**
 * Invalidates cache entries for a specific story or all entries
 * @param {string} chapterContent - The story chapter text (optional, if not provided clears all)
 */
function invalidateCache(chapterContent = null) {
  if (!chapterContent) {
    contentCache.clear();
    return;
  }
  
  // Remove cache entries derived from this story content by recomputing keys
  const activityTypes = ['who', 'where', 'sequence', 'main-idea', 'vocabulary', 'predict', 'general'];
  // Reasonable age range for students in this app
  const ages = Array.from({ length: 16 }, (_, i) => i + 3); // 3..18
  
  for (const activityType of activityTypes) {
    for (const age of ages) {
      const key = generateCacheKey(chapterContent, age, activityType);
      if (contentCache.has(key)) {
        contentCache.delete(key);
      }
    }
  }
}

/**
 * Gets cache statistics for monitoring
 * @returns {object} - Cache statistics
 */
function getCacheStats() {
  const now = Date.now();
  let expiredCount = 0;
  let totalSize = 0;
  
  for (const [_, value] of contentCache.entries()) {
    if (now - value.timestamp > CACHE_CONFIG.ttl) {
      expiredCount++;
    }
    totalSize += JSON.stringify(value.content).length;
  }
  
  return {
    totalEntries: contentCache.size,
    expiredEntries: expiredCount,
    totalSizeBytes: totalSize,
    maxSize: CACHE_CONFIG.maxSize,
    ttlHours: CACHE_CONFIG.ttl / (60 * 60 * 1000)
  };
}

// Set up periodic cache cleanup (disabled in tests)
if (typeof setInterval !== 'undefined' && process.env.NODE_ENV !== 'test') {
  setInterval(cleanupCache, CACHE_CONFIG.cleanupInterval);
}

/**
 * Enhanced AI call function with comprehensive error handling and retry logic
 * @param {string} prompt - The prompt to send to the AI
 * @param {object} modelConfig - Configuration for the AI model
 * @param {number} attempt - Current attempt number (for retries)
 * @returns {Promise<object>} - The AI response
 */
async function makeAICall(prompt, modelConfig, attempt = 1) {
  const startTime = Date.now();
  
  try {
    // Check circuit breaker
    if (!shouldAllowRequest()) {
      throw new Error('Circuit breaker is open - request blocked');
    }
    
    // Set up timeout
    const timeoutMs = ERROR_CONFIG.timeoutMs;
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

      const response = await Promise.race([aiPromise, timeoutPromise]);
      clearTimeout(timeoutId);
      
      // Record success
      recordSuccess();
      
      const duration = Date.now() - startTime;
      console.log(`AI call successful (attempt ${attempt}, ${duration}ms)`);
      
      return response.choices[0].message.content;
      
    } finally {
      clearTimeout(timeoutId);
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorClassification = classifyError(error);
    
    console.error(`AI call failed (attempt ${attempt}, ${duration}ms):`, {
      error: error.message,
      type: errorClassification.type,
      retryable: errorClassification.retryable,
      circuitBreakerState: circuitBreaker.state
    });
    
    // Record failure for circuit breaker
    recordFailure();
    
    // If not retryable, throw immediately
    if (!errorClassification.retryable) {
      throw new Error(`${errorClassification.message}: ${error.message}`);
    }
    
    // If we've exhausted retries, throw
    if (attempt >= ERROR_CONFIG.maxRetries) {
      throw new Error(`Failed after ${ERROR_CONFIG.maxRetries} attempts: ${errorClassification.message}`);
    }
    
    // For timeouts and circuit breaker errors, don't retry
    if (error.message.includes('timed out') || error.message.includes('Circuit breaker is open')) {
      throw error;
    }
    
    // Calculate backoff delay
    const delay = calculateBackoffDelay(attempt);
    console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${ERROR_CONFIG.maxRetries})`);
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry the call
    return makeAICall(prompt, modelConfig, attempt + 1);
  }
}

/**
 * Validates generated content for age-appropriateness and educational value
 * @param {object} content - The content to validate
 * @param {number} studentAge - The student's age
 * @returns {object} - Validation result { isValid: boolean, reason?: string, severity?: 'low'|'medium'|'high' }
 */
function validateContent(content, studentAge) {
  // Basic validation rules
  const invalidWords = ['violent', 'inappropriate', 'offensive', 'dangerous', 'scary', 'frightening'];
  const contentStr = JSON.stringify(content).toLowerCase();
  
  // Check for inappropriate words
  for (const word of invalidWords) {
    if (contentStr.includes(word)) {
      return { 
        isValid: false, 
        reason: `Content contains inappropriate word: ${word}`,
        severity: 'high'
      };
    }
  }

  // Age-specific validation rules
  if (studentAge <= 8) {
    // Additional rules for younger students
    const youngChildInappropriate = ['death', 'kill', 'blood', 'weapon', 'fight', 'battle'];
    for (const word of youngChildInappropriate) {
      if (contentStr.includes(word)) {
        return { 
          isValid: false, 
          reason: `Content contains age-inappropriate word for ${studentAge}-year-old: ${word}`,
          severity: 'high'
        };
      }
    }
  } else if (studentAge <= 12) {
    // Rules for pre-teens - more permissive than younger children
    const preteenInappropriate = ['explicit violence', 'graphic content'];
    for (const word of preteenInappropriate) {
      if (contentStr.includes(word)) {
        return { 
          isValid: false, 
          reason: `Content contains age-inappropriate content for ${studentAge}-year-old: ${word}`,
          severity: 'medium'
        };
      }
    }
  }

  // Check for educational value
  if (contentStr.length < 50) {
    return { 
      isValid: false, 
      reason: 'Content is too short to be educationally valuable',
      severity: 'medium'
    };
  }

  // Check for repetitive or nonsensical content
  const words = contentStr.split(' ');
  const uniqueWords = new Set(words);
  if (uniqueWords.size < words.length * 0.3) {
    return { 
      isValid: false, 
      reason: 'Content appears to be repetitive or nonsensical',
      severity: 'medium'
    };
  }

  // Special validation for vocabulary content
  if (content.vocabularyWords || content.realWords) {
    const vocabularyValidation = validateVocabularyContent(content);
    if (!vocabularyValidation.isValid) {
      return vocabularyValidation;
    }
  }

  return { isValid: true };
}

/**
 * Validates vocabulary content specifically for quality issues
 * @param {object} content - The vocabulary content to validate
 * @returns {object} - Validation result with isValid boolean and reason string
 */
function validateVocabularyContent(content) {
  // Determine the structure (enhanced activities vs. other formats)
  const words = content.vocabularyWords || content.realWords || [];
  const decoys = content.decoyWords || content.decoyDefinitions || [];
  
  if (!words || words.length === 0) {
    return {
      isValid: false,
      reason: 'No vocabulary words found in content'
    };
  }

  // Check for duplicate words
  const wordSet = new Set();
  for (const wordObj of words) {
    const word = wordObj.word || wordObj.definition;
    if (wordSet.has(word.toLowerCase())) {
      return {
        isValid: false,
        reason: `Duplicate vocabulary word found: "${word}"`
      };
    }
    wordSet.add(word.toLowerCase());
  }

  // Check for circular definitions
  for (const wordObj of words) {
    const word = wordObj.word || '';
    const definition = wordObj.definition || '';
    
    if (word && definition) {
      const validation = validateVocabularyDefinition(word, definition);
      if (!validation.isValid) {
        return {
          isValid: false,
          reason: `Vocabulary definition quality issue: ${validation.reason}`
        };
      }
    }
  }

  // Check for missing periods in definitions
  for (const wordObj of words) {
    const definition = wordObj.definition || '';
    if (definition && !definition.trim().endsWith('.')) {
      return {
        isValid: false,
        reason: `Definition missing period: "${definition}"`
      };
    }
  }

  // Check decoy definitions for quality
  for (const decoy of decoys) {
    const definition = decoy.definition || '';
    if (definition && !definition.trim().endsWith('.')) {
      return {
        isValid: false,
        reason: `Decoy definition missing period: "${definition}"`
      };
    }
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
- Ensure all content is age-appropriate for the student's reading level
- Include brief descriptions for each character (real and decoy)
- Choose varied, setting-appropriate names that reflect the story's cultural/time context when possible
- Prefer natural, diverse given names (and surnames if relevant) over generic placeholders
- Vary syllable counts and initials across names; avoid repeating similar-sounding names within this list
- Do not mention any character ages in descriptions

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
- Ensure all content is age-appropriate for the student's reading level
- Include sensory details and atmosphere in descriptions when appropriate
- Use setting-appropriate character and place names where referenced (avoid generic placeholders)

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
- Extract 4-6 key events that occur throughout the ENTIRE chapter, not just the beginning
- Select events from different parts of the story: beginning, middle, and end
- Each event should be clearly distinct and represent a significant moment in the story
- Events should be written in simple, clear language appropriate for the student's reading level
- Each event should be 1-2 sentences long and capture the essential action
- Ensure all content is age-appropriate and educational
- When mentioning characters or places in events, use the varied, setting-appropriate names established for this chapter
- IMPORTANT: Make sure to include events from the middle and end of the story, not just the opening paragraphs
- For each event, identify which paragraph (1-based index) it primarily occurs in

OUTPUT FORMAT (valid JSON only):
{
  "orderedEvents": [
    {
      "id": 1,
      "text": "First event that happens in the story",
      "sourceParagraph": 1
    },
    {
      "id": 2,
      "text": "Second event that happens in the story",
      "sourceParagraph": 3
    }
  ]
}

IMPORTANT: 
- Return only valid JSON. Do not include any text outside the JSON structure.
- Events must be in the correct chronological order as they appear in the story.
- Each event should be self-contained and understandable on its own.
- Ensure you select events from throughout the entire passage, including the middle and end sections.
- The sourceParagraph field should indicate which paragraph (1-based index) the event primarily occurs in.
- If an event spans multiple paragraphs, use the paragraph where the event begins or is most prominent.
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
      if (!event.id || !event.text || typeof event.sourceParagraph !== 'number') {
        throw new Error(`Event at index ${i} missing required fields (id, text, or sourceParagraph)`);
      }
      if (event.id !== i + 1) {
        throw new Error(`Event IDs must be sequential starting from 1`);
      }
      if (event.sourceParagraph < 1) {
        throw new Error(`Event at index ${i} has invalid sourceParagraph (must be >= 1)`);
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
- Create exactly 4 multiple choice options
- One option should be the correct main idea of the story
- The other 3 options should be plausible but incorrect
- Each option should be 1-2 sentences long and clearly stated
- Provide explanatory feedback for each option explaining why it's correct or incorrect
- Ensure all content is age-appropriate for the student's reading level
- Use language appropriate for the student's reading level
- If referencing characters or places in options/feedback, use the chapter's varied, setting-appropriate names

OUTPUT FORMAT (valid JSON only):
{
  "question": "What is the main idea of this story?",
  "options": [
    {
      "text": "First option text",
      "isCorrect": true,
      "feedback": "This is correct because it captures the central theme and purpose of the story."
    },
    {
      "text": "Second option text",
      "isCorrect": false,
      "feedback": "This is incorrect because it focuses on a minor detail rather than the main idea."
    },
    {
      "text": "Third option text", 
      "isCorrect": false,
      "feedback": "This is incorrect because it misinterprets the story's central message."
    },
    {
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
      if (!option.text || typeof option.isCorrect !== 'boolean' || !option.feedback) {
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
 * Validates vocabulary definition quality to ensure educational value.
 * @param {string} word - The vocabulary word being defined.
 * @param {string} definition - The definition to validate.
 * @returns {object} - Validation result with isValid boolean and reason string.
 */
function validateVocabularyDefinition(word, definition) {
  const wordLower = word.toLowerCase();
  const definitionLower = definition.toLowerCase();
  
  // Check for circular definitions
  if (definitionLower.includes(wordLower)) {
    return {
      isValid: false,
      reason: `Circular definition: "${word}" appears in its own definition`
    };
  }
  
  // Check for overly simple definitions
  if (definitionLower.length < 20) {
    return {
      isValid: false,
      reason: `Definition too short: "${definition}" (minimum 20 characters)`
    };
  }
  
  // Check for proper sentence structure (ends with period)
  if (!definition.trim().endsWith('.')) {
    return {
      isValid: false,
      reason: `Definition must end with a period: "${definition}"`
    };
  }
  
  // Check for generic definitions
  const genericPhrases = ['a type of', 'something that', 'a thing that', 'a kind of'];
  if (genericPhrases.some(phrase => definitionLower.startsWith(phrase))) {
    return {
      isValid: false,
      reason: `Definition too generic: "${definition}"`
    };
  }
  
  return { isValid: true, reason: 'Definition passes quality checks' };
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
- Extract 4-6 vocabulary words that appear in this chapter and are appropriate for the student's reading level
- Choose words that are challenging but not too difficult for the student's reading level
- Provide age-appropriate definitions that are clear and educational
- Generate 2-3 decoy definitions that are plausible but incorrect for the vocabulary words
- Ensure all content is age-appropriate and educational
- Use simple, clear language in definitions
- When using example sentences, reference the chapter's varied, setting-appropriate names and places if needed
- All definitions must be complete sentences ending with periods
- NEVER use the target word in its own definition
- Avoid circular or overly simple definitions

VOCABULARY DEFINITION EXAMPLES:
GOOD: "Showing courage and not being afraid to face difficult situations."
BAD: "Being brave." (circular definition)

GOOD: "Having a lot of light or being very colorful and cheerful."
BAD: "Something that is bright." (circular definition)

GOOD: "Food that tastes very good and is enjoyable to eat."
BAD: "A type of food that people eat." (too generic)

OUTPUT FORMAT (valid JSON only):
{
  "vocabularyWords": [
    {
      "word": "brave",
      "definition": "Showing courage and not being afraid to face difficult situations.",
      "context": "The brave friend helped others when they needed it."
    }
  ],
  "decoyDefinitions": [
    {
      "definition": "A type of food that people eat.",
      "isUsed": false
    },
    {
      "definition": "A color that is bright and cheerful.",
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
- All definitions must be complete sentences ending with periods.
- Ensure no duplicate vocabulary words.
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

    if (parsedContent.decoyDefinitions.length < 1) {
      throw new Error('At least one decoy definition is required');
    }
    
    // Allow flexible number of decoy definitions (1-6 is reasonable)
    if (parsedContent.decoyDefinitions.length > 6) {
      console.warn(`Generated ${parsedContent.decoyDefinitions.length} decoy definitions, limiting to 6`);
      parsedContent.decoyDefinitions = parsedContent.decoyDefinitions.slice(0, 6);
    }

    // Validate that each vocabulary word has required fields
    for (let i = 0; i < parsedContent.vocabularyWords.length; i++) {
      const vocab = parsedContent.vocabularyWords[i];
      if (!vocab.word || !vocab.definition || !vocab.context) {
        throw new Error(`Vocabulary word at index ${i} missing required fields`);
      }
      
      // Validate definition quality using the utility function
      const validation = validateVocabularyDefinition(vocab.word, vocab.definition);
      if (!validation.isValid) {
        throw new Error(`Definition quality issue for "${vocab.word}": ${validation.reason}`);
      }
    }
    
    // Check for duplicate vocabulary words
    const words = parsedContent.vocabularyWords.map(v => v.word.toLowerCase());
    const uniqueWords = new Set(words);
    if (uniqueWords.size !== words.length) {
      throw new Error('Duplicate vocabulary words found. Each word should appear only once.');
    }

    // Validate that each decoy definition has required fields
    for (let i = 0; i < parsedContent.decoyDefinitions.length; i++) {
      const decoy = parsedContent.decoyDefinitions[i];
      if (!decoy.definition || typeof decoy.isUsed !== 'boolean') {
        throw new Error(`Decoy definition at index ${i} missing required fields`);
      }
    }

    // Transform the data structure to match what the frontend expects
    const transformedContent = {
      realWords: parsedContent.vocabularyWords.map(vocab => ({
        word: vocab.word,
        definition: vocab.definition,
        context: vocab.context
      })),
      decoyWords: parsedContent.decoyDefinitions.map(decoy => ({
        word: '', // Decoy words don't have actual words, just definitions
        definition: decoy.definition,
        context: '' // Decoy words don't have context
      }))
    };

    return transformedContent;
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
- Ensure all content is age-appropriate for the student's reading level
- Use language appropriate for the student's reading level
- Predictions should be creative but grounded in the story's context
- Refer to characters and settings using the chapter's varied, setting-appropriate names

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

    // Transform the data structure to match what the frontend expects
    const transformedContent = {
      question: parsedContent.question,
      options: parsedContent.predictions.map(prediction => ({
        text: prediction.text,
        plausibilityScore: prediction.plausibilityScore,
        feedback: prediction.feedback
      }))
    };

    return transformedContent;
  } catch (error) {
    console.error('Prediction extraction failed:', error);
    throw error;
  }
}

/**
 * Generates fallback content when AI generation fails or produces inappropriate content
 * @param {string} activityType - Type of activity to generate fallback for
 * @param {number} studentAge - The student's age
 * @returns {object} - Fallback content appropriate for the activity type
 */
function generateFallbackContent(activityType, studentAge) {
  const ageAppropriate = studentAge <= 8 ? 'simple' : studentAge <= 12 ? 'moderate' : 'advanced';
  
  switch (activityType) {
    case 'who':
      return {
        realCharacters: [
          {
            name: 'Alex',
            role: 'protagonist',
            description: 'A brave and kind friend who helps others.'
          },
          {
            name: 'Sam',
            role: 'supporting',
            description: 'A helpful companion who works with Alex.'
          }
        ],
        decoyCharacters: [
          {
            name: 'Jordan',
            role: 'helper',
            description: 'A friendly neighbor who could help in the story.'
          }
        ]
      };
    
    case 'where':
      return {
        realSettings: [
          {
            name: 'The Park',
            description: 'A beautiful green space with trees and playground equipment where friends can play and have adventures.'
          },
          {
            name: 'The Library',
            description: 'A quiet place full of books and knowledge where characters can learn and discover new things.'
          }
        ],
        decoySettings: [
          {
            name: 'The Museum',
            description: 'An interesting place where people can learn about history and science.'
          }
        ]
      };
    
    case 'sequence':
      return {
        orderedEvents: [
          { id: 1, text: 'The friends meet at the park to play.', sourceParagraph: 1 },
          { id: 2, text: 'They discover something interesting in the park.', sourceParagraph: 2 },
          { id: 3, text: 'They work together to solve a problem.', sourceParagraph: 3 },
          { id: 4, text: 'They learn an important lesson about friendship.', sourceParagraph: 4 }
        ],
        shuffledEvents: [
          { id: 3, text: 'They work together to solve a problem.', sourceParagraph: 3 },
          { id: 1, text: 'The friends meet at the park to play.', sourceParagraph: 1 },
          { id: 4, text: 'They learn an important lesson about friendship.', sourceParagraph: 4 },
          { id: 2, text: 'They discover something interesting in the park.', sourceParagraph: 2 }
        ]
      };
    
    case 'main-idea':
      return {
        question: 'What is the main idea of this story?',
        options: [
          {
            id: 'A',
            text: 'Friendship and teamwork help solve problems.',
            isCorrect: true,
            feedback: 'This is correct because the story shows how friends working together can overcome challenges.'
          },
          {
            id: 'B',
            text: 'Playing in the park is fun.',
            isCorrect: false,
            feedback: 'This is incorrect because it focuses on a minor detail rather than the main message.'
          },
          {
            id: 'C',
            text: 'Learning new things is important.',
            isCorrect: false,
            feedback: 'This is incorrect because it describes a general idea rather than the specific main idea.'
          },
          {
            id: 'D',
            text: 'The weather was nice that day.',
            isCorrect: false,
            feedback: 'This is incorrect because it describes a setting detail rather than the main idea.'
          }
        ]
      };
    
    case 'vocabulary':
      return {
        realWords: [
          {
            word: 'brave',
            definition: 'Showing courage and not being afraid to face difficult situations.',
            context: 'The brave friend helped others when they needed it.'
          },
          {
            word: 'helpful',
            definition: 'Willing to assist others and be useful.',
            context: 'The helpful student shared their supplies with classmates.'
          },
          {
            word: 'friendly',
            definition: 'Kind and pleasant to be around.',
            context: 'The friendly neighbor always says hello with a smile.'
          }
        ],
        decoyWords: [
          {
            word: 'delicious',
            definition: 'Food that tastes very good and is enjoyable to eat.',
            context: 'The delicious meal was enjoyed by everyone.'
          },
          {
            word: 'bright',
            definition: 'Having a lot of light or being very colorful and cheerful.',
            context: 'The bright colors made the room feel happy.'
          }
        ]
      };
    
    case 'predict':
      return {
        question: 'What do you think will happen next in the story?',
        options: [
          {
            text: 'The friends will work together to solve the problem.',
            plausibilityScore: 9,
            feedback: 'This is very likely because the story shows the friends helping each other.'
          },
          {
            text: 'They will ask an adult for help.',
            plausibilityScore: 7,
            feedback: 'This is quite likely because asking for help is a good problem-solving strategy.'
          },
          {
            text: 'They will find a creative solution.',
            plausibilityScore: 8,
            feedback: 'This is very likely because the story shows the friends being resourceful.'
          },
          {
            text: 'They will learn something new.',
            plausibilityScore: 6,
            feedback: 'This is somewhat likely because stories often teach lessons.'
          }
        ]
      };
    
    default:
      return {
        error: 'Unable to generate content for this activity type',
        fallback: true
      };
  }
}

/**
 * Attempts to regenerate content with different parameters if initial generation fails
 * @param {string} chapterContent - The story chapter text
 * @param {number} studentAge - The student's age
 * @param {string} activityType - Type of activity to generate
 * @param {number} attempt - Current attempt number (1-3)
 * @returns {Promise<object>} - Generated content or fallback
 */
async function attemptContentRegeneration(chapterContent, studentAge, activityType, attempt = 1) {
  const maxAttempts = 3;
  
  if (attempt > maxAttempts) {
    console.warn(`Failed to generate content after ${maxAttempts} attempts, using fallback`);
    return generateFallbackContent(activityType, studentAge);
  }

  try {
    // Adjust model parameters based on attempt number
    const modelConfig = {
      ...MODEL_CONFIG,
      temperature: Math.max(0.3, MODEL_CONFIG.temperature - (attempt - 1) * 0.2),
      max_tokens: Math.min(2000, MODEL_CONFIG.max_tokens + (attempt - 1) * 500)
    };

    let content;
    switch (activityType) {
      case 'who':
        content = await extractCharactersWithDecoys(chapterContent, studentAge);
        break;
      case 'where':
        content = await extractSettingsWithDescriptions(chapterContent, studentAge);
        break;
      case 'sequence':
        content = await extractEventSequence(chapterContent, studentAge);
        break;
      case 'main-idea':
        content = await extractMainIdeaWithOptions(chapterContent, studentAge);
        break;
      case 'vocabulary':
        content = await extractVocabularyWithDefinitions(chapterContent, studentAge);
        break;
      case 'predict':
        content = await extractPredictionOptions(chapterContent, studentAge);
        break;
      default:
        throw new Error(`Unknown activity type: ${activityType}`);
    }

    // Validate the regenerated content
    const validation = validateContent(content, studentAge);
    if (validation.isValid) {
      return content;
    }

    // If validation fails, try again with different parameters
    console.warn(`Content validation failed on attempt ${attempt}: ${validation.reason}`);
    return await attemptContentRegeneration(chapterContent, studentAge, activityType, attempt + 1);

  } catch (error) {
    console.error(`Content generation failed on attempt ${attempt}:`, error.message);
    
    // If it's the last attempt, return fallback
    if (attempt >= maxAttempts) {
      return generateFallbackContent(activityType, studentAge);
    }
    
    // Otherwise, try again
    return await attemptContentRegeneration(chapterContent, studentAge, activityType, attempt + 1);
  }
}

/**
 * Enhanced content generation with comprehensive error handling
 * @param {string} chapterContent - The story chapter text
 * @param {object} student - Student information including age
 * @param {string} activityType - Type of activity to generate content for
 * @param {boolean} useCache - Whether to use caching (default: true)
 * @returns {Promise<object>} - Generated activity content with caching and fallback support
 */
export async function generateActivityContent(chapterContent, student, activityType, useCache = true) {
  const startTime = Date.now();
  
  try {
    // Check cache first if caching is enabled
    if (useCache) {
      const cacheKey = generateCacheKey(chapterContent, student.age, activityType);
      const cachedContent = getCachedContent(cacheKey);
      
      if (cachedContent) {
        console.log(`Cache hit for activity type: ${activityType}`);
        return cachedContent;
      }
    }

    // First attempt: Generate content normally
    let content;
    
    try {
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
            MODEL_CONFIG
    );
      }
    } catch (error) {
      console.error(`Content generation failed for ${activityType}:`, error.message);
      throw error;
    }

    // Validate the generated content
    const validation = validateContent(content, student.age);
    if (validation.isValid) {
      // Cache the successful content if caching is enabled
      if (useCache) {
        const cacheKey = generateCacheKey(chapterContent, student.age, activityType);
        setCachedContent(cacheKey, content);
        console.log(`Cached content for activity type: ${activityType}`);
      }
      
      const duration = Date.now() - startTime;
      console.log(`Content generation successful (${activityType}, ${duration}ms)`);
      return content;
    }

    // If validation fails, attempt regeneration with different parameters
    console.warn(`Initial content validation failed: ${validation.reason}`);
    const regeneratedContent = await attemptContentRegeneration(chapterContent, student.age, activityType, 1);
    
    // Cache the regenerated content if it's not fallback content
    if (useCache && !regeneratedContent.fallback) {
      const cacheKey = generateCacheKey(chapterContent, student.age, activityType);
      setCachedContent(cacheKey, regeneratedContent);
      console.log(`Cached regenerated content for activity type: ${activityType}`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`Content generation completed with regeneration (${activityType}, ${duration}ms)`);
    return regeneratedContent;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Content generation failed completely (${activityType}, ${duration}ms):`, error.message);
    
    // Return fallback content if all attempts fail
    return generateFallbackContent(activityType, student.age);
  }
}

// Export functions for testing
export {
  makeAICall,
  classifyError,
  calculateBackoffDelay,
  shouldAllowRequest,
  recordFailure,
  recordSuccess,
  validateContent,
  generateFallbackContent,
  attemptContentRegeneration,
  generateCacheKey,
  getCachedContent,
  setCachedContent,
  cleanupCache,
  invalidateCache,
  getCacheStats,
  extractCharactersWithDecoys,
  extractSettingsWithDescriptions,
  extractEventSequence,
  extractMainIdeaWithOptions,
  extractVocabularyWithDefinitions,
  extractPredictionOptions
};
