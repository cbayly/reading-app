/**
 * Basic unit tests for model configuration system
 * 
 * Tests cover core functionality of modelConfig.js
 */

// Import Jest functions
import { jest } from '@jest/globals';

// Mock console methods to avoid noise during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  // Clear any environment variables that might interfere
  delete process.env.OVERRIDE_STORY_MODEL;
  delete process.env.OVERRIDE_ASSESSMENT_MODEL;
  delete process.env.OVERRIDE_DAILY_TASK_MODEL;
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  // Clean up any environment variables set during tests
  delete process.env.OVERRIDE_STORY_MODEL;
  delete process.env.OVERRIDE_ASSESSMENT_MODEL;
  delete process.env.OVERRIDE_DAILY_TASK_MODEL;
});

describe('Model Configuration System', () => {
  let module;

  beforeAll(async () => {
    module = await import('./modelConfig.js');
  });

  test('should export all required functions and constants', () => {
    expect(module.CONTENT_TYPES).toBeDefined();
    expect(module.MODELS).toBeDefined();
    expect(module.getModelConfig).toBeDefined();
    expect(module.getModelForContentType).toBeDefined();
    expect(module.selectModelForContentType).toBeDefined();
    expect(module.getAllModelConfigs).toBeDefined();
    expect(module.isModelSupported).toBeDefined();
    expect(module.getModelDescription).toBeDefined();
    expect(module.setModelOverride).toBeDefined();
    expect(module.clearModelOverrides).toBeDefined();
    expect(module.getOverrideStatus).toBeDefined();
    expect(module.logModelConfiguration).toBeDefined();
  });

  test('should have correct content type constants', () => {
    expect(module.CONTENT_TYPES.STORY_CREATION).toBe('story_creation');
    expect(module.CONTENT_TYPES.ASSESSMENT_CREATION).toBe('assessment_creation');
    expect(module.CONTENT_TYPES.DAILY_TASK_GENERATION).toBe('daily_task_generation');
  });

  test('should have correct model constants', () => {
    expect(module.MODELS.GPT_4O).toBe('gpt-4o');
    expect(module.MODELS.GPT_4_TURBO).toBe('gpt-4-turbo');
  });

  test('should return correct default model for story creation', () => {
    const model = module.getModelForContentType(module.CONTENT_TYPES.STORY_CREATION);
    expect(model).toBe(module.MODELS.GPT_4O);
  });

  test('should return correct default model for assessment creation', () => {
    const model = module.getModelForContentType(module.CONTENT_TYPES.ASSESSMENT_CREATION);
    expect(model).toBe(module.MODELS.GPT_4_TURBO);
  });

  test('should return correct default model for daily task generation', () => {
    const model = module.getModelForContentType(module.CONTENT_TYPES.DAILY_TASK_GENERATION);
    expect(model).toBe(module.MODELS.GPT_4_TURBO);
  });

  test('should validate supported models', () => {
    expect(module.isModelSupported(module.MODELS.GPT_4O)).toBe(true);
    expect(module.isModelSupported(module.MODELS.GPT_4_TURBO)).toBe(true);
    expect(module.isModelSupported('invalid-model')).toBe(false);
  });

  test('should throw error for invalid content type', () => {
    expect(() => {
      module.getModelConfig('invalid_type');
    }).toThrow('Invalid content type: invalid_type');
  });

  test('should apply environment variable override', () => {
    process.env.OVERRIDE_STORY_MODEL = module.MODELS.GPT_4_TURBO;
    
    const config = module.getModelConfig(module.CONTENT_TYPES.STORY_CREATION);
    
    expect(config.model).toBe(module.MODELS.GPT_4_TURBO);
    expect(config.isOverride).toBe(true);
  });

  test('should ignore invalid override model', () => {
    process.env.OVERRIDE_STORY_MODEL = 'invalid-model';
    
    const config = module.getModelConfig(module.CONTENT_TYPES.STORY_CREATION);
    
    expect(config.model).toBe(module.MODELS.GPT_4O); // Should use default
    expect(config.isOverride).toBe(false);
  });

  test('should set and clear model overrides', () => {
    module.setModelOverride(module.CONTENT_TYPES.STORY_CREATION, module.MODELS.GPT_4_TURBO, 'Test');
    expect(process.env.OVERRIDE_STORY_MODEL).toBe(module.MODELS.GPT_4_TURBO);
    
    module.clearModelOverrides();
    expect(process.env.OVERRIDE_STORY_MODEL).toBeUndefined();
  });

  test('should get override status', () => {
    const status = module.getOverrideStatus();
    expect(status).toHaveProperty(module.CONTENT_TYPES.STORY_CREATION);
    expect(status).toHaveProperty(module.CONTENT_TYPES.ASSESSMENT_CREATION);
    expect(status).toHaveProperty(module.CONTENT_TYPES.DAILY_TASK_GENERATION);
  });
}); 