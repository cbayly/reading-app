/**
 * Unit tests for Model Override Middleware
 * 
 * Tests cover:
 * - Header-based overrides
 * - Query parameter overrides
 * - Content type specific overrides
 * - Validation and error handling
 * - Environment restrictions
 */

import { jest } from '@jest/globals';
import {
  modelOverrideMiddleware,
  getModelConfigWithOverride,
  validateContentType,
  applyModelOverrideForContentType,
  getOverrideStats,
  clearOverrideTracking
} from './modelOverride.js';
import { CONTENT_TYPES } from '../lib/logging.js';

// Mock the modelConfig module
jest.mock('../lib/modelConfig.js', () => ({
  getModelConfig: jest.fn(),
  isModelSupported: jest.fn(),
  getOverrideStatus: jest.fn(),
  MODELS: {
    'gpt-4o': { name: 'GPT-4o' },
    'gpt-4-turbo': { name: 'GPT-4-turbo' },
    'gpt-3.5-turbo': { name: 'GPT-3.5-turbo' }
  }
}));

// Mock the logging module
jest.mock('../lib/logging.js', () => ({
  CONTENT_TYPES: {
    STORY_CREATION: 'story_creation',
    ASSESSMENT_CREATION: 'assessment_creation',
    DAILY_TASK_GENERATION: 'daily_task_generation'
  }
}));

describe('Model Override Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  
  beforeEach(() => {
    mockReq = {
      method: 'POST',
      path: '/api/assessments',
      get: jest.fn(),
      query: {},
      ip: '127.0.0.1'
    };
    mockRes = {};
    mockNext = jest.fn();
    
    // Reset environment
    process.env.NODE_ENV = 'development';
    process.env.DISABLE_MODEL_OVERRIDES = undefined;
    
    // Clear override tracking
    clearOverrideTracking();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Header-based overrides', () => {
    test('should extract simple string override from header', () => {
      mockReq.get.mockReturnValue('gpt-4o');
      
      const middleware = modelOverrideMiddleware({ method: 'header' });
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.modelOverride).toBeDefined();
      expect(mockReq.modelOverride.value).toBe('gpt-4o');
      expect(mockReq.modelOverride.method).toBe('header');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should extract JSON override from header', () => {
      const overrideValue = {
        'story_creation': 'gpt-4o',
        'assessment_creation': 'gpt-4-turbo'
      };
      mockReq.get.mockReturnValue(JSON.stringify(overrideValue));
      
      const middleware = modelOverrideMiddleware({ method: 'header' });
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.modelOverride.value).toEqual(overrideValue);
    });

    test('should handle missing header gracefully', () => {
      mockReq.get.mockReturnValue(null);
      
      const middleware = modelOverrideMiddleware({ method: 'header' });
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.modelOverride).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Query parameter overrides', () => {
    test('should extract override from query parameter', () => {
      mockReq.query = { model: 'gpt-4-turbo' };
      
      const middleware = modelOverrideMiddleware({ method: 'query' });
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.modelOverride.value).toBe('gpt-4-turbo');
      expect(mockReq.modelOverride.method).toBe('query');
    });

    test('should handle missing query parameter', () => {
      mockReq.query = {};
      
      const middleware = modelOverrideMiddleware({ method: 'query' });
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.modelOverride).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Both header and query overrides', () => {
    test('should prioritize header over query parameter', () => {
      mockReq.get.mockReturnValue('gpt-4o');
      mockReq.query = { model: 'gpt-4-turbo' };
      
      const middleware = modelOverrideMiddleware({ method: 'both' });
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.modelOverride.value).toBe('gpt-4o');
    });

    test('should use query parameter when header is missing', () => {
      mockReq.get.mockReturnValue(null);
      mockReq.query = { model: 'gpt-3.5-turbo' };
      
      const middleware = modelOverrideMiddleware({ method: 'both' });
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.modelOverride.value).toBe('gpt-3.5-turbo');
    });
  });

  describe('Environment restrictions', () => {
    test('should not allow overrides in production', () => {
      process.env.NODE_ENV = 'production';
      mockReq.get.mockReturnValue('gpt-4o');
      
      const middleware = modelOverrideMiddleware();
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.modelOverride).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    test('should not allow overrides when explicitly disabled', () => {
      process.env.DISABLE_MODEL_OVERRIDES = 'true';
      mockReq.get.mockReturnValue('gpt-4o');
      
      const middleware = modelOverrideMiddleware();
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.modelOverride).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Model override application', () => {
    test('should apply string override to model config', () => {
      mockReq.get.mockReturnValue('gpt-4o');
      
      const middleware = modelOverrideMiddleware();
      middleware(mockReq, mockRes, mockNext);
      
      // Mock the modelConfig module
      const { getModelConfig, isModelSupported } = require('../lib/modelConfig.js');
      getModelConfig.mockReturnValue({
        model: 'gpt-4-turbo',
        temperature: 0.7,
        maxTokens: 3000
      });
      isModelSupported.mockReturnValue(true);
      
      const result = mockReq.applyModelOverride('story_creation', {
        model: 'gpt-4-turbo',
        temperature: 0.7,
        maxTokens: 3000
      });
      
      expect(result.model).toBe('gpt-4o');
      expect(result.isOverride).toBe(true);
      expect(result.overrideReason).toBe('Request-level override for story_creation');
      expect(result.originalModel).toBe('gpt-4-turbo');
    });

    test('should apply content-type specific override', () => {
      const overrideValue = {
        'story_creation': 'gpt-4o',
        'assessment_creation': 'gpt-4-turbo'
      };
      mockReq.get.mockReturnValue(JSON.stringify(overrideValue));
      
      const middleware = modelOverrideMiddleware();
      middleware(mockReq, mockRes, mockNext);
      
      const { isModelSupported } = require('../lib/modelConfig.js');
      isModelSupported.mockReturnValue(true);
      
      const result = mockReq.applyModelOverride('story_creation', {
        model: 'gpt-4-turbo',
        temperature: 0.7,
        maxTokens: 3000
      });
      
      expect(result.model).toBe('gpt-4o');
    });
  });

  describe('Validation', () => {
    test('should reject unsupported models in strict mode', () => {
      mockReq.get.mockReturnValue('unsupported-model');
      
      const middleware = modelOverrideMiddleware({ strict: true });
      middleware(mockReq, mockRes, mockNext);
      
      const { isModelSupported } = require('../lib/modelConfig.js');
      isModelSupported.mockReturnValue(false);
      
      expect(() => {
        mockReq.applyModelOverride('story_creation', {
          model: 'gpt-4-turbo',
          temperature: 0.7,
          maxTokens: 3000
        });
      }).toThrow('Invalid model override');
    });

    test('should warn and ignore invalid overrides in non-strict mode', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockReq.get.mockReturnValue('unsupported-model');
      
      const middleware = modelOverrideMiddleware({ strict: false });
      middleware(mockReq, mockRes, mockNext);
      
      const { isModelSupported } = require('../lib/modelConfig.js');
      isModelSupported.mockReturnValue(false);
      
      const result = mockReq.applyModelOverride('story_creation', {
        model: 'gpt-4-turbo',
        temperature: 0.7,
        maxTokens: 3000
      });
      
      expect(result.model).toBe('gpt-4-turbo'); // Original model preserved
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid model override ignored')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Helper functions', () => {
    test('getModelConfigWithOverride should work without override', () => {
      const { getModelConfig } = require('../lib/modelConfig.js');
      getModelConfig.mockReturnValue({
        model: 'gpt-4-turbo',
        temperature: 0.7
      });
      
      const result = getModelConfigWithOverride(mockReq, 'story_creation');
      
      expect(result.model).toBe('gpt-4-turbo');
    });

    test('getModelConfigWithOverride should apply override when present', () => {
      mockReq.get.mockReturnValue('gpt-4o');
      
      const middleware = modelOverrideMiddleware();
      middleware(mockReq, mockRes, mockNext);
      
      const { getModelConfig, isModelSupported } = require('../lib/modelConfig.js');
      getModelConfig.mockReturnValue({
        model: 'gpt-4-turbo',
        temperature: 0.7
      });
      isModelSupported.mockReturnValue(true);
      
      const result = getModelConfigWithOverride(mockReq, 'story_creation');
      
      expect(result.model).toBe('gpt-4o');
      expect(result.isOverride).toBe(true);
    });
  });

  describe('Content type validation', () => {
    test('should validate valid content type', () => {
      const middleware = validateContentType(CONTENT_TYPES.STORY_CREATION);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.expectedContentType).toBe(CONTENT_TYPES.STORY_CREATION);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject invalid content type', () => {
      const middleware = validateContentType('invalid_content_type');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid content type: invalid_content_type',
          status: 400
        })
      );
    });
  });

  describe('Override statistics', () => {
    test('should track override usage', () => {
      mockReq.get.mockReturnValue('gpt-4o');
      
      const middleware = modelOverrideMiddleware();
      middleware(mockReq, mockRes, mockNext);
      
      const { isModelSupported } = require('../lib/modelConfig.js');
      isModelSupported.mockReturnValue(true);
      
      mockReq.applyModelOverride('story_creation', {
        model: 'gpt-4-turbo',
        temperature: 0.7
      });
      
      const stats = getOverrideStats();
      
      expect(stats.totalOverrides).toBe(1);
      expect(stats.byModel['gpt-4o']).toBe(1);
      expect(stats.byContentType['story_creation']).toBe(1);
    });

    test('should clear override tracking', () => {
      mockReq.get.mockReturnValue('gpt-4o');
      
      const middleware = modelOverrideMiddleware();
      middleware(mockReq, mockRes, mockNext);
      
      const { isModelSupported } = require('../lib/modelConfig.js');
      isModelSupported.mockReturnValue(true);
      
      mockReq.applyModelOverride('story_creation', {
        model: 'gpt-4-turbo',
        temperature: 0.7
      });
      
      clearOverrideTracking();
      
      const stats = getOverrideStats();
      expect(stats.totalOverrides).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete override workflow', () => {
      // Set up override
      mockReq.get.mockReturnValue('gpt-4o');
      
      const middleware = modelOverrideMiddleware();
      middleware(mockReq, mockRes, mockNext);
      
      // Mock dependencies
      const { getModelConfig, isModelSupported } = require('../lib/modelConfig.js');
      getModelConfig.mockReturnValue({
        model: 'gpt-4-turbo',
        temperature: 0.7,
        maxTokens: 3000
      });
      isModelSupported.mockReturnValue(true);
      
      // Apply override
      const result = mockReq.applyModelOverride('story_creation', {
        model: 'gpt-4-turbo',
        temperature: 0.7,
        maxTokens: 3000
      });
      
      // Verify result
      expect(result.model).toBe('gpt-4o');
      expect(result.isOverride).toBe(true);
      expect(result.overrideSource).toBe('middleware');
      
      // Check statistics
      const stats = getOverrideStats();
      expect(stats.totalOverrides).toBe(1);
      expect(stats.byModel['gpt-4o']).toBe(1);
    });

    test('should handle multiple overrides', () => {
      const overrideValue = {
        'story_creation': 'gpt-4o',
        'assessment_creation': 'gpt-4-turbo',
        'daily_task_generation': 'gpt-3.5-turbo'
      };
      mockReq.get.mockReturnValue(JSON.stringify(overrideValue));
      
      const middleware = modelOverrideMiddleware();
      middleware(mockReq, mockRes, mockNext);
      
      const { isModelSupported } = require('../lib/modelConfig.js');
      isModelSupported.mockReturnValue(true);
      
      // Apply overrides for different content types
      const storyResult = mockReq.applyModelOverride('story_creation', {
        model: 'gpt-4-turbo',
        temperature: 0.7
      });
      
      const assessmentResult = mockReq.applyModelOverride('assessment_creation', {
        model: 'gpt-4o',
        temperature: 0.7
      });
      
      expect(storyResult.model).toBe('gpt-4o');
      expect(assessmentResult.model).toBe('gpt-4-turbo');
      
      const stats = getOverrideStats();
      expect(stats.totalOverrides).toBe(2);
    });
  });
}); 