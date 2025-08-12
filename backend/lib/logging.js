/**
 * AI Usage Logging and Monitoring System
 * 
 * This module provides structured logging utilities for tracking AI model usage,
 * including model selection, token consumption, timing, and cost tracking.
 * It serves as a foundation for monitoring and optimizing AI usage across the application.
 */

import { getModelConfig } from './modelConfig.js';

// Logging levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

// Content types for logging
export const CONTENT_TYPES = {
  STORY_CREATION: 'story_creation',
  ASSESSMENT_CREATION: 'assessment_creation',
  DAILY_TASK_GENERATION: 'daily_task_generation'
};

// Cost tracking constants (approximate costs per 1K tokens as of 2024)
const MODEL_COSTS = {
  'gpt-4o': {
    input: 0.0025,   // $0.0025 per 1K input tokens
    output: 0.01,    // $0.01 per 1K output tokens
    lastUpdated: '2024-01-01',
    source: 'OpenAI Pricing'
  },
  'gpt-4-turbo': {
    input: 0.01,     // $0.01 per 1K input tokens
    output: 0.03,    // $0.03 per 1K output tokens
    lastUpdated: '2024-01-01',
    source: 'OpenAI Pricing'
  },
  'gpt-3.5-turbo': {
    input: 0.0005,   // $0.0005 per 1K input tokens
    output: 0.0015,  // $0.0015 per 1K output tokens
    lastUpdated: '2024-01-01',
    source: 'OpenAI Pricing'
  }
};

// Default cost for unknown models
const DEFAULT_COST = {
  input: 0.01,
  output: 0.03,
  lastUpdated: '2024-01-01',
  source: 'Default Fallback'
};

// Cost tracking data structures for analysis
export const COST_TRACKING = {
  // Daily cost tracking
  dailyCosts: new Map(),
  
  // Monthly cost tracking
  monthlyCosts: new Map(),
  
  // Model-specific cost tracking
  modelCosts: new Map(),
  
  // Content type cost tracking
  contentTypeCosts: new Map(),
  
  // User-specific cost tracking (if applicable)
  userCosts: new Map(),
  
  // Cost alerts and thresholds
  thresholds: {
    daily: 10.00,      // $10 per day
    monthly: 100.00,   // $100 per month
    perRequest: 1.00   // $1 per request
  }
};

/**
 * Structured log entry for AI requests
 * @typedef {Object} AIRequestLog
 * @property {string} timestamp - ISO timestamp of the request
 * @property {string} requestId - Unique identifier for the request
 * @property {string} contentType - Type of content being generated
 * @property {string} model - AI model used
 * @property {boolean} isOverride - Whether a model override was used
 * @property {string} overrideReason - Reason for override if applicable
 * @property {number} inputTokens - Number of input tokens
 * @property {number} outputTokens - Number of output tokens
 * @property {number} totalTokens - Total tokens used
 * @property {number} duration - Request duration in milliseconds
 * @property {number} estimatedCost - Estimated cost in USD
 * @property {string} status - Request status (success, error, timeout)
 * @property {string} error - Error message if applicable
 * @property {Object} metadata - Additional request metadata
 */

/**
 * Creates a structured log entry for an AI request
 * @param {Object} params - Logging parameters
 * @param {string} params.contentType - Type of content being generated
 * @param {string} params.model - AI model used
 * @param {boolean} params.isOverride - Whether a model override was used
 * @param {string} params.overrideReason - Reason for override if applicable
 * @param {number} params.inputTokens - Number of input tokens
 * @param {number} params.outputTokens - Number of output tokens
 * @param {number} params.duration - Request duration in milliseconds
 * @param {string} params.status - Request status
 * @param {string} params.error - Error message if applicable
 * @param {Object} params.metadata - Additional request metadata
 * @returns {AIRequestLog} Structured log entry
 */
export function createAIRequestLog(params) {
  const {
    contentType,
    model,
    isOverride = false,
    overrideReason = null,
    inputTokens = 0,
    outputTokens = 0,
    duration = 0,
    status = 'success',
    error = null,
    metadata = {}
  } = params;

  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = calculateCost(model, inputTokens, outputTokens);

  return {
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
    contentType,
    model,
    isOverride,
    overrideReason,
    inputTokens,
    outputTokens,
    totalTokens,
    duration,
    estimatedCost,
    status,
    error,
    metadata
  };
}

/**
 * Calculates estimated cost for token usage
 * @param {string} model - AI model used
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {number} Estimated cost in USD
 */
export function calculateCost(model, inputTokens, outputTokens) {
  const costs = MODEL_COSTS[model] || DEFAULT_COST;
  
  const inputCost = (inputTokens / 1000) * costs.input;
  const outputCost = (outputTokens / 1000) * costs.output;
  
  return Math.round((inputCost + outputCost) * 1000) / 1000; // Round to 3 decimal places
}

/**
 * Tracks cost for analysis and monitoring
 * @param {Object} costData - Cost tracking data
 * @param {number} costData.amount - Cost amount in USD
 * @param {string} costData.model - AI model used
 * @param {string} costData.contentType - Type of content generated
 * @param {string} costData.userId - User ID (optional)
 * @param {Object} costData.metadata - Additional metadata
 */
export function trackCost(costData) {
  const { amount, model, contentType, userId = 'anonymous', metadata = {} } = costData;
  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];
  const monthKey = now.toISOString().slice(0, 7); // YYYY-MM format
  
  // Track daily costs
  if (!COST_TRACKING.dailyCosts.has(dateKey)) {
    COST_TRACKING.dailyCosts.set(dateKey, {
      total: 0,
      requests: 0,
      byModel: {},
      byContentType: {},
      byUser: {}
    });
  }
  
  const dailyData = COST_TRACKING.dailyCosts.get(dateKey);
  dailyData.total += amount;
  dailyData.requests += 1;
  
  // Track by model
  if (!dailyData.byModel[model]) {
    dailyData.byModel[model] = { total: 0, requests: 0 };
  }
  dailyData.byModel[model].total += amount;
  dailyData.byModel[model].requests += 1;
  
  // Track by content type
  if (!dailyData.byContentType[contentType]) {
    dailyData.byContentType[contentType] = { total: 0, requests: 0 };
  }
  dailyData.byContentType[contentType].total += amount;
  dailyData.byContentType[contentType].requests += 1;
  
  // Track by user
  if (!dailyData.byUser[userId]) {
    dailyData.byUser[userId] = { total: 0, requests: 0 };
  }
  dailyData.byUser[userId].total += amount;
  dailyData.byUser[userId].requests += 1;
  
  // Track monthly costs
  if (!COST_TRACKING.monthlyCosts.has(monthKey)) {
    COST_TRACKING.monthlyCosts.set(monthKey, {
      total: 0,
      requests: 0,
      byModel: {},
      byContentType: {},
      byUser: {}
    });
  }
  
  const monthlyData = COST_TRACKING.monthlyCosts.get(monthKey);
  monthlyData.total += amount;
  monthlyData.requests += 1;
  
  // Track by model (monthly)
  if (!monthlyData.byModel[model]) {
    monthlyData.byModel[model] = { total: 0, requests: 0 };
  }
  monthlyData.byModel[model].total += amount;
  monthlyData.byModel[model].requests += 1;
  
  // Track by content type (monthly)
  if (!monthlyData.byContentType[contentType]) {
    monthlyData.byContentType[contentType] = { total: 0, requests: 0 };
  }
  monthlyData.byContentType[contentType].total += amount;
  monthlyData.byContentType[contentType].requests += 1;
  
  // Track by user (monthly)
  if (!monthlyData.byUser[userId]) {
    monthlyData.byUser[userId] = { total: 0, requests: 0 };
  }
  monthlyData.byUser[userId].total += amount;
  monthlyData.byUser[userId].requests += 1;
  
  // Check for cost alerts
  checkCostAlerts(dateKey, monthKey, amount);
  
  // Log cost tracking
  console.log(`💰 Cost Tracked: $${amount.toFixed(4)} for ${contentType} using ${model}`);
}

/**
 * Checks for cost threshold alerts
 * @param {string} dateKey - Date key for daily tracking
 * @param {string} monthKey - Month key for monthly tracking
 * @param {number} amount - Current request cost
 */
export function checkCostAlerts(dateKey, monthKey, amount) {
  const dailyData = COST_TRACKING.dailyCosts.get(dateKey);
  const monthlyData = COST_TRACKING.monthlyCosts.get(monthKey);
  
  // Check daily threshold
  if (dailyData && dailyData.total > COST_TRACKING.thresholds.daily) {
    console.warn(`⚠️  Daily cost threshold exceeded: $${dailyData.total.toFixed(2)} > $${COST_TRACKING.thresholds.daily}`);
  }
  
  // Check monthly threshold
  if (monthlyData && monthlyData.total > COST_TRACKING.thresholds.monthly) {
    console.warn(`⚠️  Monthly cost threshold exceeded: $${monthlyData.total.toFixed(2)} > $${COST_TRACKING.thresholds.monthly}`);
  }
  
  // Check per-request threshold
  if (amount > COST_TRACKING.thresholds.perRequest) {
    console.warn(`⚠️  Per-request cost threshold exceeded: $${amount.toFixed(2)} > $${COST_TRACKING.thresholds.perRequest}`);
  }
}

/**
 * Gets cost analysis data
 * @param {Object} options - Analysis options
 * @param {string} options.period - Analysis period (daily, monthly, all)
 * @param {string} options.groupBy - Grouping (model, contentType, user)
 * @returns {Object} Cost analysis data
 */
export function getCostAnalysis(options = {}) {
  const { period = 'all', groupBy = 'model' } = options;
  
  const analysis = {
    period,
    groupBy,
    totalCost: 0,
    totalRequests: 0,
    breakdown: {},
    summary: {}
  };
  
  let dataSource;
  
  switch (period) {
    case 'daily':
      dataSource = COST_TRACKING.dailyCosts;
      break;
    case 'monthly':
      dataSource = COST_TRACKING.monthlyCosts;
      break;
    default:
      dataSource = COST_TRACKING.monthlyCosts; // Default to monthly for 'all'
  }
  
  // Aggregate data
  for (const [key, data] of dataSource) {
    analysis.totalCost += data.total;
    analysis.totalRequests += data.requests;
    
    // Group by specified field
    const groupData = data[`by${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`] || {};
    
    for (const [groupKey, groupStats] of Object.entries(groupData)) {
      if (!analysis.breakdown[groupKey]) {
        analysis.breakdown[groupKey] = {
          totalCost: 0,
          totalRequests: 0,
          averageCost: 0
        };
      }
      
      analysis.breakdown[groupKey].totalCost += groupStats.total;
      analysis.breakdown[groupKey].totalRequests += groupStats.requests;
    }
  }
  
  // Calculate averages
  for (const groupKey in analysis.breakdown) {
    const group = analysis.breakdown[groupKey];
    group.averageCost = group.totalRequests > 0 ? group.totalCost / group.totalRequests : 0;
  }
  
  // Calculate overall averages
  analysis.summary = {
    averageCostPerRequest: analysis.totalRequests > 0 ? analysis.totalCost / analysis.totalRequests : 0,
    averageRequestsPerPeriod: dataSource.size > 0 ? analysis.totalRequests / dataSource.size : 0,
    averageCostPerPeriod: dataSource.size > 0 ? analysis.totalCost / dataSource.size : 0
  };
  
  return analysis;
}

/**
 * Exports cost tracking data for external analysis
 * @param {Object} options - Export options
 * @returns {Object} Exported cost data
 */
export function exportCostData(options = {}) {
  const { includeMetadata = true, format = 'json' } = options;
  
  const exportData = {
    exportDate: new Date().toISOString(),
    costTracking: {
      dailyCosts: Object.fromEntries(COST_TRACKING.dailyCosts),
      monthlyCosts: Object.fromEntries(COST_TRACKING.monthlyCosts),
      thresholds: COST_TRACKING.thresholds
    },
    modelCosts: MODEL_COSTS,
    analysis: getCostAnalysis()
  };
  
  if (includeMetadata) {
    exportData.metadata = {
      totalDaysTracked: COST_TRACKING.dailyCosts.size,
      totalMonthsTracked: COST_TRACKING.monthlyCosts.size,
      modelsTracked: Object.keys(MODEL_COSTS),
      contentTypesTracked: Object.values(CONTENT_TYPES)
    };
  }
  
  return format === 'json' ? JSON.stringify(exportData, null, 2) : exportData;
}

/**
 * Resets cost tracking data (useful for testing or data cleanup)
 * @param {Object} options - Reset options
 */
export function resetCostTracking(options = {}) {
  const { resetDaily = true, resetMonthly = true, resetThresholds = false } = options;
  
  if (resetDaily) {
    COST_TRACKING.dailyCosts.clear();
  }
  
  if (resetMonthly) {
    COST_TRACKING.monthlyCosts.clear();
  }
  
  if (resetThresholds) {
    COST_TRACKING.thresholds = {
      daily: 10.00,
      monthly: 100.00,
      perRequest: 1.00
    };
  }
  
  console.log('🧹 Cost tracking data reset');
}

/**
 * Updates cost thresholds
 * @param {Object} newThresholds - New threshold values
 */
export function updateCostThresholds(newThresholds) {
  COST_TRACKING.thresholds = {
    ...COST_TRACKING.thresholds,
    ...newThresholds
  };
  
  console.log('⚙️  Cost thresholds updated:', COST_TRACKING.thresholds);
}

/**
 * Gets current cost thresholds
 * @returns {Object} Current threshold values
 */
export function getCostThresholds() {
  return { ...COST_TRACKING.thresholds };
}

/**
 * Generates a unique request ID
 * @returns {string} Unique request identifier
 */
export function generateRequestId() {
  return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Logs an AI request with structured data
 * @param {AIRequestLog} logEntry - Structured log entry
 * @param {string} level - Log level (error, warn, info, debug)
 */
export function logAIRequest(logEntry, level = LOG_LEVELS.INFO) {
  const logMessage = formatLogMessage(logEntry, level);
  
  switch (level) {
    case LOG_LEVELS.ERROR:
      console.error(logMessage);
      break;
    case LOG_LEVELS.WARN:
      console.warn(logMessage);
      break;
    case LOG_LEVELS.DEBUG:
      console.debug(logMessage);
      break;
    default:
      console.log(logMessage);
  }
}

/**
 * Formats a log entry into a readable message
 * @param {AIRequestLog} logEntry - Structured log entry
 * @param {string} level - Log level
 * @returns {string} Formatted log message
 */
export function formatLogMessage(logEntry, level) {
  const {
    timestamp,
    requestId,
    contentType,
    model,
    isOverride,
    totalTokens,
    duration,
    estimatedCost,
    status,
    error
  } = logEntry;

  const overrideText = isOverride ? ` (OVERRIDE)` : '';
  const errorText = error ? ` - Error: ${error}` : '';
  
  return `🤖 [${level.toUpperCase()}] AI Request ${requestId} | ${contentType} | ${model}${overrideText} | ${totalTokens} tokens | ${duration}ms | $${estimatedCost} | ${status}${errorText}`;
}

/**
 * Creates a performance timer for AI requests
 * @returns {Object} Timer object with start and end methods
 */
export function createAITimer() {
  const startTime = Date.now();
  
  return {
    startTime,
    end() {
      return Date.now() - startTime;
    }
  };
}

/**
 * Logs AI model configuration for debugging
 * @param {string} contentType - Content type being generated
 */
export function logModelConfiguration(contentType) {
  try {
    const config = getModelConfig(contentType);
    const overrideText = config.isOverride ? ` (OVERRIDE: ${config.overrideReason})` : '';
    
    console.log(`🔧 AI Model Config for ${contentType}: ${config.model}${overrideText} | Temp: ${config.temperature} | Max Tokens: ${config.maxTokens}`);
  } catch (error) {
    console.warn(`⚠️ Failed to log model configuration for ${contentType}:`, error.message);
  }
}

/**
 * Captures and logs model selection information
 * @param {string} contentType - Type of content being generated
 * @param {Object} modelConfig - Model configuration object
 * @returns {Object} Model selection data for logging
 */
export function captureModelSelection(contentType, modelConfig) {
  const selectionData = {
    contentType,
    model: modelConfig.model,
    isOverride: modelConfig.isOverride || false,
    overrideReason: modelConfig.overrideReason || null,
    temperature: modelConfig.temperature,
    maxTokens: modelConfig.maxTokens,
    reasoning: modelConfig.reasoning,
    timestamp: new Date().toISOString()
  };

  console.log(`🎯 Model Selection: ${contentType} → ${modelConfig.model}${modelConfig.isOverride ? ' (OVERRIDE)' : ''}`);
  
  return selectionData;
}

/**
 * Captures and logs token usage information
 * @param {Object} openAIResponse - Response from OpenAI API
 * @param {string} model - Model used for the request
 * @returns {Object} Token usage data for logging
 */
export function captureTokenUsage(openAIResponse, model) {
  const usage = openAIResponse?.usage || {};
  const tokenData = {
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    model,
    timestamp: new Date().toISOString()
  };

  console.log(`🔢 Token Usage: ${tokenData.totalTokens} total (${tokenData.inputTokens} input, ${tokenData.outputTokens} output) for ${model}`);
  
  return tokenData;
}

/**
 * Captures and logs timing information
 * @param {Object} timer - Timer object from createAITimer()
 * @param {string} contentType - Type of content being generated
 * @returns {Object} Timing data for logging
 */
export function captureTiming(timer, contentType) {
  const duration = timer.end();
  const timingData = {
    duration,
    contentType,
    timestamp: new Date().toISOString()
  };

  console.log(`⏱️  Timing: ${contentType} completed in ${duration}ms`);
  
  return timingData;
}

/**
 * Comprehensive logging wrapper for AI requests
 * @param {Object} params - Logging parameters
 * @param {string} params.contentType - Type of content being generated
 * @param {Function} params.aiFunction - AI function to execute
 * @param {Object} params.modelConfig - Model configuration
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Result with logging data
 */
export async function logAIRequestWithCapture(params) {
  const { contentType, aiFunction, modelConfig, metadata = {} } = params;
  
  // Create timer
  const timer = createAITimer();
  
  // Capture model selection
  const modelSelection = captureModelSelection(contentType, modelConfig);
  
  try {
    // Execute AI function
    const result = await aiFunction();
    
    // Capture timing
    const timing = captureTiming(timer, contentType);
    
    // Capture token usage if available
    let tokenUsage = null;
    if (result && result.usage) {
      tokenUsage = captureTokenUsage(result, modelConfig.model);
    }
    
    // Create comprehensive log entry
    const logEntry = createAIRequestLog({
      contentType,
      model: modelConfig.model,
      isOverride: modelConfig.isOverride,
      overrideReason: modelConfig.overrideReason,
      inputTokens: tokenUsage?.inputTokens || 0,
      outputTokens: tokenUsage?.outputTokens || 0,
      duration: timing.duration,
      status: 'success',
      metadata: {
        ...metadata,
        modelSelection,
        timing,
        tokenUsage
      }
    });
    
    // Track cost for analysis
    trackCost({
      amount: logEntry.estimatedCost,
      model: modelConfig.model,
      contentType,
      userId: metadata.userId || 'anonymous',
      metadata: {
        requestId: logEntry.requestId,
        duration: timing.duration,
        inputTokens: tokenUsage?.inputTokens || 0,
        outputTokens: tokenUsage?.outputTokens || 0
      }
    });
    
    // Log the request
    logAIRequest(logEntry, LOG_LEVELS.INFO);
    
    return {
      result,
      logEntry,
      modelSelection,
      timing,
      tokenUsage
    };
    
  } catch (error) {
    // Capture timing even on error
    const timing = captureTiming(timer, contentType);
    
    // Create error log entry
    const logEntry = createAIRequestLog({
      contentType,
      model: modelConfig.model,
      isOverride: modelConfig.isOverride,
      overrideReason: modelConfig.overrideReason,
      duration: timing.duration,
      status: 'error',
      error: error.message,
      metadata: {
        ...metadata,
        modelSelection,
        timing,
        errorDetails: error.stack
      }
    });
    
    // Log the error
    logAIRequest(logEntry, LOG_LEVELS.ERROR);
    
    throw error;
  }
}

/**
 * Logs content type specific information
 * @param {string} contentType - Type of content being generated
 * @param {Object} contentData - Content-specific data
 */
export function logContentTypeInfo(contentType, contentData) {
  const contentTypeInfo = {
    story_creation: {
      emoji: '📚',
      description: 'Story and narrative generation'
    },
    assessment_creation: {
      emoji: '📝',
      description: 'Assessment and question generation'
    },
    daily_task_generation: {
      emoji: '🎯',
      description: 'Daily activity and task generation'
    }
  };

  const info = contentTypeInfo[contentType] || {
    emoji: '🤖',
    description: 'AI content generation'
  };

  console.log(`${info.emoji} Content Type: ${contentType} - ${info.description}`);
  
  if (contentData) {
    console.log(`   Additional Data:`, JSON.stringify(contentData, null, 2));
  }
}

/**
 * Logs request start information
 * @param {string} contentType - Type of content being generated
 * @param {Object} modelConfig - Model configuration
 * @param {Object} requestData - Request-specific data
 */
export function logRequestStart(contentType, modelConfig, requestData = {}) {
  console.log(`🚀 Starting AI Request:`);
  console.log(`   Content Type: ${contentType}`);
  console.log(`   Model: ${modelConfig.model}${modelConfig.isOverride ? ' (OVERRIDE)' : ''}`);
  console.log(`   Temperature: ${modelConfig.temperature}`);
  console.log(`   Max Tokens: ${modelConfig.maxTokens}`);
  
  if (Object.keys(requestData).length > 0) {
    console.log(`   Request Data:`, JSON.stringify(requestData, null, 2));
  }
}

/**
 * Logs request completion information
 * @param {string} contentType - Type of content being generated
 * @param {number} duration - Request duration in milliseconds
 * @param {number} totalTokens - Total tokens used
 * @param {number} estimatedCost - Estimated cost in USD
 */
export function logRequestCompletion(contentType, duration, totalTokens, estimatedCost) {
  console.log(`✅ AI Request Completed:`);
  console.log(`   Content Type: ${contentType}`);
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Tokens: ${totalTokens.toLocaleString()}`);
  console.log(`   Estimated Cost: $${estimatedCost.toFixed(4)}`);
}

/**
 * Aggregates AI usage statistics
 * @param {AIRequestLog[]} logs - Array of log entries
 * @returns {Object} Aggregated statistics
 */
export function aggregateUsageStats(logs) {
  const stats = {
    totalRequests: logs.length,
    totalTokens: 0,
    totalCost: 0,
    totalDuration: 0,
    byModel: {},
    byContentType: {},
    byStatus: {},
    averageTokensPerRequest: 0,
    averageCostPerRequest: 0,
    averageDurationPerRequest: 0
  };

  logs.forEach(log => {
    // Overall stats
    stats.totalTokens += log.totalTokens;
    stats.totalCost += log.estimatedCost;
    stats.totalDuration += log.duration;

    // By model
    if (!stats.byModel[log.model]) {
      stats.byModel[log.model] = {
        requests: 0,
        tokens: 0,
        cost: 0,
        duration: 0
      };
    }
    stats.byModel[log.model].requests++;
    stats.byModel[log.model].tokens += log.totalTokens;
    stats.byModel[log.model].cost += log.estimatedCost;
    stats.byModel[log.model].duration += log.duration;

    // By content type
    if (!stats.byContentType[log.contentType]) {
      stats.byContentType[log.contentType] = {
        requests: 0,
        tokens: 0,
        cost: 0,
        duration: 0
      };
    }
    stats.byContentType[log.contentType].requests++;
    stats.byContentType[log.contentType].tokens += log.totalTokens;
    stats.byContentType[log.contentType].cost += log.estimatedCost;
    stats.byContentType[log.contentType].duration += log.duration;

    // By status
    if (!stats.byStatus[log.status]) {
      stats.byStatus[log.status] = 0;
    }
    stats.byStatus[log.status]++;
  });

  // Calculate averages
  if (stats.totalRequests > 0) {
    stats.averageTokensPerRequest = Math.round(stats.totalTokens / stats.totalRequests);
    stats.averageCostPerRequest = Math.round((stats.totalCost / stats.totalRequests) * 1000) / 1000;
    stats.averageDurationPerRequest = Math.round(stats.totalDuration / stats.totalRequests);
  }

  return stats;
}

/**
 * Logs usage statistics summary
 * @param {Object} stats - Aggregated usage statistics
 */
export function logUsageStats(stats) {
  console.log('📊 AI Usage Statistics Summary:');
  console.log('=====================================');
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Total Tokens: ${stats.totalTokens.toLocaleString()}`);
  console.log(`Total Cost: $${stats.totalCost.toFixed(3)}`);
  console.log(`Total Duration: ${stats.totalDuration}ms`);
  console.log(`Average Tokens/Request: ${stats.averageTokensPerRequest}`);
  console.log(`Average Cost/Request: $${stats.averageCostPerRequest}`);
  console.log(`Average Duration/Request: ${stats.averageDurationPerRequest}ms`);
  
  console.log('\nBy Model:');
  Object.entries(stats.byModel).forEach(([model, modelStats]) => {
    console.log(`  ${model}: ${modelStats.requests} requests, ${modelStats.tokens.toLocaleString()} tokens, $${modelStats.cost.toFixed(3)}`);
  });
  
  console.log('\nBy Content Type:');
  Object.entries(stats.byContentType).forEach(([contentType, contentTypeStats]) => {
    console.log(`  ${contentType}: ${contentTypeStats.requests} requests, ${contentTypeStats.tokens.toLocaleString()} tokens, $${contentTypeStats.cost.toFixed(3)}`);
  });
  
  console.log('\nBy Status:');
  Object.entries(stats.byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count} requests`);
  });
  
  console.log('=====================================');
}

/**
 * Validates log entry data
 * @param {AIRequestLog} logEntry - Log entry to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validateLogEntry(logEntry) {
  const requiredFields = ['timestamp', 'requestId', 'contentType', 'model', 'status'];
  
  for (const field of requiredFields) {
    if (!logEntry[field]) {
      console.warn(`⚠️ Missing required field in log entry: ${field}`);
      return false;
    }
  }
  
  if (logEntry.inputTokens < 0 || logEntry.outputTokens < 0) {
    console.warn('⚠️ Token counts cannot be negative');
    return false;
  }
  
  if (logEntry.duration < 0) {
    console.warn('⚠️ Duration cannot be negative');
    return false;
  }
  
  if (logEntry.estimatedCost < 0) {
    console.warn('⚠️ Estimated cost cannot be negative');
    return false;
  }
  
  return true;
}

/**
 * Exports log entry as JSON for external systems
 * @param {AIRequestLog} logEntry - Log entry to export
 * @returns {string} JSON string
 */
export function exportLogEntry(logEntry) {
  if (!validateLogEntry(logEntry)) {
    throw new Error('Invalid log entry cannot be exported');
  }
  
  return JSON.stringify(logEntry, null, 2);
}

/**
 * Imports log entry from JSON
 * @param {string} jsonString - JSON string to import
 * @returns {AIRequestLog} Parsed log entry
 */
export function importLogEntry(jsonString) {
  try {
    const logEntry = JSON.parse(jsonString);
    
    if (!validateLogEntry(logEntry)) {
      throw new Error('Invalid log entry data');
    }
    
    return logEntry;
  } catch (error) {
    throw new Error(`Failed to import log entry: ${error.message}`);
  }
} 

/**
 * Logs structured scoring metrics for assessments (v1/v2 agnostic)
 * @param {Object} data - Scoring metrics payload
 * @param {boolean} data.useV2 - Whether v2 scoring was used
 * @param {number} data.wpm - Words per minute
 * @param {number} data.accuracy - Accuracy percent
 * @param {number} data.fluencyScore - Fluency score F
 * @param {number} data.compVocabScore - Comp/Vocab score C
 * @param {number} data.compositeScore - Composite score
 * @param {string} data.label - Assigned reading level label
 * @param {Object} [data.floors] - Floor checks
 * @param {boolean} [data.floors.fAt]
 * @param {boolean} [data.floors.cAt]
 * @param {boolean} [data.floors.fAbove]
 * @param {boolean} [data.floors.cAbove]
 * @param {boolean} [data.capEngaged] - Whether fluency cap affected F
 * @param {boolean} [data.accuracyHardFloorApplied] - Whether accuracy hard floor forced a downgrade
 */
export function logScoringMetrics(data) {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'scoring_metrics',
      ...data,
    };
    console.log(`📏 Scoring Metrics: ${JSON.stringify(entry)}`);
    // Increment minimal counters and occasionally log a compact summary
    try {
      incrementScoringCounters(Boolean(data.useV2), String(data.label || 'Unknown'));
      maybeLogScoringSummary();
    } catch (innerErr) {
      // Never throw from logging utilities
    }
  } catch (err) {
    console.warn('⚠️ Failed to log scoring metrics:', err.message);
  }
}

// --- Minimal rollout counters for scoring labels (v1 vs v2) ---
export const SCORING_COUNTERS = {
  v1: { total: 0, byLabel: {} },
  v2: { total: 0, byLabel: {} },
};

/**
 * Increments counters for scoring label distribution.
 * @param {boolean} useV2 - Whether v2 scoring was used
 * @param {string} label - Assigned reading level label
 */
export function incrementScoringCounters(useV2, label) {
  const bucket = useV2 ? SCORING_COUNTERS.v2 : SCORING_COUNTERS.v1;
  bucket.total += 1;
  bucket.byLabel[label] = (bucket.byLabel[label] || 0) + 1;
}

let LAST_SCORING_SUMMARY_TOTAL = 0;

/**
 * Emits a compact summary occasionally to avoid noisy logs.
 * Current policy: every 10 total scoring events across v1+v2.
 */
export function maybeLogScoringSummary() {
  const grandTotal = SCORING_COUNTERS.v1.total + SCORING_COUNTERS.v2.total;
  if (grandTotal > 0 && grandTotal % 10 === 0 && grandTotal !== LAST_SCORING_SUMMARY_TOTAL) {
    LAST_SCORING_SUMMARY_TOTAL = grandTotal;
    console.log('📈 Scoring Summary (rollout counters):', {
      grandTotal,
      v1: SCORING_COUNTERS.v1,
      v2: SCORING_COUNTERS.v2,
    });
  }
}