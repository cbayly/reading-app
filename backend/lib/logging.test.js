/**
 * Unit tests for AI logging and monitoring system
 * 
 * Tests cover all functions in logging.js including:
 * - Log entry creation and validation
 * - Cost calculation and tracking
 * - Token usage capture
 * - Timing and performance measurement
 * - Statistics aggregation
 * - Data export and import
 */

import { jest } from '@jest/globals';
import {
  LOG_LEVELS,
  CONTENT_TYPES,
  createAIRequestLog,
  calculateCost,
  generateRequestId,
  logAIRequest,
  formatLogMessage,
  createAITimer,
  captureModelSelection,
  captureTokenUsage,
  captureTiming,
  logAIRequestWithCapture,
  logContentTypeInfo,
  logRequestStart,
  logRequestCompletion,
  trackCost,
  checkCostAlerts,
  getCostAnalysis,
  exportCostData,
  resetCostTracking,
  updateCostThresholds,
  getCostThresholds,
  validateLogEntry,
  exportLogEntry,
  importLogEntry,
  aggregateUsageStats,
  logUsageStats,
  COST_TRACKING
} from './logging.js';

// Mock console methods to avoid noise during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleDebug = console.debug;

beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.debug = jest.fn();
  
  // Reset cost tracking data before each test
  resetCostTracking();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  console.debug = originalConsoleDebug;
});

describe('Constants', () => {
  test('LOG_LEVELS should have expected values', () => {
    expect(LOG_LEVELS.ERROR).toBe('error');
    expect(LOG_LEVELS.WARN).toBe('warn');
    expect(LOG_LEVELS.INFO).toBe('info');
    expect(LOG_LEVELS.DEBUG).toBe('debug');
  });

  test('CONTENT_TYPES should have expected values', () => {
    expect(CONTENT_TYPES.STORY_CREATION).toBe('story_creation');
    expect(CONTENT_TYPES.ASSESSMENT_CREATION).toBe('assessment_creation');
    expect(CONTENT_TYPES.DAILY_TASK_GENERATION).toBe('daily_task_generation');
  });
});

describe('createAIRequestLog', () => {
  test('should create a valid log entry with all required fields', () => {
    const logEntry = createAIRequestLog({
      contentType: CONTENT_TYPES.STORY_CREATION,
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 200,
      duration: 1500
    });

    expect(logEntry).toHaveProperty('timestamp');
    expect(logEntry).toHaveProperty('requestId');
    expect(logEntry).toHaveProperty('contentType', CONTENT_TYPES.STORY_CREATION);
    expect(logEntry).toHaveProperty('model', 'gpt-4o');
    expect(logEntry).toHaveProperty('inputTokens', 100);
    expect(logEntry).toHaveProperty('outputTokens', 200);
    expect(logEntry).toHaveProperty('totalTokens', 300);
    expect(logEntry).toHaveProperty('duration', 1500);
    expect(logEntry).toHaveProperty('estimatedCost');
    expect(logEntry).toHaveProperty('status', 'success');
    expect(logEntry).toHaveProperty('isOverride', false);
  });

  test('should calculate total tokens correctly', () => {
    const logEntry = createAIRequestLog({
      contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
      model: 'gpt-4-turbo',
      inputTokens: 50,
      outputTokens: 75
    });

    expect(logEntry.totalTokens).toBe(125);
  });

  test('should handle override information', () => {
    const logEntry = createAIRequestLog({
      contentType: CONTENT_TYPES.DAILY_TASK_GENERATION,
      model: 'gpt-3.5-turbo',
      isOverride: true,
      overrideReason: 'Testing'
    });

    expect(logEntry.isOverride).toBe(true);
    expect(logEntry.overrideReason).toBe('Testing');
  });

  test('should handle error status', () => {
    const logEntry = createAIRequestLog({
      contentType: CONTENT_TYPES.STORY_CREATION,
      model: 'gpt-4o',
      status: 'error',
      error: 'API timeout'
    });

    expect(logEntry.status).toBe('error');
    expect(logEntry.error).toBe('API timeout');
  });
});

describe('calculateCost', () => {
  test('should calculate cost for gpt-4o correctly', () => {
    const cost = calculateCost('gpt-4o', 1000, 500);
    // Expected: (1000/1000 * 0.0025) + (500/1000 * 0.01) = 0.0025 + 0.005 = 0.0075
    expect(cost).toBe(0.008); // Rounded to 3 decimal places
  });

  test('should calculate cost for gpt-4-turbo correctly', () => {
    const cost = calculateCost('gpt-4-turbo', 2000, 1000);
    // Expected: (2000/1000 * 0.01) + (1000/1000 * 0.03) = 0.02 + 0.03 = 0.05
    expect(cost).toBe(0.05);
  });

  test('should calculate cost for gpt-3.5-turbo correctly', () => {
    const cost = calculateCost('gpt-3.5-turbo', 500, 250);
    // Expected: (500/1000 * 0.0005) + (250/1000 * 0.0015) = 0.00025 + 0.000375 = 0.000625
    expect(cost).toBe(0.001); // Rounded to 3 decimal places
  });

  test('should use default cost for unknown model', () => {
    const cost = calculateCost('unknown-model', 1000, 500);
    // Expected: (1000/1000 * 0.01) + (500/1000 * 0.03) = 0.01 + 0.015 = 0.025
    expect(cost).toBe(0.025);
  });

  test('should handle zero tokens', () => {
    const cost = calculateCost('gpt-4o', 0, 0);
    expect(cost).toBe(0);
  });
});

describe('generateRequestId', () => {
  test('should generate unique request IDs', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^ai_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^ai_\d+_[a-z0-9]+$/);
  });

  test('should generate IDs with correct format', () => {
    const id = generateRequestId();
    const parts = id.split('_');
    
    expect(parts[0]).toBe('ai');
    expect(parts[1]).toMatch(/^\d+$/);
    expect(parts[2]).toMatch(/^[a-z0-9]+$/);
  });
});

describe('logAIRequest', () => {
  test('should log with INFO level by default', () => {
    const logEntry = createAIRequestLog({
      contentType: CONTENT_TYPES.STORY_CREATION,
      model: 'gpt-4o'
    });

    logAIRequest(logEntry);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]')
    );
  });

  test('should log with ERROR level', () => {
    const logEntry = createAIRequestLog({
      contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
      model: 'gpt-4-turbo',
      status: 'error',
      error: 'Test error'
    });

    logAIRequest(logEntry, LOG_LEVELS.ERROR);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]')
    );
  });

  test('should log with WARN level', () => {
    const logEntry = createAIRequestLog({
      contentType: CONTENT_TYPES.DAILY_TASK_GENERATION,
      model: 'gpt-3.5-turbo'
    });

    logAIRequest(logEntry, LOG_LEVELS.WARN);

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[WARN]')
    );
  });
});

describe('formatLogMessage', () => {
  test('should format log message correctly', () => {
    const logEntry = createAIRequestLog({
      contentType: CONTENT_TYPES.STORY_CREATION,
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 200,
      duration: 1500
    });

    const message = formatLogMessage(logEntry, LOG_LEVELS.INFO);

    expect(message).toContain('[INFO]');
    expect(message).toContain('AI Request');
    expect(message).toContain('story_creation');
    expect(message).toContain('gpt-4o');
    expect(message).toContain('300 tokens');
    expect(message).toContain('1500ms');
    expect(message).toContain('success');
  });

  test('should include override information when present', () => {
    const logEntry = createAIRequestLog({
      contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
      model: 'gpt-4-turbo',
      isOverride: true,
      overrideReason: 'Testing'
    });

    const message = formatLogMessage(logEntry, LOG_LEVELS.INFO);

    expect(message).toContain('(OVERRIDE)');
  });

  test('should include error information when present', () => {
    const logEntry = createAIRequestLog({
      contentType: CONTENT_TYPES.DAILY_TASK_GENERATION,
      model: 'gpt-3.5-turbo',
      status: 'error',
      error: 'API timeout'
    });

    const message = formatLogMessage(logEntry, LOG_LEVELS.ERROR);

    expect(message).toContain('error');
    expect(message).toContain('API timeout');
  });
});

describe('createAITimer', () => {
  test('should create timer with start time', () => {
    const timer = createAITimer();
    
    expect(timer).toHaveProperty('startTime');
    expect(typeof timer.startTime).toBe('number');
  });

  test('should calculate duration correctly', async () => {
    const timer = createAITimer();
    
    // Wait a bit to ensure measurable duration
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const duration = timer.end();
    
    expect(duration).toBeGreaterThan(0);
    expect(typeof duration).toBe('number');
  });
});

describe('captureModelSelection', () => {
  test('should capture model selection data', () => {
    const modelConfig = {
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4000,
      reasoning: 'Creative narrative generation',
      isOverride: false
    };

    const selectionData = captureModelSelection(CONTENT_TYPES.STORY_CREATION, modelConfig);

    expect(selectionData.contentType).toBe(CONTENT_TYPES.STORY_CREATION);
    expect(selectionData.model).toBe('gpt-4o');
    expect(selectionData.temperature).toBe(0.7);
    expect(selectionData.maxTokens).toBe(4000);
    expect(selectionData.reasoning).toBe('Creative narrative generation');
    expect(selectionData.isOverride).toBe(false);
    expect(selectionData).toHaveProperty('timestamp');
  });

  test('should handle override information', () => {
    const modelConfig = {
      model: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 3000,
      reasoning: 'Structured content generation',
      isOverride: true,
      overrideReason: 'Testing'
    };

    const selectionData = captureModelSelection(CONTENT_TYPES.ASSESSMENT_CREATION, modelConfig);

    expect(selectionData.isOverride).toBe(true);
    expect(selectionData.overrideReason).toBe('Testing');
  });
});

describe('captureTokenUsage', () => {
  test('should capture token usage from OpenAI response', () => {
    const openAIResponse = {
      usage: {
        prompt_tokens: 150,
        completion_tokens: 300,
        total_tokens: 450
      }
    };

    const tokenData = captureTokenUsage(openAIResponse, 'gpt-4o');

    expect(tokenData.inputTokens).toBe(150);
    expect(tokenData.outputTokens).toBe(300);
    expect(tokenData.totalTokens).toBe(450);
    expect(tokenData.model).toBe('gpt-4o');
    expect(tokenData).toHaveProperty('timestamp');
  });

  test('should handle missing usage data', () => {
    const openAIResponse = {};

    const tokenData = captureTokenUsage(openAIResponse, 'gpt-4-turbo');

    expect(tokenData.inputTokens).toBe(0);
    expect(tokenData.outputTokens).toBe(0);
    expect(tokenData.totalTokens).toBe(0);
    expect(tokenData.model).toBe('gpt-4-turbo');
  });

  test('should handle partial usage data', () => {
    const openAIResponse = {
      usage: {
        prompt_tokens: 100
      }
    };

    const tokenData = captureTokenUsage(openAIResponse, 'gpt-3.5-turbo');

    expect(tokenData.inputTokens).toBe(100);
    expect(tokenData.outputTokens).toBe(0);
    expect(tokenData.totalTokens).toBe(0); // Uses total_tokens if available, otherwise 0
  });
});

describe('captureTiming', () => {
  test('should capture timing data', async () => {
    const timer = createAITimer();
    
    // Wait a bit to ensure measurable duration
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const timingData = captureTiming(timer, CONTENT_TYPES.STORY_CREATION);

    expect(timingData.duration).toBeGreaterThan(0);
    expect(timingData.contentType).toBe(CONTENT_TYPES.STORY_CREATION);
    expect(timingData).toHaveProperty('timestamp');
  });
});

describe('logContentTypeInfo', () => {
  test('should log content type information', () => {
    logContentTypeInfo(CONTENT_TYPES.STORY_CREATION);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('📚 Content Type: story_creation')
    );
  });

  test('should log assessment creation info', () => {
    logContentTypeInfo(CONTENT_TYPES.ASSESSMENT_CREATION);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('📝 Content Type: assessment_creation')
    );
  });

  test('should log daily task generation info', () => {
    logContentTypeInfo(CONTENT_TYPES.DAILY_TASK_GENERATION);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('🎯 Content Type: daily_task_generation')
    );
  });

  test('should log additional data when provided', () => {
    const contentData = { grade: 3, interest: 'science' };
    logContentTypeInfo(CONTENT_TYPES.STORY_CREATION, contentData);

    // Check that the function was called with the expected content
    const calls = console.log.mock.calls;
    const additionalDataCall = calls.find(call => 
      call[0] === '   Additional Data:' && call[1] && call[1].includes('"grade": 3')
    );
    expect(additionalDataCall).toBeDefined();
  });
});

describe('logRequestStart and logRequestCompletion', () => {
  test('should log request start information', () => {
    const modelConfig = {
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4000,
      isOverride: false
    };

    logRequestStart(CONTENT_TYPES.STORY_CREATION, modelConfig);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('🚀 Starting AI Request:')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Content Type: story_creation')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Model: gpt-4o')
    );
  });

  test('should log request completion information', () => {
    logRequestCompletion(CONTENT_TYPES.ASSESSMENT_CREATION, 1500, 300, 0.025);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('✅ AI Request Completed:')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Content Type: assessment_creation')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Duration: 1500ms')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Tokens: 300')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Estimated Cost: $0.0250')
    );
  });
});

describe('Cost Tracking', () => {
  test('should track cost correctly', () => {
    trackCost({
      amount: 0.05,
      model: 'gpt-4o',
      contentType: CONTENT_TYPES.STORY_CREATION,
      userId: 'user123'
    });

    const analysis = getCostAnalysis({ period: 'daily', groupBy: 'model' });
    
    expect(analysis.totalCost).toBe(0.05);
    expect(analysis.totalRequests).toBe(1);
    expect(analysis.breakdown['gpt-4o'].totalCost).toBe(0.05);
    expect(analysis.breakdown['gpt-4o'].totalRequests).toBe(1);
  });

  test('should track multiple costs', () => {
    trackCost({
      amount: 0.03,
      model: 'gpt-4-turbo',
      contentType: CONTENT_TYPES.ASSESSMENT_CREATION
    });

    trackCost({
      amount: 0.02,
      model: 'gpt-4o',
      contentType: CONTENT_TYPES.STORY_CREATION
    });

    const analysis = getCostAnalysis({ period: 'daily' });
    
    expect(analysis.totalCost).toBe(0.05);
    expect(analysis.totalRequests).toBe(2);
  });

  test('should check cost alerts', () => {
    // Set low threshold for testing
    updateCostThresholds({ daily: 0.01, monthly: 0.05, perRequest: 0.01 });

    trackCost({
      amount: 0.02, // Exceeds per-request threshold
      model: 'gpt-4o',
      contentType: CONTENT_TYPES.STORY_CREATION
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Per-request cost threshold exceeded')
    );
    
    // Reset thresholds to default for other tests
    resetCostTracking({ resetThresholds: true });
  });
});

describe('getCostAnalysis', () => {
  beforeEach(() => {
    // Add some test data
    trackCost({
      amount: 0.03,
      model: 'gpt-4o',
      contentType: CONTENT_TYPES.STORY_CREATION,
      userId: 'user1'
    });

    trackCost({
      amount: 0.02,
      model: 'gpt-4-turbo',
      contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
      userId: 'user2'
    });
  });

  test('should provide daily analysis', () => {
    const analysis = getCostAnalysis({ period: 'daily', groupBy: 'model' });

    expect(analysis.period).toBe('daily');
    expect(analysis.groupBy).toBe('model');
    expect(analysis.totalCost).toBe(0.05);
    expect(analysis.totalRequests).toBe(2);
    expect(analysis.breakdown['gpt-4o']).toBeDefined();
    expect(analysis.breakdown['gpt-4-turbo']).toBeDefined();
  });

  test('should provide content type analysis', () => {
    const analysis = getCostAnalysis({ period: 'daily', groupBy: 'contentType' });

    expect(analysis.breakdown['story_creation']).toBeDefined();
    expect(analysis.breakdown['assessment_creation']).toBeDefined();
  });

  test('should calculate averages correctly', () => {
    const analysis = getCostAnalysis({ period: 'daily' });

    expect(analysis.summary.averageCostPerRequest).toBe(0.025);
    expect(analysis.summary.averageRequestsPerPeriod).toBe(2);
    expect(analysis.summary.averageCostPerPeriod).toBe(0.05);
  });
});

describe('exportCostData', () => {
  test('should export cost data as JSON', () => {
    trackCost({
      amount: 0.05,
      model: 'gpt-4o',
      contentType: CONTENT_TYPES.STORY_CREATION
    });

    const exportData = exportCostData({ format: 'json' });

    expect(typeof exportData).toBe('string');
    const parsed = JSON.parse(exportData);
    expect(parsed).toHaveProperty('exportDate');
    expect(parsed).toHaveProperty('costTracking');
    expect(parsed).toHaveProperty('modelCosts');
    expect(parsed).toHaveProperty('analysis');
  });

  test('should export cost data as object', () => {
    const exportData = exportCostData({ format: 'object' });

    expect(typeof exportData).toBe('object');
    expect(exportData).toHaveProperty('exportDate');
    expect(exportData).toHaveProperty('costTracking');
  });
});

describe('resetCostTracking', () => {
  test('should reset cost tracking data', () => {
    trackCost({
      amount: 0.05,
      model: 'gpt-4o',
      contentType: CONTENT_TYPES.STORY_CREATION
    });

    resetCostTracking();

    const analysis = getCostAnalysis();
    expect(analysis.totalCost).toBe(0);
    expect(analysis.totalRequests).toBe(0);
  });
});

describe('updateCostThresholds', () => {
  test('should update cost thresholds', () => {
    // Reset to default first
    resetCostTracking({ resetThresholds: true });
    
    const newThresholds = { daily: 5.00, monthly: 50.00 };
    updateCostThresholds(newThresholds);

    const thresholds = getCostThresholds();
    expect(thresholds.daily).toBe(5.00);
    expect(thresholds.monthly).toBe(50.00);
    expect(thresholds.perRequest).toBe(1.00); // Default value from COST_TRACKING.thresholds
  });
});

describe('validateLogEntry', () => {
  test('should validate correct log entry', () => {
    const logEntry = createAIRequestLog({
      contentType: CONTENT_TYPES.STORY_CREATION,
      model: 'gpt-4o'
    });

    expect(validateLogEntry(logEntry)).toBe(true);
  });

  test('should reject log entry with missing required fields', () => {
    const invalidEntry = {
      timestamp: new Date().toISOString(),
      // Missing requestId, contentType, model, status
      inputTokens: 100,
      outputTokens: 200
    };

    expect(validateLogEntry(invalidEntry)).toBe(false);
  });

  test('should reject log entry with negative values', () => {
    const logEntry = createAIRequestLog({
      contentType: CONTENT_TYPES.STORY_CREATION,
      model: 'gpt-4o'
    });

    logEntry.inputTokens = -1;
    expect(validateLogEntry(logEntry)).toBe(false);
  });
});

describe('exportLogEntry and importLogEntry', () => {
  test('should export and import log entry correctly', () => {
    const logEntry = createAIRequestLog({
      contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
      model: 'gpt-4-turbo'
    });

    const exported = exportLogEntry(logEntry);
    const imported = importLogEntry(exported);

    expect(imported.timestamp).toBe(logEntry.timestamp);
    expect(imported.requestId).toBe(logEntry.requestId);
    expect(imported.contentType).toBe(logEntry.contentType);
    expect(imported.model).toBe(logEntry.model);
  });

  test('should reject invalid JSON during import', () => {
    expect(() => {
      importLogEntry('invalid json');
    }).toThrow('Failed to import log entry');
  });
});

describe('aggregateUsageStats', () => {
  test('should aggregate usage statistics', () => {
    const logs = [
      createAIRequestLog({
        contentType: CONTENT_TYPES.STORY_CREATION,
        model: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 200,
        duration: 1500
      }),
      createAIRequestLog({
        contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
        model: 'gpt-4-turbo',
        inputTokens: 50,
        outputTokens: 100,
        duration: 800
      })
    ];

    const stats = aggregateUsageStats(logs);

    expect(stats.totalRequests).toBe(2);
    expect(stats.totalTokens).toBe(450);
    expect(stats.totalDuration).toBe(2300);
    expect(stats.byModel['gpt-4o']).toBeDefined();
    expect(stats.byModel['gpt-4-turbo']).toBeDefined();
    expect(stats.byContentType['story_creation']).toBeDefined();
    expect(stats.byContentType['assessment_creation']).toBeDefined();
  });
});

describe('logUsageStats', () => {
  test('should log usage statistics', () => {
    const stats = {
      totalRequests: 5,
      totalTokens: 1500,
      totalCost: 0.075,
      totalDuration: 5000,
      averageTokensPerRequest: 300,
      averageCostPerRequest: 0.015,
      averageDurationPerRequest: 1000,
      byModel: {
        'gpt-4o': { requests: 3, tokens: 900, cost: 0.045 },
        'gpt-4-turbo': { requests: 2, tokens: 600, cost: 0.03 }
      },
      byContentType: {
        'story_creation': { requests: 2, tokens: 600, cost: 0.03 },
        'assessment_creation': { requests: 3, tokens: 900, cost: 0.045 }
      },
      byStatus: {
        'success': 5
      }
    };

    logUsageStats(stats);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('📊 AI Usage Statistics Summary:')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Total Requests: 5')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Total Tokens: 1,500')
    );
  });
});

describe('Integration Tests', () => {
  test('should handle complete AI request flow', async () => {
    const modelConfig = {
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4000,
      isOverride: false
    };

    const mockAIFunction = jest.fn().mockResolvedValue({
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300
      }
    });

    const result = await logAIRequestWithCapture({
      contentType: CONTENT_TYPES.STORY_CREATION,
      aiFunction: mockAIFunction,
      modelConfig,
      metadata: { userId: 'test-user' }
    });

    expect(result).toHaveProperty('result');
    expect(result).toHaveProperty('logEntry');
    expect(result).toHaveProperty('modelSelection');
    expect(result).toHaveProperty('timing');
    expect(result).toHaveProperty('tokenUsage');
    expect(mockAIFunction).toHaveBeenCalled();
  });

  test('should handle AI request errors', async () => {
    const modelConfig = {
      model: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 3000,
      isOverride: false
    };

    const mockAIFunction = jest.fn().mockRejectedValue(new Error('API Error'));

    await expect(logAIRequestWithCapture({
      contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
      aiFunction: mockAIFunction,
      modelConfig
    })).rejects.toThrow('API Error');

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]')
    );
  });
}); 

  describe('Content type specific logging', () => {
    test('should log story creation requests correctly', async () => {
      const mockAIResponse = {
        choices: [{ message: { content: 'Test story content' } }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
      };

      const result = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.STORY_CREATION,
        aiFunction: async () => mockAIResponse,
        modelConfig: { model: 'gpt-4o', temperature: 0.7 },
        metadata: { studentId: 1, studentName: 'Test Student' }
      });

      expect(result).toBeDefined();
      expect(result.result).toEqual(mockAIResponse);
    });

      test('should log assessment creation requests correctly', async () => {
      const mockAIResponse = {
        choices: [{ message: { content: 'Test assessment content' } }],
        usage: { prompt_tokens: 150, completion_tokens: 250, total_tokens: 400 }
      };

      const result = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
        aiFunction: async () => mockAIResponse,
        modelConfig: { model: 'gpt-4-turbo', temperature: 0.7 },
        metadata: { studentId: 1, studentName: 'Test Student' }
      });

      expect(result).toBeDefined();
      expect(result.result).toEqual(mockAIResponse);
    });

      test('should log daily task generation requests correctly', async () => {
      const mockAIResponse = {
        choices: [{ message: { content: 'Test daily task content' } }],
        usage: { prompt_tokens: 80, completion_tokens: 120, total_tokens: 200 }
      };

      const result = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.DAILY_TASK_GENERATION,
        aiFunction: async () => mockAIResponse,
        modelConfig: { model: 'gpt-4-turbo', temperature: 0.7 },
        metadata: { studentId: 1, studentName: 'Test Student' }
      });

      expect(result).toBeDefined();
      expect(result.result).toEqual(mockAIResponse);
    });

      test('should capture different token usage for different content types', async () => {
      const storyResponse = {
        choices: [{ message: { content: 'Long story content' } }],
        usage: { prompt_tokens: 200, completion_tokens: 500, total_tokens: 700 }
      };

      const assessmentResponse = {
        choices: [{ message: { content: 'Assessment content' } }],
        usage: { prompt_tokens: 150, completion_tokens: 300, total_tokens: 450 }
      };

      const storyResult = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.STORY_CREATION,
        aiFunction: async () => storyResponse,
        modelConfig: { model: 'gpt-4o', temperature: 0.7 },
        metadata: { studentId: 1 }
      });

      const assessmentResult = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
        aiFunction: async () => assessmentResponse,
        modelConfig: { model: 'gpt-4-turbo', temperature: 0.7 },
        metadata: { studentId: 1 }
      });

      expect(storyResult).toBeDefined();
      expect(assessmentResult).toBeDefined();
      expect(storyResult.result.usage.total_tokens).toBe(700);
      expect(assessmentResult.result.usage.total_tokens).toBe(450);
    });

      test('should log model-specific information correctly', async () => {
      const mockAIResponse = {
        choices: [{ message: { content: 'Test content' } }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
      };

      const gpt4oResult = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.STORY_CREATION,
        aiFunction: async () => mockAIResponse,
        modelConfig: { model: 'gpt-4o', temperature: 0.7 },
        metadata: { studentId: 1 }
      });

      const gpt4TurboResult = await logAIRequestWithCapture({
        contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
        aiFunction: async () => mockAIResponse,
        modelConfig: { model: 'gpt-4-turbo', temperature: 0.7 },
        metadata: { studentId: 1 }
      });

      expect(gpt4oResult).toBeDefined();
      expect(gpt4TurboResult).toBeDefined();
    });

  test('should capture timing information for different content types', async () => {
    const mockAIResponse = {
      choices: [{ message: { content: 'Test content' } }],
      usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
    };

    const storyResult = await logAIRequestWithCapture({
      contentType: CONTENT_TYPES.STORY_CREATION,
      aiFunction: async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return mockAIResponse;
      },
      modelConfig: { model: 'gpt-4o', temperature: 0.7 },
      metadata: { studentId: 1 }
    });

    const assessmentResult = await logAIRequestWithCapture({
      contentType: CONTENT_TYPES.ASSESSMENT_CREATION,
      aiFunction: async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return mockAIResponse;
      },
      modelConfig: { model: 'gpt-4-turbo', temperature: 0.7 },
      metadata: { studentId: 1 }
    });

    expect(storyResult).toBeDefined();
    expect(assessmentResult).toBeDefined();
    expect(storyResult.timing).toBeDefined();
    expect(assessmentResult.timing).toBeDefined();
    expect(storyResult.timing.duration).toBeGreaterThan(0);
    expect(assessmentResult.timing.duration).toBeGreaterThan(0);
  });
}); 