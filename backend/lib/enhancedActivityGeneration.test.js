import { jest } from '@jest/globals';

// Mock environment and OpenAI
process.env.OPENAI_API_KEY = 'test-key';
process.env.NODE_ENV = 'test';

const mockCreate = jest.fn();
jest.unstable_mockModule('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate
      }
    }
  }))
}));

const { generateActivityContent, makeAICall, validateContent, generateFallbackContent, attemptContentRegeneration, extractCharactersWithDecoys, extractSettingsWithDescriptions, extractEventSequence, extractMainIdeaWithOptions, extractVocabularyWithDefinitions, extractPredictionOptions } = await import('./enhancedActivityGeneration.js');

// Clear mocks and timeouts after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe('Enhanced Activity Generation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('makeAICall', () => {
    it('should handle successful AI responses', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Generated content'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await makeAICall('test prompt', {});
      expect(result).toBe('Generated content');
    });

    it('should handle AI timeouts', async () => {
      mockCreate.mockImplementation(() => new Promise(() => {})); // never resolves

      await expect(makeAICall('test prompt', {})).rejects.toThrow('AI call timed out');
    });
  });

  describe('validateContent', () => {
    it('should reject content with inappropriate words', () => {
      const content = { text: 'This is violent and inappropriate content' };
      const result = validateContent(content, 10);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('inappropriate word');
      expect(result.severity).toBe('high');
    });

    it('should reject content with age-inappropriate words for young children', () => {
      const content = { text: 'The character used a weapon in the battle' };
      const result = validateContent(content, 7);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('age-inappropriate word');
      expect(result.severity).toBe('high');
    });

    it('should reject content with age-inappropriate words for pre-teens', () => {
      const content = { text: 'The story involves death and blood' };
      const result = validateContent(content, 11);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('age-inappropriate word');
      expect(result.severity).toBe('medium');
    });

    it('should reject content that is too short', () => {
      const content = { text: 'Short' };
      const result = validateContent(content, 10);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('too short');
      expect(result.severity).toBe('medium');
    });

    it('should reject repetitive content', () => {
      const content = { text: 'word word word word word word word word word word word word word word word word word word word word' };
      const result = validateContent(content, 10);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('repetitive');
      expect(result.severity).toBe('medium');
    });

    it('should accept appropriate content for older students', () => {
      const content = { text: 'This is appropriate educational content with good vocabulary and meaningful content.' };
      const result = validateContent(content, 15);
      
      expect(result.isValid).toBe(true);
    });

    it('should accept appropriate content for young children', () => {
      const content = { text: 'The friendly cat played with the happy dog in the sunny park.' };
      const result = validateContent(content, 6);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('generateFallbackContent', () => {
    it('should generate fallback content for who activity type', () => {
      const result = generateFallbackContent('who', 10);
      
      expect(result.realCharacters).toBeDefined();
      expect(result.realCharacters).toHaveLength(2);
      expect(result.decoyCharacters).toBeDefined();
      expect(result.decoyCharacters).toHaveLength(1);
      expect(result.realCharacters[0].name).toBe('Alex');
      expect(result.realCharacters[0].role).toBe('protagonist');
    });

    it('should generate fallback content for where activity type', () => {
      const result = generateFallbackContent('where', 10);
      
      expect(result.realSettings).toBeDefined();
      expect(result.realSettings).toHaveLength(2);
      expect(result.decoySettings).toBeDefined();
      expect(result.decoySettings).toHaveLength(1);
      expect(result.realSettings[0].name).toBe('The Park');
    });

    it('should generate fallback content for sequence activity type', () => {
      const result = generateFallbackContent('sequence', 10);
      
      expect(result.orderedEvents).toBeDefined();
      expect(result.orderedEvents).toHaveLength(4);
      expect(result.shuffledEvents).toBeDefined();
      expect(result.shuffledEvents).toHaveLength(4);
      expect(result.orderedEvents[0].id).toBe(1);
    });

    it('should generate fallback content for main-idea activity type', () => {
      const result = generateFallbackContent('main-idea', 10);
      
      expect(result.question).toBeDefined();
      expect(result.options).toBeDefined();
      expect(result.options).toHaveLength(4);
      expect(result.options[0].isCorrect).toBe(true);
    });

    it('should generate fallback content for vocabulary activity type', () => {
      const result = generateFallbackContent('vocabulary', 10);
      
      expect(result.vocabularyWords).toBeDefined();
      expect(result.vocabularyWords).toHaveLength(3);
      expect(result.decoyDefinitions).toBeDefined();
      expect(result.decoyDefinitions).toHaveLength(2);
      expect(result.vocabularyWords[0].word).toBe('brave');
    });

    it('should generate fallback content for predict activity type', () => {
      const result = generateFallbackContent('predict', 10);
      
      expect(result.question).toBeDefined();
      expect(result.predictions).toBeDefined();
      expect(result.predictions).toHaveLength(4);
      expect(result.predictions[0].plausibilityScore).toBe(9);
    });

    it('should handle unknown activity type', () => {
      const result = generateFallbackContent('unknown', 10);
      
      expect(result.error).toBeDefined();
      expect(result.fallback).toBe(true);
    });
  });

  describe('attemptContentRegeneration', () => {
    const mockChapter = 'The brave knight stood at the castle gates.';

    it('should return fallback content after max attempts', async () => {
      // Mock all extraction functions to fail
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await attemptContentRegeneration(mockChapter, 10, 'who', 4);
      
      expect(result.realCharacters).toBeDefined();
      expect(result.realCharacters[0].name).toBe('Alex');
    });

    it('should attempt regeneration with adjusted parameters', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realCharacters: [
                {
                  name: 'Test Character',
                  role: 'protagonist',
                  description: 'A brave and kind character.'
                },
                {
                  name: 'Another Character',
                  role: 'supporting',
                  description: 'A helpful character.'
                }
              ],
              decoyCharacters: [
                {
                  name: 'Decoy Character',
                  role: 'helper',
                  description: 'A helpful character.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await attemptContentRegeneration(mockChapter, 10, 'who', 1);
      
      expect(result.realCharacters).toBeDefined();
      expect(result.realCharacters[0].name).toBe('Test Character');
    });

    it('should handle validation failures and retry', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realCharacters: [
                {
                  name: 'Violent Character',
                  role: 'protagonist',
                  description: 'A violent and dangerous character.'
                }
              ],
              decoyCharacters: []
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await attemptContentRegeneration(mockChapter, 10, 'who', 1);
      
      // Should return fallback content after validation failure
      expect(result.realCharacters[0].name).toBe('Alex');
    });
  });

  describe('generateActivityContent', () => {
    const mockStudent = {
      age: 10,
      name: 'Test Student'
    };

    const mockChapter = 'Once upon a time...';

    it('should generate and validate content successfully', async () => {
      const mockContent = {
        text: 'Appropriate generated content'
      };

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: mockContent
          }
        }]
      });

      const result = await generateActivityContent(mockChapter, mockStudent, 'general');
      expect(result).toBeDefined();
    });

    it('should handle validation failures', async () => {
      const mockContent = {
        text: 'inappropriate content'
      };

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: mockContent
          }
        }]
      });

      const result = await generateActivityContent(mockChapter, mockStudent, 'general');
      expect(result.error).toBeDefined();
      expect(result.fallback).toBe(true);
    });

    it('should use character extraction for who activity type', async () => {
      const mockCharacterResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realCharacters: [
                {
                  name: 'Sir Arthur',
                  role: 'protagonist',
                  description: 'A brave knight'
                },
                {
                  name: 'Tom',
                  role: 'supporting',
                  description: 'Sir Arthur\'s loyal squire'
                }
              ],
              decoyCharacters: [
                {
                  name: 'Queen Guinevere',
                  role: 'supporting',
                  description: 'A queen who could be part of the royal court'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockCharacterResponse);

      const result = await generateActivityContent(mockChapter, mockStudent, 'who');
      
      expect(result.realCharacters).toBeDefined();
      expect(result.decoyCharacters).toBeDefined();
      expect(result.realCharacters).toHaveLength(2);
      expect(result.decoyCharacters).toHaveLength(1);
    });

    it('should use setting extraction for where activity type', async () => {
      const mockSettingResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realSettings: [
                {
                  name: 'Castle',
                  description: 'A grand castle on a hilltop'
                },
                {
                  name: 'Library',
                  description: 'A cozy library filled with books'
                }
              ],
              decoySettings: [
                {
                  name: 'Village Market',
                  description: 'A bustling market in the village'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockSettingResponse);

      const result = await generateActivityContent(mockChapter, mockStudent, 'where');
      
      expect(result.realSettings).toBeDefined();
      expect(result.decoySettings).toBeDefined();
      expect(result.realSettings).toHaveLength(2);
      expect(result.decoySettings).toHaveLength(1);
    });

    it('should use event sequence extraction for sequence activity type', async () => {
      const mockSequenceResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              orderedEvents: [
                {
                  id: 1,
                  text: 'The knight woke up.'
                },
                {
                  id: 2,
                  text: 'He put on his armor.'
                },
                {
                  id: 3,
                  text: 'He fought the dragon.'
                },
                {
                  id: 4,
                  text: 'He saved the kingdom.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockSequenceResponse);

      const result = await generateActivityContent(mockChapter, mockStudent, 'sequence');
      
      expect(result.orderedEvents).toBeDefined();
      expect(result.shuffledEvents).toBeDefined();
      expect(result.orderedEvents).toHaveLength(4);
      expect(result.shuffledEvents).toHaveLength(4);
    });

    it('should use main idea extraction for main-idea activity type', async () => {
      const mockMainIdeaResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What is the main idea of this story?',
              options: [
                {
                  id: 'A',
                  text: 'The knight saved the kingdom.',
                  isCorrect: true,
                  feedback: 'This is correct.'
                },
                {
                  id: 'B',
                  text: 'Dragons are dangerous.',
                  isCorrect: false,
                  feedback: 'This is incorrect.'
                },
                {
                  id: 'C',
                  text: 'Castles are big buildings.',
                  isCorrect: false,
                  feedback: 'This is incorrect.'
                },
                {
                  id: 'D',
                  text: 'Knights wear armor.',
                  isCorrect: false,
                  feedback: 'This is incorrect.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockMainIdeaResponse);

      const result = await generateActivityContent(mockChapter, mockStudent, 'main-idea');
      
      expect(result.question).toBeDefined();
      expect(result.options).toBeDefined();
      expect(result.options).toHaveLength(4);
      expect(result.options[0].isCorrect).toBe(true);
    });

    it('should use vocabulary extraction for vocabulary activity type', async () => {
      const mockVocabularyResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              vocabularyWords: [
                {
                  word: 'brave',
                  definition: 'Showing courage',
                  context: 'The brave knight.'
                },
                {
                  word: 'strong',
                  definition: 'Having power',
                  context: 'The strong knight.'
                },
                {
                  word: 'noble',
                  definition: 'Having honor',
                  context: 'The noble knight.'
                }
              ],
              decoyDefinitions: [
                {
                  definition: 'A type of armor',
                  isUsed: false
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockVocabularyResponse);

      const result = await generateActivityContent(mockChapter, mockStudent, 'vocabulary');
      
      expect(result.vocabularyWords).toBeDefined();
      expect(result.decoyDefinitions).toBeDefined();
      expect(result.vocabularyWords).toHaveLength(3);
      expect(result.decoyDefinitions).toHaveLength(1);
    });

    it('should use prediction extraction for predict activity type', async () => {
      const mockPredictionResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What do you think will happen next in the story?',
              predictions: [
                {
                  id: 'A',
                  text: 'The knight will find help.',
                  plausibilityScore: 8,
                  feedback: 'This is likely.'
                },
                {
                  id: 'B',
                  text: 'The dragon will leave.',
                  plausibilityScore: 4,
                  feedback: 'This is possible.'
                },
                {
                  id: 'C',
                  text: 'The villagers will help.',
                  plausibilityScore: 6,
                  feedback: 'This could happen.'
                },
                {
                  id: 'D',
                  text: 'A wizard will appear.',
                  plausibilityScore: 7,
                  feedback: 'This is quite likely.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockPredictionResponse);

      const result = await generateActivityContent(mockChapter, mockStudent, 'predict');
      
      expect(result.question).toBeDefined();
      expect(result.predictions).toBeDefined();
      expect(result.predictions).toHaveLength(4);
      expect(result.predictions[0].plausibilityScore).toBe(8);
    });
  });

  describe('generateActivityContent with fallback', () => {
    const mockStudent = {
      age: 10,
      name: 'Test Student'
    };

    const mockChapter = 'Once upon a time...';

    it('should return fallback content when AI generation fails', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      const result = await generateActivityContent(mockChapter, mockStudent, 'who');
      
      expect(result.realCharacters).toBeDefined();
      expect(result.realCharacters[0].name).toBe('Alex');
    });

    it('should return fallback content when validation fails', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realCharacters: [
                {
                  name: 'Violent Character',
                  role: 'protagonist',
                  description: 'A violent and dangerous character.'
                }
              ],
              decoyCharacters: []
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await generateActivityContent(mockChapter, mockStudent, 'who');
      
      expect(result.realCharacters[0].name).toBe('Alex');
    });

    it('should return successful content when validation passes', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realCharacters: [
                {
                  name: 'Good Character',
                  role: 'protagonist',
                  description: 'A brave and kind character.'
                },
                {
                  name: 'Another Character',
                  role: 'supporting',
                  description: 'A helpful character.'
                }
              ],
              decoyCharacters: [
                {
                  name: 'Decoy Character',
                  role: 'helper',
                  description: 'A helpful character.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await generateActivityContent(mockChapter, mockStudent, 'who');
      
      expect(result.realCharacters[0].name).toBe('Good Character');
    });
  });
});
