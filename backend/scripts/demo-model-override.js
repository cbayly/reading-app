#!/usr/bin/env node

/**
 * Model Override Middleware Demonstration
 * 
 * This script demonstrates the model override middleware functionality
 * including header-based and query parameter overrides, logging, and statistics.
 */

import { 
  modelOverrideMiddleware, 
  getOverrideStats, 
  getOverrideReport,
  clearOverrideTracking 
} from '../middleware/modelOverride.js';

// Mock Express request/response objects for demonstration
function createMockRequest(options = {}) {
  return {
    method: options.method || 'POST',
    path: options.path || '/api/assessments',
    get: jest.fn().mockReturnValue(options.header || null),
    query: options.query || {},
    ip: options.ip || '127.0.0.1'
  };
}

function createMockResponse() {
  return {};
}

function createMockNext() {
  return jest.fn();
}

// Mock the modelConfig module for demonstration
jest.mock('../lib/modelConfig.js', () => ({
  getModelConfig: jest.fn().mockReturnValue({
    model: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 3000,
    reasoning: 'Default model configuration'
  }),
  isModelSupported: jest.fn().mockReturnValue(true),
  getOverrideStatus: jest.fn().mockReturnValue({}),
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

console.log('🚀 Model Override Middleware Demonstration');
console.log('='.repeat(60));

// Clear any existing override tracking
clearOverrideTracking();

// Create middleware instance
const middleware = modelOverrideMiddleware({
  method: 'both',
  strict: false,
  logging: true
});

// Demonstration scenarios
const scenarios = [
  {
    name: 'Header-based override (simple string)',
    request: createMockRequest({
      header: 'gpt-4o',
      path: '/api/stories'
    })
  },
  {
    name: 'Header-based override (JSON object)',
    request: createMockRequest({
      header: JSON.stringify({
        'story_creation': 'gpt-4o',
        'assessment_creation': 'gpt-4-turbo',
        'daily_task_generation': 'gpt-3.5-turbo'
      }),
      path: '/api/assessments'
    })
  },
  {
    name: 'Query parameter override',
    request: createMockRequest({
      query: { model: 'gpt-3.5-turbo' },
      path: '/api/daily-tasks'
    })
  },
  {
    name: 'Both header and query (header takes precedence)',
    request: createMockRequest({
      header: 'gpt-4o',
      query: { model: 'gpt-4-turbo' },
      path: '/api/stories'
    })
  },
  {
    name: 'No override (normal request)',
    request: createMockRequest({
      path: '/api/assessments'
    })
  }
];

// Run demonstration scenarios
scenarios.forEach((scenario, index) => {
  console.log(`\n📋 Scenario ${index + 1}: ${scenario.name}`);
  console.log('-'.repeat(40));
  
  const mockRes = createMockResponse();
  const mockNext = createMockNext();
  
  // Apply middleware
  middleware(scenario.request, mockRes, mockNext);
  
  // Check if override was applied
  if (scenario.request.modelOverride) {
    console.log('✅ Override detected:');
    console.log(`   Method: ${scenario.request.modelOverride.method}`);
    console.log(`   Value: ${JSON.stringify(scenario.request.modelOverride.value)}`);
    console.log(`   Timestamp: ${scenario.request.modelOverride.timestamp}`);
    
    // Demonstrate applying the override
    if (scenario.request.applyModelOverride) {
      const originalConfig = {
        model: 'gpt-4-turbo',
        temperature: 0.7,
        maxTokens: 3000
      };
      
      const overrideConfig = scenario.request.applyModelOverride('story_creation', originalConfig);
      
      console.log('🔄 Model configuration after override:');
      console.log(`   Model: ${overrideConfig.model} (was ${originalConfig.model})`);
      console.log(`   Is Override: ${overrideConfig.isOverride}`);
      console.log(`   Override Reason: ${overrideConfig.overrideReason}`);
      console.log(`   Override Source: ${overrideConfig.overrideSource}`);
    }
  } else {
    console.log('❌ No override detected');
  }
  
  console.log(`   Next called: ${mockNext.mock.calls.length > 0 ? 'Yes' : 'No'}`);
});

// Show override statistics
console.log('\n📊 Override Statistics Report');
console.log('='.repeat(60));

const stats = getOverrideStats();
console.log(`Total Overrides: ${stats.totalOverrides}`);

if (stats.totalOverrides > 0) {
  console.log('\nBreakdown by Model:');
  Object.entries(stats.byModel).forEach(([model, count]) => {
    console.log(`  ${model}: ${count}`);
  });
  
  console.log('\nBreakdown by Content Type:');
  Object.entries(stats.byContentType).forEach(([contentType, count]) => {
    console.log(`  ${contentType}: ${count}`);
  });
  
  console.log('\nBreakdown by Method:');
  Object.entries(stats.byMethod).forEach(([method, count]) => {
    console.log(`  ${method}: ${count}`);
  });
  
  console.log('\nRecent Overrides:');
  stats.recentOverrides.forEach((override, index) => {
    const time = new Date(override.timestamp).toLocaleTimeString();
    console.log(`  ${index + 1}. ${time} - ${override.overrideModel} for ${override.contentType}`);
  });
}

// Demonstrate detailed report
console.log('\n📈 Detailed Override Report');
console.log('='.repeat(60));
getOverrideReport();

// Environment restrictions demonstration
console.log('\n🔒 Environment Restrictions Demo');
console.log('='.repeat(60));

// Test production environment
process.env.NODE_ENV = 'production';
const prodRequest = createMockRequest({ header: 'gpt-4o' });
const prodRes = createMockResponse();
const prodNext = createMockNext();

middleware(prodRequest, prodRes, prodNext);

console.log('Production environment:');
console.log(`  Override allowed: ${prodRequest.modelOverride ? 'Yes' : 'No'}`);
console.log(`  Next called: ${prodNext.mock.calls.length > 0 ? 'Yes' : 'No'}`);

// Test disabled overrides
process.env.NODE_ENV = 'development';
process.env.DISABLE_MODEL_OVERRIDES = 'true';
const disabledRequest = createMockRequest({ header: 'gpt-4o' });
const disabledRes = createMockResponse();
const disabledNext = createMockNext();

middleware(disabledRequest, disabledRes, disabledNext);

console.log('\nDisabled overrides:');
console.log(`  Override allowed: ${disabledRequest.modelOverride ? 'Yes' : 'No'}`);
console.log(`  Next called: ${disabledNext.mock.calls.length > 0 ? 'Yes' : 'No'}`);

// Reset environment
process.env.NODE_ENV = 'development';
process.env.DISABLE_MODEL_OVERRIDES = undefined;

console.log('\n✅ Demonstration completed!');
console.log('\n💡 Usage Examples:');
console.log('  curl -H "X-Model-Override: gpt-4o" http://localhost:3000/api/assessments');
console.log('  curl "http://localhost:3000/api/stories?model=gpt-4-turbo"');
console.log('  curl -H \'X-Model-Override: {"story_creation":"gpt-4o","assessment_creation":"gpt-4-turbo"}\' http://localhost:3000/api/stories'); 