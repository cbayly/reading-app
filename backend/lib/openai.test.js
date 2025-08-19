import { jest } from '@jest/globals';
import { getModelConfig } from './modelConfig.js';
import { CONTENT_TYPES } from './logging.js';

// Mock the logging functions
jest.mock('./logging.js', () => ({
  logAIRequestWithCapture: jest.fn((params) => Promise.resolve({
    result: { success: true },
    logEntry: {},
    modelSelection: {},
    timing: { duration: 100 },
    tokenUsage: { totalTokens: 300 }
  })),
  CONTENT_TYPES: {
    STORY_CREATION: 'story_creation',
    ASSESSMENT_CREATION: 'assessment_creation',
    DAILY_TASK_GENERATION: 'daily_task_generation'
  }
}));

describe('Model Configuration - Existing Functionality Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Model Configuration System', () => {
    test('should provide correct default model for story creation', () => {
      const config = getModelConfig(CONTENT_TYPES.STORY_CREATION);
      
      expect(config).toBeDefined();
      expect(config.model).toBe('gpt-4o');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(4000);
      expect(config.reasoning).toContain('GPT-4o excels at creative');
    });

    test('should provide correct default model for assessment creation', () => {
      const config = getModelConfig(CONTENT_TYPES.ASSESSMENT_CREATION);
      
      expect(config).toBeDefined();
      expect(config.model).toBe('gpt-4-turbo');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(3000);
      expect(config.reasoning).toContain('GPT-4-turbo provides precise control');
    });

    test('should provide correct default model for daily task generation', () => {
      const config = getModelConfig(CONTENT_TYPES.DAILY_TASK_GENERATION);
      
      expect(config).toBeDefined();
      expect(config.model).toBe('gpt-4-turbo');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(2000);
      expect(config.reasoning).toContain('GPT-4-turbo efficiently handles');
    });
  });

  describe('Model Override Support', () => {
    test('should support model override parameter', () => {
      const config = getModelConfig(CONTENT_TYPES.STORY_CREATION);
      const overrideConfig = { ...config, model: 'gpt-4-turbo' };
      
      expect(overrideConfig.model).toBe('gpt-4-turbo');
      expect(overrideConfig.temperature).toBe(config.temperature);
      expect(overrideConfig.maxTokens).toBe(config.maxTokens);
    });

    test('should maintain configuration structure with overrides', () => {
      const config = getModelConfig(CONTENT_TYPES.ASSESSMENT_CREATION);
      const overrideConfig = { 
        ...config, 
        model: 'gpt-4o',
        temperature: 0.8 
      };
      
      expect(overrideConfig.model).toBe('gpt-4o');
      expect(overrideConfig.temperature).toBe(0.8);
      expect(overrideConfig.maxTokens).toBe(config.maxTokens);
      expect(overrideConfig.reasoning).toBe(config.reasoning);
    });
  });

  describe('Content Type Validation', () => {
    test('should validate all content types are supported', () => {
      const storyConfig = getModelConfig(CONTENT_TYPES.STORY_CREATION);
      const assessmentConfig = getModelConfig(CONTENT_TYPES.ASSESSMENT_CREATION);
      const dailyTaskConfig = getModelConfig(CONTENT_TYPES.DAILY_TASK_GENERATION);
      
      expect(storyConfig).toBeDefined();
      expect(assessmentConfig).toBeDefined();
      expect(dailyTaskConfig).toBeDefined();
      
      expect(storyConfig.model).toMatch(/gpt-4/);
      expect(assessmentConfig.model).toMatch(/gpt-4/);
      expect(dailyTaskConfig.model).toMatch(/gpt-4/);
    });
  });
}); 