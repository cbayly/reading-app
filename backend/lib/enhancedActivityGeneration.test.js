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

const { generateActivityContent, makeAICall, validateContent, extractCharactersWithDecoys, extractSettingsWithDescriptions, extractEventSequence, extractMainIdeaWithOptions, extractVocabularyWithDefinitions, extractPredictionOptions } = await import('./enhancedActivityGeneration.js');

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
    it('should reject inappropriate content', () => {
      const content = {
        text: 'This contains violent content'
      };

      const result = validateContent(content, 10);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('inappropriate');
    });

    it('should accept appropriate content', () => {
      const content = {
        text: 'This is a happy story about friendship'
      };

      const result = validateContent(content, 10);
      expect(result.isValid).toBe(true);
    });
  });

  describe('extractCharactersWithDecoys', () => {
    const mockChapter = 'Once upon a time, there was a brave knight named Sir Arthur who lived in a castle with his loyal squire, Tom. They were often visited by the wise wizard Merlin.';

    it('should extract characters and generate decoys successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realCharacters: [
                {
                  name: 'Sir Arthur',
                  role: 'protagonist',
                  description: 'A brave knight who is the main character'
                },
                {
                  name: 'Tom',
                  role: 'supporting',
                  description: 'Sir Arthur\'s loyal squire'
                },
                {
                  name: 'Merlin',
                  role: 'supporting',
                  description: 'A wise wizard who visits the castle'
                }
              ],
              decoyCharacters: [
                {
                  name: 'Queen Guinevere',
                  role: 'supporting',
                  description: 'A queen who could be part of the royal court'
                },
                {
                  name: 'Dragon',
                  role: 'antagonist',
                  description: 'A mythical creature that could threaten the kingdom'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await extractCharactersWithDecoys(mockChapter, 10);
      
      expect(result.realCharacters).toHaveLength(3);
      expect(result.decoyCharacters).toHaveLength(2);
      expect(result.realCharacters[0].name).toBe('Sir Arthur');
      expect(result.realCharacters[0].role).toBe('protagonist');
      expect(result.decoyCharacters[0].name).toBe('Queen Guinevere');
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractCharactersWithDecoys(mockChapter, 10))
        .rejects
        .toThrow('Invalid JSON response from AI character extraction');
    });

    it('should handle missing required fields', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realCharacters: []
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractCharactersWithDecoys(mockChapter, 10))
        .rejects
        .toThrow('Character extraction response missing required fields');
    });

    it('should handle inappropriate content in character descriptions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realCharacters: [
                {
                  name: 'Sir Arthur',
                  role: 'protagonist',
                  description: 'A violent knight who fights inappropriate battles'
                }
              ],
              decoyCharacters: []
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractCharactersWithDecoys(mockChapter, 10))
        .rejects
        .toThrow('Character content validation failed');
    });

    it('should handle too few real characters', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realCharacters: [
                {
                  name: 'Sir Arthur',
                  role: 'protagonist',
                  description: 'A brave knight'
                }
              ],
              decoyCharacters: []
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractCharactersWithDecoys(mockChapter, 10))
        .rejects
        .toThrow('Invalid number of real characters extracted');
    });

    it('should handle too many real characters', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realCharacters: Array(7).fill().map((_, i) => ({
                name: `Character ${i}`,
                role: 'supporting',
                description: 'A character'
              })),
              decoyCharacters: []
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractCharactersWithDecoys(mockChapter, 10))
        .rejects
        .toThrow('Invalid number of real characters extracted');
    });
  });

  describe('extractSettingsWithDescriptions', () => {
    const mockChapter = 'The story began in a grand castle on a hilltop, surrounded by a lush forest. Inside the castle, there was a cozy library filled with ancient books. Later, the characters ventured into a mysterious cave deep in the mountains.';

    it('should extract settings and generate decoys successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realSettings: [
                {
                  name: 'Grand Castle',
                  description: 'A magnificent castle perched on a hilltop, surrounded by a lush forest. The castle has tall towers and stone walls that have stood for centuries.'
                },
                {
                  name: 'Cozy Library',
                  description: 'A warm and inviting library inside the castle, filled with ancient books and comfortable reading chairs. The air is thick with the smell of old parchment.'
                },
                {
                  name: 'Mysterious Cave',
                  description: 'A dark and mysterious cave deep in the mountains, with echoing chambers and strange rock formations that create an eerie atmosphere.'
                }
              ],
              decoySettings: [
                {
                  name: 'Village Market',
                  description: 'A bustling village market at the base of the hill, where villagers gather to trade goods and share news from the surrounding lands.'
                },
                {
                  name: 'Enchanted Garden',
                  description: 'A magical garden behind the castle walls, filled with colorful flowers that seem to glow in the moonlight and whisper secrets to visitors.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await extractSettingsWithDescriptions(mockChapter, 10);
      
      expect(result.realSettings).toHaveLength(3);
      expect(result.decoySettings).toHaveLength(2);
      expect(result.realSettings[0].name).toBe('Grand Castle');
      expect(result.realSettings[0].description).toContain('magnificent castle');
      expect(result.decoySettings[0].name).toBe('Village Market');
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractSettingsWithDescriptions(mockChapter, 10))
        .rejects
        .toThrow('Invalid JSON response from AI setting extraction');
    });

    it('should handle missing required fields', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realSettings: []
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractSettingsWithDescriptions(mockChapter, 10))
        .rejects
        .toThrow('Setting extraction response missing required fields');
    });

    it('should handle inappropriate content in setting descriptions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realSettings: [
                {
                  name: 'Castle',
                  description: 'A violent castle where inappropriate battles take place'
                }
              ],
              decoySettings: []
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractSettingsWithDescriptions(mockChapter, 10))
        .rejects
        .toThrow('Setting content validation failed');
    });

    it('should handle too few real settings', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realSettings: [
                {
                  name: 'Castle',
                  description: 'A grand castle on a hilltop'
                }
              ],
              decoySettings: []
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractSettingsWithDescriptions(mockChapter, 10))
        .rejects
        .toThrow('Invalid number of real settings extracted');
    });

    it('should handle too many real settings', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              realSettings: Array(7).fill().map((_, i) => ({
                name: `Setting ${i}`,
                description: 'A setting description'
              })),
              decoySettings: []
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractSettingsWithDescriptions(mockChapter, 10))
        .rejects
        .toThrow('Invalid number of real settings extracted');
    });
  });

  describe('extractEventSequence', () => {
    const mockChapter = 'The brave knight woke up early in the morning. He put on his armor and prepared for battle. The knight rode his horse to the castle gates. He fought bravely against the dragon and saved the kingdom. Finally, the people celebrated his victory with a grand feast.';

    it('should extract event sequence successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              orderedEvents: [
                {
                  id: 1,
                  text: 'The brave knight woke up early in the morning.'
                },
                {
                  id: 2,
                  text: 'He put on his armor and prepared for battle.'
                },
                {
                  id: 3,
                  text: 'The knight rode his horse to the castle gates.'
                },
                {
                  id: 4,
                  text: 'He fought bravely against the dragon and saved the kingdom.'
                },
                {
                  id: 5,
                  text: 'Finally, the people celebrated his victory with a grand feast.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await extractEventSequence(mockChapter, 10);
      
      expect(result.orderedEvents).toHaveLength(5);
      expect(result.shuffledEvents).toHaveLength(5);
      expect(result.orderedEvents[0].id).toBe(1);
      expect(result.orderedEvents[0].text).toBe('The brave knight woke up early in the morning.');
      expect(result.orderedEvents[4].id).toBe(5);
      expect(result.orderedEvents[4].text).toBe('Finally, the people celebrated his victory with a grand feast.');
      
      // Verify shuffled events contain the same content but in different order
      const orderedTexts = result.orderedEvents.map(e => e.text);
      const shuffledTexts = result.shuffledEvents.map(e => e.text);
      expect(shuffledTexts.sort()).toEqual(orderedTexts.sort());
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractEventSequence(mockChapter, 10))
        .rejects
        .toThrow('Invalid JSON response from AI event sequence extraction');
    });

    it('should handle missing required fields', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({})
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractEventSequence(mockChapter, 10))
        .rejects
        .toThrow('Event sequence response missing required fields');
    });

    it('should handle inappropriate content in event descriptions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              orderedEvents: [
                {
                  id: 1,
                  text: 'The knight engaged in violent and inappropriate behavior.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractEventSequence(mockChapter, 10))
        .rejects
        .toThrow('Event sequence content validation failed');
    });

    it('should handle too few events', async () => {
      const mockResponse = {
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
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractEventSequence(mockChapter, 10))
        .rejects
        .toThrow('Invalid number of events extracted');
    });

    it('should handle too many events', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              orderedEvents: Array(7).fill().map((_, i) => ({
                id: i + 1,
                text: `Event ${i + 1}`
              }))
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractEventSequence(mockChapter, 10))
        .rejects
        .toThrow('Invalid number of events extracted');
    });

    it('should handle missing event fields', async () => {
      const mockResponse = {
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
                  id: 4
                  // missing text field
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractEventSequence(mockChapter, 10))
        .rejects
        .toThrow('Event at index 3 missing required fields');
    });

    it('should handle non-sequential event IDs', async () => {
      const mockResponse = {
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
                  id: 5, // should be 4
                  text: 'He saved the kingdom.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractEventSequence(mockChapter, 10))
        .rejects
        .toThrow('Event IDs must be sequential starting from 1');
    });
  });

  describe('extractMainIdeaWithOptions', () => {
    const mockChapter = 'Once upon a time, there was a brave knight named Sir Arthur who lived in a castle. Every day, he trained hard to become stronger and protect his kingdom. One day, a fierce dragon attacked the village. Sir Arthur bravely fought the dragon and saved all the people. The villagers were so grateful that they celebrated his courage and made him their hero.';

    it('should extract main idea with options successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What is the main idea of this story?',
              options: [
                {
                  id: 'A',
                  text: 'Sir Arthur bravely fought a dragon to save his kingdom and became a hero.',
                  isCorrect: true,
                  feedback: 'This is correct because it captures the central theme of courage and heroism in protecting others.'
                },
                {
                  id: 'B',
                  text: 'Dragons are dangerous creatures that attack villages.',
                  isCorrect: false,
                  feedback: 'This is incorrect because it focuses on a detail about dragons rather than the main idea of the story.'
                },
                {
                  id: 'C',
                  text: 'Villages should have strong walls to protect against attacks.',
                  isCorrect: false,
                  feedback: 'This is incorrect because it suggests a solution that is not mentioned in the story.'
                },
                {
                  id: 'D',
                  text: 'Knights live in castles and train every day.',
                  isCorrect: false,
                  feedback: 'This is incorrect because it describes a setting detail rather than the main idea of the story.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await extractMainIdeaWithOptions(mockChapter, 10);
      
      expect(result.question).toBe('What is the main idea of this story?');
      expect(result.options).toHaveLength(4);
      expect(result.options[0].id).toBe('A');
      expect(result.options[0].isCorrect).toBe(true);
      expect(result.options[0].feedback).toContain('correct');
      expect(result.options[1].isCorrect).toBe(false);
      expect(result.options[2].isCorrect).toBe(false);
      expect(result.options[3].isCorrect).toBe(false);
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractMainIdeaWithOptions(mockChapter, 10))
        .rejects
        .toThrow('Invalid JSON response from AI main idea extraction');
    });

    it('should handle missing required fields', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({})
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractMainIdeaWithOptions(mockChapter, 10))
        .rejects
        .toThrow('Main idea response missing required fields');
    });

    it('should handle inappropriate content in options', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What is the main idea?',
              options: [
                {
                  id: 'A',
                  text: 'The knight engaged in violent and inappropriate behavior.',
                  isCorrect: true,
                  feedback: 'This is correct.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractMainIdeaWithOptions(mockChapter, 10))
        .rejects
        .toThrow('Main idea content validation failed');
    });

    it('should handle wrong number of options', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What is the main idea?',
              options: [
                {
                  id: 'A',
                  text: 'Option A',
                  isCorrect: true,
                  feedback: 'This is correct.'
                },
                {
                  id: 'B',
                  text: 'Option B',
                  isCorrect: false,
                  feedback: 'This is incorrect.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractMainIdeaWithOptions(mockChapter, 10))
        .rejects
        .toThrow('Main idea must have exactly 4 options');
    });

    it('should handle missing option fields', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What is the main idea?',
              options: [
                {
                  id: 'A',
                  text: 'Option A',
                  isCorrect: true,
                  feedback: 'This is correct.'
                },
                {
                  id: 'B',
                  text: 'Option B'
                  // missing isCorrect and feedback
                },
                {
                  id: 'C',
                  text: 'Option C',
                  isCorrect: false,
                  feedback: 'This is incorrect.'
                },
                {
                  id: 'D',
                  text: 'Option D',
                  isCorrect: false,
                  feedback: 'This is incorrect.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractMainIdeaWithOptions(mockChapter, 10))
        .rejects
        .toThrow('Option at index 1 missing required fields');
    });

    it('should handle multiple correct answers', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What is the main idea?',
              options: [
                {
                  id: 'A',
                  text: 'Option A',
                  isCorrect: true,
                  feedback: 'This is correct.'
                },
                {
                  id: 'B',
                  text: 'Option B',
                  isCorrect: true, // should be false
                  feedback: 'This is also correct.'
                },
                {
                  id: 'C',
                  text: 'Option C',
                  isCorrect: false,
                  feedback: 'This is incorrect.'
                },
                {
                  id: 'D',
                  text: 'Option D',
                  isCorrect: false,
                  feedback: 'This is incorrect.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractMainIdeaWithOptions(mockChapter, 10))
        .rejects
        .toThrow('Main idea must have exactly one correct answer');
    });

    it('should handle no correct answers', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What is the main idea?',
              options: [
                {
                  id: 'A',
                  text: 'Option A',
                  isCorrect: false,
                  feedback: 'This is incorrect.'
                },
                {
                  id: 'B',
                  text: 'Option B',
                  isCorrect: false,
                  feedback: 'This is incorrect.'
                },
                {
                  id: 'C',
                  text: 'Option C',
                  isCorrect: false,
                  feedback: 'This is incorrect.'
                },
                {
                  id: 'D',
                  text: 'Option D',
                  isCorrect: false,
                  feedback: 'This is incorrect.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractMainIdeaWithOptions(mockChapter, 10))
        .rejects
        .toThrow('Main idea must have exactly one correct answer');
    });
  });

  describe('extractVocabularyWithDefinitions', () => {
    const mockChapter = 'The brave knight wore his shining armor and carried a mighty sword. He was courageous and determined to protect the kingdom from any danger. The villagers admired his noble spirit and trusted him completely.';

    it('should extract vocabulary with definitions successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              vocabularyWords: [
                {
                  word: 'brave',
                  definition: 'Showing courage and not being afraid to face difficult situations',
                  context: 'The brave knight wore his shining armor.'
                },
                {
                  word: 'courageous',
                  definition: 'Having the ability to face danger or difficulty without fear',
                  context: 'He was courageous and determined to protect the kingdom.'
                },
                {
                  word: 'noble',
                  definition: 'Having high moral qualities and honorable character',
                  context: 'The villagers admired his noble spirit.'
                },
                {
                  word: 'mighty',
                  definition: 'Very strong and powerful',
                  context: 'He carried a mighty sword.'
                }
              ],
              decoyDefinitions: [
                {
                  definition: 'A type of armor worn by knights',
                  isUsed: false
                },
                {
                  definition: 'A weapon used in battle',
                  isUsed: false
                },
                {
                  definition: 'A small village or town',
                  isUsed: false
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await extractVocabularyWithDefinitions(mockChapter, 10);
      
      expect(result.vocabularyWords).toHaveLength(4);
      expect(result.decoyDefinitions).toHaveLength(3);
      expect(result.vocabularyWords[0].word).toBe('brave');
      expect(result.vocabularyWords[0].definition).toContain('courage');
      expect(result.vocabularyWords[0].context).toContain('brave knight');
      expect(result.decoyDefinitions[0].definition).toContain('armor');
      expect(result.decoyDefinitions[0].isUsed).toBe(false);
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractVocabularyWithDefinitions(mockChapter, 10))
        .rejects
        .toThrow('Invalid JSON response from AI vocabulary extraction');
    });

    it('should handle missing required fields', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({})
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractVocabularyWithDefinitions(mockChapter, 10))
        .rejects
        .toThrow('Vocabulary response missing required fields');
    });

    it('should handle inappropriate content in vocabulary', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              vocabularyWords: [
                {
                  word: 'violent',
                  definition: 'Engaging in violent and inappropriate behavior',
                  context: 'The knight was violent.'
                }
              ],
              decoyDefinitions: []
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractVocabularyWithDefinitions(mockChapter, 10))
        .rejects
        .toThrow('Vocabulary content validation failed');
    });

    it('should handle too few vocabulary words', async () => {
      const mockResponse = {
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
                }
              ],
              decoyDefinitions: []
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractVocabularyWithDefinitions(mockChapter, 10))
        .rejects
        .toThrow('Invalid number of vocabulary words extracted');
    });

    it('should handle too many vocabulary words', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              vocabularyWords: Array(7).fill().map((_, i) => ({
                word: `word${i}`,
                definition: `definition ${i}`,
                context: `context ${i}`
              })),
              decoyDefinitions: []
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractVocabularyWithDefinitions(mockChapter, 10))
        .rejects
        .toThrow('Invalid number of vocabulary words extracted');
    });

    it('should handle missing vocabulary word fields', async () => {
      const mockResponse = {
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
                  word: 'noble'
                  // missing definition and context
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

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractVocabularyWithDefinitions(mockChapter, 10))
        .rejects
        .toThrow('Vocabulary word at index 2 missing required fields');
    });

    it('should handle missing decoy definition fields', async () => {
      const mockResponse = {
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
                  definition: 'A type of armor'
                  // missing isUsed field
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractVocabularyWithDefinitions(mockChapter, 10))
        .rejects
        .toThrow('Decoy definition at index 0 missing required fields');
    });
  });

  describe('extractPredictionOptions', () => {
    const mockChapter = 'The brave knight stood at the castle gates, facing the fierce dragon. His sword was broken, and he knew he needed help to save the kingdom. The villagers watched from behind the castle walls, hoping for a miracle.';

    it('should extract prediction options successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What do you think will happen next in the story?',
              predictions: [
                {
                  id: 'A',
                  text: 'The knight will find a magical sword to help defeat the dragon.',
                  plausibilityScore: 8,
                  feedback: 'This is very plausible because the story shows the knight needs help, and magical items are common in fantasy stories.'
                },
                {
                  id: 'B',
                  text: 'The dragon will become friends with the knight.',
                  plausibilityScore: 3,
                  feedback: 'This is less likely because the story shows the dragon as a threat, though unexpected friendships can happen in stories.'
                },
                {
                  id: 'C',
                  text: 'The villagers will build a wall around the castle.',
                  plausibilityScore: 6,
                  feedback: 'This is somewhat plausible as a defensive measure, but the story hasn\'t shown the villagers taking action yet.'
                },
                {
                  id: 'D',
                  text: 'A wizard will appear to help the knight.',
                  plausibilityScore: 7,
                  feedback: 'This is quite plausible because wizards often help heroes in fantasy stories, and the knight needs assistance.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await extractPredictionOptions(mockChapter, 10);
      
      expect(result.question).toBe('What do you think will happen next in the story?');
      expect(result.predictions).toHaveLength(4);
      expect(result.predictions[0].id).toBe('A');
      expect(result.predictions[0].plausibilityScore).toBe(8);
      expect(result.predictions[0].feedback).toContain('plausible');
      expect(result.predictions[1].plausibilityScore).toBe(3);
      expect(result.predictions[2].plausibilityScore).toBe(6);
      expect(result.predictions[3].plausibilityScore).toBe(7);
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractPredictionOptions(mockChapter, 10))
        .rejects
        .toThrow('Invalid JSON response from AI prediction extraction');
    });

    it('should handle missing required fields', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({})
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractPredictionOptions(mockChapter, 10))
        .rejects
        .toThrow('Prediction response missing required fields');
    });

    it('should handle inappropriate content in predictions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What will happen next?',
              predictions: [
                {
                  id: 'A',
                  text: 'The knight will engage in violent and inappropriate behavior.',
                  plausibilityScore: 5,
                  feedback: 'This is possible.'
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractPredictionOptions(mockChapter, 10))
        .rejects
        .toThrow('Prediction content validation failed');
    });

    it('should handle too few predictions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What will happen next?',
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
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractPredictionOptions(mockChapter, 10))
        .rejects
        .toThrow('Invalid number of predictions generated');
    });

    it('should handle too many predictions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What will happen next?',
              predictions: Array(7).fill().map((_, i) => ({
                id: String.fromCharCode(65 + i),
                text: `Prediction ${i + 1}`,
                plausibilityScore: 5,
                feedback: `Feedback ${i + 1}`
              }))
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractPredictionOptions(mockChapter, 10))
        .rejects
        .toThrow('Invalid number of predictions generated');
    });

    it('should handle missing prediction fields', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What will happen next?',
              predictions: [
                {
                  id: 'A',
                  text: 'The knight will find help.',
                  plausibilityScore: 8,
                  feedback: 'This is likely.'
                },
                {
                  id: 'B',
                  text: 'The dragon will leave.'
                  // missing plausibilityScore and feedback
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

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractPredictionOptions(mockChapter, 10))
        .rejects
        .toThrow('Prediction at index 1 missing required fields');
    });

    it('should handle invalid plausibility scores', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What will happen next?',
              predictions: [
                {
                  id: 'A',
                  text: 'The knight will find help.',
                  plausibilityScore: 15, // invalid score
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

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractPredictionOptions(mockChapter, 10))
        .rejects
        .toThrow('Prediction at index 0 has invalid plausibility score (must be 1-10)');
    });

    it('should handle plausibility score of 0', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: 'What will happen next?',
              predictions: [
                {
                  id: 'A',
                  text: 'The knight will find help.',
                  plausibilityScore: 0, // invalid score
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

      mockCreate.mockResolvedValue(mockResponse);

      await expect(extractPredictionOptions(mockChapter, 10))
        .rejects
        .toThrow('Prediction at index 0 has invalid plausibility score (must be 1-10)');
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

      await expect(generateActivityContent(mockChapter, mockStudent, 'general'))
        .rejects
        .toThrow('Content validation failed');
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
});
