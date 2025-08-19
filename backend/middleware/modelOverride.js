/**
 * Model Override Middleware
 * 
 * Provides request-level model override capability for development and testing.
 * Allows developers to override AI models via headers or query parameters.
 * 
 * Features:
 * - Header-based overrides (X-Model-Override)
 * - Query parameter overrides (?model=gpt-4o)
 * - Content type specific overrides
 * - Override validation and logging
 * - Development environment protection
 */

import { getModelConfig, isModelSupported, getOverrideStatus, MODELS } from '../lib/modelConfig.js';
import { CONTENT_TYPES } from '../lib/logging.js';

// Supported override methods
const OVERRIDE_METHODS = {
  HEADER: 'header',
  QUERY: 'query',
  BOTH: 'both'
};

// Override header name
const OVERRIDE_HEADER = 'X-Model-Override';

// Override query parameter name
const OVERRIDE_QUERY_PARAM = 'model';

/**
 * Validates if a model override is allowed in the current environment
 * @param {Object} req - Express request object
 * @returns {boolean} - Whether override is allowed
 */
function isOverrideAllowed(req) {
  // Only allow overrides in development environment
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  
  // Check if overrides are explicitly disabled
  if (process.env.DISABLE_MODEL_OVERRIDES === 'true') {
    return false;
  }
  
  return true;
}

/**
 * Extracts model override from request headers
 * @param {Object} req - Express request object
 * @returns {string|null} - Model name or null if not found
 */
function extractHeaderOverride(req) {
  const overrideHeader = req.get(OVERRIDE_HEADER);
  
  if (!overrideHeader) {
    return null;
  }
  
  // Parse header value (can be JSON for content-type specific overrides)
  try {
    const parsed = JSON.parse(overrideHeader);
    return parsed;
  } catch (e) {
    // Simple string override for all content types
    return overrideHeader;
  }
}

/**
 * Extracts model override from query parameters
 * @param {Object} req - Express request object
 * @returns {string|null} - Model name or null if not found
 */
function extractQueryOverride(req) {
  return req.query[OVERRIDE_QUERY_PARAM] || null;
}

/**
 * Validates a model override value
 * @param {string|Object} override - The override value to validate
 * @param {string} contentType - The content type being overridden
 * @returns {Object} - Validation result with isValid boolean and error message
 */
function validateOverride(override, contentType) {
  if (!override) {
    return { isValid: false, error: 'No override value provided' };
  }
  
  // Handle string override (applies to all content types)
  if (typeof override === 'string') {
    if (!isModelSupported(override)) {
      return { 
        isValid: false, 
        error: `Model '${override}' is not supported. Supported models: ${Object.keys(MODELS).join(', ')}` 
      };
    }
    return { isValid: true, model: override };
  }
  
  // Handle object override (content-type specific)
  if (typeof override === 'object') {
    // Check if content type is specified
    if (!override[contentType]) {
      return { 
        isValid: false, 
        error: `No override specified for content type '${contentType}'. Available: ${Object.keys(override).join(', ')}` 
      };
    }
    
    const model = override[contentType];
    if (!isModelSupported(model)) {
      return { 
        isValid: false, 
        error: `Model '${model}' is not supported for content type '${contentType}'. Supported models: ${Object.keys(require('../lib/modelConfig.js').MODELS).join(', ')}` 
      };
    }
    
    return { isValid: true, model };
  }
  
  return { isValid: false, error: 'Invalid override format. Use string or object with content types.' };
}

/**
 * Creates a model configuration with override applied
 * @param {Object} originalConfig - Original model configuration
 * @param {string} overrideModel - Model to override with
 * @param {string} contentType - Content type being overridden
 * @returns {Object} - Model configuration with override applied
 */
function applyOverride(originalConfig, overrideModel, contentType) {
  return {
    ...originalConfig,
    model: overrideModel,
    isOverride: true,
    overrideReason: `Request-level override for ${contentType}`,
    originalModel: originalConfig.model,
    overrideSource: 'middleware'
  };
}

/**
 * Logs model override information
 * @param {Object} req - Express request object
 * @param {string} contentType - Content type being overridden
 * @param {Object} originalConfig - Original model configuration
 * @param {Object} overrideConfig - Override model configuration
 */
function logOverride(req, contentType, originalConfig, overrideConfig) {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    contentType,
    originalModel: originalConfig.model,
    overrideModel: overrideConfig.model,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    overrideSource: overrideConfig.overrideSource,
    overrideMethod: req.modelOverride.method,
    overrideValue: req.modelOverride.value
  };
  
  // Enhanced console logging with emojis and formatting
  console.log('🔧 Model Override Applied:', {
    '📅 Timestamp': logData.timestamp,
    '🌐 Request': `${logData.method} ${logData.path}`,
    '📝 Content Type': logData.contentType,
    '🔄 Model Change': `${logData.originalModel} → ${logData.overrideModel}`,
    '🎛️ Override Method': logData.overrideMethod,
    '💻 User Agent': logData.userAgent?.substring(0, 50) + '...',
    '📍 IP Address': logData.ip
  });
  
  // Log detailed override information
  console.log('📊 Override Details:', {
    'Original Config': {
      model: originalConfig.model,
      temperature: originalConfig.temperature,
      maxTokens: originalConfig.maxTokens,
      reasoning: originalConfig.reasoning
    },
    'Override Config': {
      model: overrideConfig.model,
      temperature: overrideConfig.temperature,
      maxTokens: overrideConfig.maxTokens,
      reasoning: overrideConfig.reasoning,
      overrideReason: overrideConfig.overrideReason
    }
  });
  
  // Log to override tracking if available
  if (global.overrideTracking) {
    global.overrideTracking.push(logData);
  }
  
  // Log to file if override logging is enabled
  if (process.env.LOG_MODEL_OVERRIDES === 'true') {
    const fs = require('fs');
    const logEntry = JSON.stringify(logData) + '\n';
    const logFile = process.env.OVERRIDE_LOG_FILE || './logs/model-overrides.log';
    
    try {
      // Ensure log directory exists
      const logDir = logFile.substring(0, logFile.lastIndexOf('/'));
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      console.warn('⚠️ Failed to write override log to file:', error.message);
    }
  }
}

/**
 * Main middleware function for model override
 * @param {Object} options - Middleware options
 * @param {string} options.method - Override method (header, query, both)
 * @param {boolean} options.strict - Whether to reject invalid overrides
 * @param {boolean} options.logging - Whether to enable override logging
 * @returns {Function} - Express middleware function
 */
export function modelOverrideMiddleware(options = {}) {
  const {
    method = OVERRIDE_METHODS.BOTH,
    strict = false,
    logging = true
  } = options;
  
  return (req, res, next) => {
    // Check if overrides are allowed
    if (!isOverrideAllowed(req)) {
      return next();
    }
    
    // Extract override value based on method
    let overrideValue = null;
    
    if (method === OVERRIDE_METHODS.HEADER || method === OVERRIDE_METHODS.BOTH) {
      overrideValue = extractHeaderOverride(req);
    }
    
    if (!overrideValue && (method === OVERRIDE_METHODS.QUERY || method === OVERRIDE_METHODS.BOTH)) {
      overrideValue = extractQueryOverride(req);
    }
    
    // If no override found, continue
    if (!overrideValue) {
      return next();
    }
    
    // Store override information in request for later use
    req.modelOverride = {
      value: overrideValue,
      method: method,
      timestamp: new Date().toISOString()
    };
    
    // Add helper function to apply override to model config
    req.applyModelOverride = (contentType, originalConfig) => {
      const validation = validateOverride(overrideValue, contentType);
      
      if (!validation.isValid) {
        if (strict) {
          const error = new Error(`Invalid model override: ${validation.error}`);
          error.status = 400;
          throw error;
        }
        
        console.warn(`Invalid model override ignored: ${validation.error}`);
        return originalConfig;
      }
      
      const overrideConfig = applyOverride(originalConfig, validation.model, contentType);
      
      if (logging) {
        logOverride(req, contentType, originalConfig, overrideConfig);
      }
      
      return overrideConfig;
    };
    
    next();
  };
}

/**
 * Helper function to get model configuration with override applied
 * @param {Object} req - Express request object
 * @param {string} contentType - Content type
 * @returns {Object} - Model configuration with override if applicable
 */
export function getModelConfigWithOverride(req, contentType) {
  if (!req.modelOverride || !req.applyModelOverride) {
    return getModelConfig(contentType);
  }
  
  const originalConfig = getModelConfig(contentType);
  return req.applyModelOverride(contentType, originalConfig);
}

/**
 * Middleware to validate content type in request
 * @param {string} contentType - Expected content type
 * @returns {Function} - Express middleware function
 */
export function validateContentType(contentType) {
  return (req, res, next) => {
    if (!Object.values(CONTENT_TYPES).includes(contentType)) {
      const error = new Error(`Invalid content type: ${contentType}`);
      error.status = 400;
      return next(error);
    }
    
    req.expectedContentType = contentType;
    next();
  };
}

/**
 * Middleware to apply model override for specific content type
 * @param {string} contentType - Content type to override for
 * @returns {Function} - Express middleware function
 */
export function applyModelOverrideForContentType(contentType) {
  return (req, res, next) => {
    if (!req.modelOverride) {
      return next();
    }
    
    try {
      const originalConfig = getModelConfig(contentType);
      const overrideConfig = req.applyModelOverride(contentType, originalConfig);
      
      // Store the override config for use in route handlers
      req.modelConfig = overrideConfig;
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Utility function to get override statistics
 * @returns {Object} - Override usage statistics
 */
export function getOverrideStats() {
  if (!global.overrideTracking) {
    return { totalOverrides: 0, overrides: [] };
  }
  
  const overrides = global.overrideTracking;
  const stats = {
    totalOverrides: overrides.length,
    byModel: {},
    byContentType: {},
    byPath: {},
    byMethod: {},
    byHour: {},
    recentOverrides: overrides.slice(-10), // Last 10 overrides
    summary: {}
  };
  
  overrides.forEach(override => {
    // Count by model
    stats.byModel[override.overrideModel] = (stats.byModel[override.overrideModel] || 0) + 1;
    
    // Count by content type
    stats.byContentType[override.contentType] = (stats.byContentType[override.contentType] || 0) + 1;
    
    // Count by path
    stats.byPath[override.path] = (stats.byPath[override.path] || 0) + 1;
    
    // Count by method
    stats.byMethod[override.overrideMethod] = (stats.byMethod[override.overrideMethod] || 0) + 1;
    
    // Count by hour
    const hour = new Date(override.timestamp).getHours();
    stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
  });
  
  // Calculate summary statistics
  if (overrides.length > 0) {
    const timestamps = overrides.map(o => new Date(o.timestamp));
    const firstOverride = new Date(Math.min(...timestamps));
    const lastOverride = new Date(Math.max(...timestamps));
    
    stats.summary = {
      firstOverride: firstOverride.toISOString(),
      lastOverride: lastOverride.toISOString(),
      timeSpan: `${Math.round((lastOverride - firstOverride) / (1000 * 60 * 60))} hours`,
      averagePerHour: overrides.length / Math.max(1, Math.round((lastOverride - firstOverride) / (1000 * 60 * 60))),
      mostUsedModel: Object.entries(stats.byModel).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None',
      mostUsedContentType: Object.entries(stats.byContentType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None',
      mostUsedPath: Object.entries(stats.byPath).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'
    };
  }
  
  return stats;
}

/**
 * Utility function to get detailed override report
 * @returns {Object} - Detailed override report
 */
export function getOverrideReport() {
  const stats = getOverrideStats();
  
  console.log('📊 Model Override Report');
  console.log('='.repeat(50));
  console.log(`📈 Total Overrides: ${stats.totalOverrides}`);
  
  if (stats.totalOverrides > 0) {
    console.log('\n📅 Summary:');
    console.log(`   First Override: ${stats.summary.firstOverride}`);
    console.log(`   Last Override: ${stats.summary.lastOverride}`);
    console.log(`   Time Span: ${stats.summary.timeSpan}`);
    console.log(`   Average Per Hour: ${stats.summary.averagePerHour.toFixed(2)}`);
    
    console.log('\n🏆 Most Used:');
    console.log(`   Model: ${stats.summary.mostUsedModel}`);
    console.log(`   Content Type: ${stats.summary.mostUsedContentType}`);
    console.log(`   Path: ${stats.summary.mostUsedPath}`);
    
    console.log('\n📊 Breakdown by Model:');
    Object.entries(stats.byModel)
      .sort((a, b) => b[1] - a[1])
      .forEach(([model, count]) => {
        console.log(`   ${model}: ${count} (${((count / stats.totalOverrides) * 100).toFixed(1)}%)`);
      });
    
    console.log('\n📝 Breakdown by Content Type:');
    Object.entries(stats.byContentType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([contentType, count]) => {
        console.log(`   ${contentType}: ${count} (${((count / stats.totalOverrides) * 100).toFixed(1)}%)`);
      });
    
    console.log('\n🎛️ Breakdown by Method:');
    Object.entries(stats.byMethod)
      .sort((a, b) => b[1] - a[1])
      .forEach(([method, count]) => {
        console.log(`   ${method}: ${count} (${((count / stats.totalOverrides) * 100).toFixed(1)}%)`);
      });
    
    console.log('\n🕐 Recent Overrides:');
    stats.recentOverrides.forEach((override, index) => {
      const time = new Date(override.timestamp).toLocaleTimeString();
      console.log(`   ${index + 1}. ${time} - ${override.overrideModel} for ${override.contentType} (${override.path})`);
    });
  }
  
  return stats;
}

/**
 * Utility function to clear override tracking
 */
export function clearOverrideTracking() {
  if (global.overrideTracking) {
    global.overrideTracking = [];
  }
}

/**
 * Initialize override tracking
 */
export function initializeOverrideTracking() {
  if (!global.overrideTracking) {
    global.overrideTracking = [];
  }
}

// Initialize tracking on module load
initializeOverrideTracking();

export default modelOverrideMiddleware; 