import { jest } from '@jest/globals';
import { getModelConfig } from '../lib/modelConfig.js';
import { logAIRequestWithCapture, CONTENT_TYPES } from '../lib/logging.js';
import { modelOverrideMiddleware, getOverrideStats, clearOverrideTracking } from '../middleware/modelOverride.js';

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

jest.mock('openai', () => ({
  OpenAI: jest.fn(() => mockOpenAI)
}));

describe('AI Model Integration - End-to-End Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearOverrideTracking();
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'Test response' } }],
      usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
    });
  });

  afterEach(() => {
    clearOverrideTracking();
  });

  describe('End-to-End Model Selection and Logging', () => {
    test('should use correct model for story creation with logging', async () => {
      const storyConfig = getModelConfig(CONTENT_TYPES.STORY_CREATION);
      
      const result = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.STORY_CREATION,
        aiFunction: async () => {
          const response = await mockOpenAI.chat.completions.create({
            model: storyConfig.model,
            temperature: storyConfig.temperature,
            max_tokens: storyConfig.maxTokens,
            messages: [{ role: 'user', content: 'Generate a story' }]
          });
          return response;
        },
        modelConfig: storyConfig,
        metadata: { studentId: 1, studentName: 'Test Student' }
      });

      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.logEntry).toBeDefined();
      expect(result.timing).toBeDefined();
      expect(result.tokenUsage).toBeDefined();
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 4000
        })
      );
    });

    test('should use correct model for assessment creation with logging', async () => {
      const assessmentConfig = getModelConfig(CONTENT_TYPES.ASSESSMENT_CREATION);
      
      const result = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
        aiFunction: async () => {
          const response = await mockOpenAI.chat.completions.create({
            model: assessmentConfig.model,
            temperature: assessmentConfig.temperature,
            max_tokens: assessmentConfig.maxTokens,
            messages: [{ role: 'user', content: 'Generate an assessment' }]
          });
          return response;
        },
        modelConfig: assessmentConfig,
        metadata: { studentId: 1, studentName: 'Test Student' }
      });

      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.logEntry).toBeDefined();
      expect(result.timing).toBeDefined();
      expect(result.tokenUsage).toBeDefined();
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo',
          temperature: 0.7,
          max_tokens: 3000
        })
      );
    });

    test('should use correct model for daily task generation with logging', async () => {
      const dailyTaskConfig = getModelConfig(CONTENT_TYPES.DAILY_TASK_GENERATION);
      
      const result = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.DAILY_TASK_GENERATION,
        aiFunction: async () => {
          const response = await mockOpenAI.chat.completions.create({
            model: dailyTaskConfig.model,
            temperature: dailyTaskConfig.temperature,
            max_tokens: dailyTaskConfig.maxTokens,
            messages: [{ role: 'user', content: 'Generate daily tasks' }]
          });
          return response;
        },
        modelConfig: dailyTaskConfig,
        metadata: { studentId: 1, studentName: 'Test Student' }
      });

      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.logEntry).toBeDefined();
      expect(result.timing).toBeDefined();
      expect(result.tokenUsage).toBeDefined();
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo',
          temperature: 0.7,
          max_tokens: 2000
        })
      );
    });
  });

  describe('Model Override Integration', () => {
    test('should apply model override through middleware and logging', async () => {
      // Set up middleware with override
      const mockReq = {
        get: (key) => key === 'X-Model-Override' ? 'gpt-4o' : null,
        method: 'POST',
        path: '/api/assessments',
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      };
      const mockRes = { status: () => ({ json: () => {} }), json: () => {} };
      const mockNext = jest.fn();

      const middleware = modelOverrideMiddleware();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.modelOverride).toBeDefined();

      // Apply override to assessment config
      const originalConfig = getModelConfig(CONTENT_TYPES.ASSESSMENT_CREATION);
      const overrideConfig = mockReq.applyModelOverride('assessment_creation', originalConfig);

      expect(overrideConfig.model).toBe('gpt-4o');
      expect(overrideConfig.isOverride).toBe(true);

      // Test with logging
      const result = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
        aiFunction: async () => {
          const response = await mockOpenAI.chat.completions.create({
            model: overrideConfig.model,
            temperature: overrideConfig.temperature,
            max_tokens: overrideConfig.maxTokens,
            messages: [{ role: 'user', content: 'Generate an assessment' }]
          });
          return response;
        },
        modelConfig: overrideConfig,
        metadata: { studentId: 1, studentName: 'Test Student' }
      });

      expect(result).toBeDefined();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 3000
        })
      );

      // Check override statistics
      const stats = getOverrideStats();
      expect(stats.totalOverrides).toBe(1);
      expect(stats.byModel['gpt-4o']).toBe(1);
      expect(stats.byContentType['assessment_creation']).toBe(1);
    });

    test('should handle multiple content types with different overrides', async () => {
      // Set up middleware with JSON override
      const overrideValue = {
        'story_creation': 'gpt-4o',
        'assessment_creation': 'gpt-4-turbo',
        'daily_task_generation': 'gpt-4-turbo'
      };

      const mockReq = {
        get: (key) => key === 'X-Model-Override' ? JSON.stringify(overrideValue) : null,
        method: 'POST',
        path: '/api/assessments',
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      };
      const mockRes = { status: () => ({ json: () => {} }), json: () => {} };
      const mockNext = jest.fn();

      const middleware = modelOverrideMiddleware();
      middleware(mockReq, mockRes, mockNext);

      // Test story creation with override
      const storyConfig = getModelConfig(CONTENT_TYPES.STORY_CREATION);
      const storyOverride = mockReq.applyModelOverride('story_creation', storyConfig);

      await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.STORY_CREATION,
        aiFunction: async () => {
          return await mockOpenAI.chat.completions.create({
            model: storyOverride.model,
            temperature: storyOverride.temperature,
            max_tokens: storyOverride.maxTokens,
            messages: [{ role: 'user', content: 'Generate a story' }]
          });
        },
        modelConfig: storyOverride,
        metadata: { studentId: 1 }
      });

      // Test assessment creation with override
      const assessmentConfig = getModelConfig(CONTENT_TYPES.ASSESSMENT_CREATION);
      const assessmentOverride = mockReq.applyModelOverride('assessment_creation', assessmentConfig);

      await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
        aiFunction: async () => {
          return await mockOpenAI.chat.completions.create({
            model: assessmentOverride.model,
            temperature: assessmentOverride.temperature,
            max_tokens: assessmentOverride.maxTokens,
            messages: [{ role: 'user', content: 'Generate an assessment' }]
          });
        },
        modelConfig: assessmentOverride,
        metadata: { studentId: 1 }
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
      expect(mockOpenAI.chat.completions.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          model: 'gpt-4o',
          max_tokens: 4000
        })
      );
      expect(mockOpenAI.chat.completions.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          model: 'gpt-4-turbo',
          max_tokens: 3000
        })
      );

      // Check override statistics
      const stats = getOverrideStats();
      expect(stats.totalOverrides).toBe(2);
      expect(stats.byModel['gpt-4o']).toBe(1);
      expect(stats.byModel['gpt-4-turbo']).toBe(1);
      expect(stats.byContentType['story_creation']).toBe(1);
      expect(stats.byContentType['assessment_creation']).toBe(1);
    });
  });

  describe('Error Handling and Fallback', () => {
    test('should handle model errors with fallback', async () => {
      const storyConfig = getModelConfig(CONTENT_TYPES.STORY_CREATION);
      
      // Mock first call to fail, second to succeed
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('model_not_found'))
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Fallback story' } }],
          usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
        });

      const result = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.STORY_CREATION,
        aiFunction: async () => {
          try {
            return await mockOpenAI.chat.completions.create({
              model: storyConfig.model,
              temperature: storyConfig.temperature,
              max_tokens: storyConfig.maxTokens,
              messages: [{ role: 'user', content: 'Generate a story' }]
            });
          } catch (error) {
            if (error.message === 'model_not_found') {
              // Fallback to gpt-3.5-turbo
              return await mockOpenAI.chat.completions.create({
                model: 'gpt-3.5-turbo',
                temperature: storyConfig.temperature,
                max_tokens: storyConfig.maxTokens,
                messages: [{ role: 'user', content: 'Generate a story' }]
              });
            }
            throw error;
          }
        },
        modelConfig: storyConfig,
        metadata: { studentId: 1 }
      });

      expect(result).toBeDefined();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
      expect(mockOpenAI.chat.completions.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          model: 'gpt-4o'
        })
      );
      expect(mockOpenAI.chat.completions.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          model: 'gpt-3.5-turbo'
        })
      );
    });

    test('should handle API errors gracefully', async () => {
      const assessmentConfig = getModelConfig(CONTENT_TYPES.ASSESSMENT_CREATION);
      
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      await expect(logAIRequestWithCapture({
        contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
        aiFunction: async () => {
          return await mockOpenAI.chat.completions.create({
            model: assessmentConfig.model,
            temperature: assessmentConfig.temperature,
            max_tokens: assessmentConfig.maxTokens,
            messages: [{ role: 'user', content: 'Generate an assessment' }]
          });
        },
        modelConfig: assessmentConfig,
        metadata: { studentId: 1 }
      })).rejects.toThrow('API Error');
    });
  });

  describe('Performance and Timing', () => {
    test('should capture timing information correctly', async () => {
      const dailyTaskConfig = getModelConfig(CONTENT_TYPES.DAILY_TASK_GENERATION);
      
      const result = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.DAILY_TASK_GENERATION,
        aiFunction: async () => {
          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 10));
          return await mockOpenAI.chat.completions.create({
            model: dailyTaskConfig.model,
            temperature: dailyTaskConfig.temperature,
            max_tokens: dailyTaskConfig.maxTokens,
            messages: [{ role: 'user', content: 'Generate daily tasks' }]
          });
        },
        modelConfig: dailyTaskConfig,
        metadata: { studentId: 1 }
      });

      expect(result.timing).toBeDefined();
      expect(result.timing.duration).toBeGreaterThan(0);
      expect(result.timing.contentType).toBe(CONTENT_TYPES.DAILY_TASK_GENERATION);
    });

    test('should capture token usage correctly', async () => {
      const storyConfig = getModelConfig(CONTENT_TYPES.STORY_CREATION);
      
      const mockResponse = {
        choices: [{ message: { content: 'Test story content' } }],
        usage: { prompt_tokens: 150, completion_tokens: 300, total_tokens: 450 }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.STORY_CREATION,
        aiFunction: async () => {
          return await mockOpenAI.chat.completions.create({
            model: storyConfig.model,
            temperature: storyConfig.temperature,
            max_tokens: storyConfig.maxTokens,
            messages: [{ role: 'user', content: 'Generate a story' }]
          });
        },
        modelConfig: storyConfig,
        metadata: { studentId: 1 }
      });

      expect(result.tokenUsage).toBeDefined();
      expect(result.tokenUsage.inputTokens).toBe(150);
      expect(result.tokenUsage.outputTokens).toBe(300);
      expect(result.tokenUsage.totalTokens).toBe(450);
    });
  });

  describe('Logging and Monitoring', () => {
    test('should create comprehensive log entries', async () => {
      const assessmentConfig = getModelConfig(CONTENT_TYPES.ASSESSMENT_CREATION);
      
      const result = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
        aiFunction: async () => {
          return await mockOpenAI.chat.completions.create({
            model: assessmentConfig.model,
            temperature: assessmentConfig.temperature,
            max_tokens: assessmentConfig.maxTokens,
            messages: [{ role: 'user', content: 'Generate an assessment' }]
          });
        },
        modelConfig: assessmentConfig,
        metadata: { studentId: 1, studentName: 'Test Student', grade: 3 }
      });

      expect(result.logEntry).toBeDefined();
      expect(result.logEntry.contentType).toBe(CONTENT_TYPES.ASSESSMENT_CREATION);
      expect(result.logEntry.model).toBe('gpt-4-turbo');
      expect(result.logEntry.status).toBe('success');
      expect(result.logEntry.requestId).toBeDefined();
      expect(result.logEntry.estimatedCost).toBeGreaterThan(0);
      expect(result.logEntry.metadata).toBeDefined();
      expect(result.logEntry.metadata.studentId).toBe(1);
      expect(result.logEntry.metadata.studentName).toBe('Test Student');
      expect(result.logEntry.metadata.grade).toBe(3);
    });

    test('should track model selection information', async () => {
      const storyConfig = getModelConfig(CONTENT_TYPES.STORY_CREATION);
      
      const result = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.STORY_CREATION,
        aiFunction: async () => {
          return await mockOpenAI.chat.completions.create({
            model: storyConfig.model,
            temperature: storyConfig.temperature,
            max_tokens: storyConfig.maxTokens,
            messages: [{ role: 'user', content: 'Generate a story' }]
          });
        },
        modelConfig: storyConfig,
        metadata: { studentId: 1 }
      });

      expect(result.modelSelection).toBeDefined();
      expect(result.modelSelection.contentType).toBe(CONTENT_TYPES.STORY_CREATION);
      expect(result.modelSelection.model).toBe('gpt-4o');
      expect(result.modelSelection.reasoning).toContain('GPT-4o excels at creative');
    });
  });
}); 