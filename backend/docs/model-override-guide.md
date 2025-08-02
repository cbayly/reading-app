# Model Override Middleware Developer Guide

## Overview

The Model Override Middleware provides request-level model override capability for development and testing. It allows developers to override AI models via headers or query parameters without modifying code or environment variables.

## Features

- **Header-based overrides** (`X-Model-Override`)
- **Query parameter overrides** (`?model=`)
- **Content-type specific overrides** (JSON format)
- **Environment restrictions** (production safety)
- **Comprehensive logging** and statistics
- **Validation** and error handling

## Quick Start

### Basic Usage

```bash
# Override all AI models for a request
curl -H "X-Model-Override: gpt-4o" http://localhost:3000/api/assessments

# Override via query parameter
curl "http://localhost:3000/api/assessments?model=gpt-4-turbo"

# Content-type specific override
curl -H 'X-Model-Override: {"story_creation":"gpt-4o","assessment_creation":"gpt-4-turbo"}' http://localhost:3000/api/plans/generate
```

## Supported Models

| Model | Use Case | Default Content Type |
|-------|----------|---------------------|
| `gpt-4o` | Creative content, stories | Story Creation |
| `gpt-4-turbo` | Structured content, assessments | Assessment Creation, Daily Tasks |
| `gpt-3.5-turbo` | Fallback, cost optimization | All (fallback) |

## Content Types

The system supports different content types with specific model configurations:

- **`story_creation`**: 3-chapter short stories
- **`assessment_creation`**: Reading passages and comprehension questions
- **`daily_task_generation`**: Daily activities and vocabulary exercises

## Override Methods

### 1. Header Override (Recommended)

#### Simple String Override
```bash
# Override all content types to use GPT-4o
curl -H "X-Model-Override: gpt-4o" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/assessments
```

#### JSON Object Override
```bash
# Override specific content types
curl -H 'X-Model-Override: {"story_creation":"gpt-4o","assessment_creation":"gpt-4-turbo","daily_task_generation":"gpt-3.5-turbo"}' \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/plans/generate
```

### 2. Query Parameter Override

```bash
# Override via query parameter (applies to all content types)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"studentId": 1}' \
  "http://localhost:3000/api/assessments?model=gpt-4o"
```

### 3. Priority Order

1. **Header override** (highest priority)
2. **Query parameter override** (if no header)
3. **Default model configuration** (if no override)

## API Endpoints

### Assessment Generation

```bash
# Generate assessment with model override
curl -H "X-Model-Override: gpt-4o" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/assessments
```

### Weekly Plan Generation

```bash
# Generate story with model override
curl -H "X-Model-Override: gpt-4o" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/plans/generate
```

### Daily Activity Generation

```bash
# Generate daily activity with model override
curl -H "X-Model-Override: gpt-4-turbo" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"planId": 1, "dayOfWeek": 1}' \
  http://localhost:3000/api/plans/activity/generate
```

## Environment Configuration

### Development Environment

Overrides are enabled by default in development:

```bash
# Overrides enabled (default)
NODE_ENV=development

# Explicitly enable overrides
DISABLE_MODEL_OVERRIDES=false
```

### Production Environment

Overrides are automatically disabled in production:

```bash
# Overrides disabled (automatic)
NODE_ENV=production

# Explicitly disable overrides
DISABLE_MODEL_OVERRIDES=true
```

### Logging Configuration

```bash
# Enable file logging for overrides
LOG_MODEL_OVERRIDES=true

# Custom log file location
OVERRIDE_LOG_FILE=./logs/model-overrides.log
```

## Validation and Error Handling

### Valid Override Formats

```bash
# ✅ Valid - Simple string
X-Model-Override: gpt-4o

# ✅ Valid - JSON object
X-Model-Override: {"story_creation":"gpt-4o"}

# ❌ Invalid - Unsupported model
X-Model-Override: unsupported-model

# ❌ Invalid - Malformed JSON
X-Model-Override: {invalid-json}
```

### Error Responses

```json
{
  "error": "Invalid model override: Model 'unsupported-model' is not supported",
  "status": 400
}
```

## Monitoring and Statistics

### Console Logging

The middleware provides rich console output:

```
🔧 Model Override Applied: {
  📅 Timestamp: 2024-01-15T10:30:00.000Z,
  🌐 Request: POST /api/assessments,
  📝 Content Type: assessment_creation,
  🔄 Model Change: gpt-4-turbo → gpt-4o,
  🎛️ Override Method: header,
  💻 User Agent: curl/7.68.0...,
  📍 IP Address: 127.0.0.1
}
```

### Statistics API

```javascript
import { getOverrideStats, getOverrideReport } from '../middleware/modelOverride.js';

// Get override statistics
const stats = getOverrideStats();
console.log(stats);

// Generate detailed report
getOverrideReport();
```

### Statistics Output

```
📊 Model Override Report
==================================================
📈 Total Overrides: 15

📅 Summary:
   First Override: 2024-01-15T09:00:00.000Z
   Last Override: 2024-01-15T10:30:00.000Z
   Time Span: 1 hours
   Average Per Hour: 15.00

🏆 Most Used:
   Model: gpt-4o
   Content Type: story_creation
   Path: /api/plans/generate

📊 Breakdown by Model:
   gpt-4o: 10 (66.7%)
   gpt-4-turbo: 5 (33.3%)

📝 Breakdown by Content Type:
   story_creation: 8 (53.3%)
   assessment_creation: 4 (26.7%)
   daily_task_generation: 3 (20.0%)
```

## Testing Scenarios

### 1. Model Comparison Testing

```bash
# Test GPT-4o for story generation
curl -H "X-Model-Override: gpt-4o" \
  -X POST \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/plans/generate

# Test GPT-4-turbo for story generation
curl -H "X-Model-Override: gpt-4-turbo" \
  -X POST \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/plans/generate
```

### 2. Content Type Specific Testing

```bash
# Test different models for different content types
curl -H 'X-Model-Override: {"story_creation":"gpt-4o","assessment_creation":"gpt-4-turbo"}' \
  -X POST \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/plans/generate
```

### 3. Fallback Testing

```bash
# Test fallback to GPT-3.5-turbo
curl -H "X-Model-Override: gpt-3.5-turbo" \
  -X POST \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/assessments
```

## Integration Examples

### Frontend Integration

```javascript
// React component with model override
const generateAssessment = async (studentId, modelOverride = null) => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  if (modelOverride) {
    headers['X-Model-Override'] = modelOverride;
  }
  
  const response = await fetch('/api/assessments', {
    method: 'POST',
    headers,
    body: JSON.stringify({ studentId })
  });
  
  return response.json();
};

// Usage
await generateAssessment(1, 'gpt-4o');
await generateAssessment(1, '{"story_creation":"gpt-4o"}');
```

### Testing Framework Integration

```javascript
// Jest test with model override
describe('Assessment Generation', () => {
  test('should generate assessment with GPT-4o', async () => {
    const response = await request(app)
      .post('/api/assessments')
      .set('X-Model-Override', 'gpt-4o')
      .send({ studentId: 1 });
    
    expect(response.status).toBe(201);
    expect(response.body.assessment).toBeDefined();
  });
  
  test('should generate assessment with content-type specific override', async () => {
    const response = await request(app)
      .post('/api/assessments')
      .set('X-Model-Override', JSON.stringify({
        'assessment_creation': 'gpt-4o'
      }))
      .send({ studentId: 1 });
    
    expect(response.status).toBe(201);
  });
});
```

## Best Practices

### 1. Development Workflow

```bash
# 1. Test with default models first
curl -X POST -d '{"studentId": 1}' http://localhost:3000/api/assessments

# 2. Test with specific model override
curl -H "X-Model-Override: gpt-4o" -X POST -d '{"studentId": 1}' http://localhost:3000/api/assessments

# 3. Compare outputs and performance
```

### 2. Content Type Selection

- **Story Creation**: Use `gpt-4o` for creative, engaging content
- **Assessment Creation**: Use `gpt-4-turbo` for structured, consistent output
- **Daily Tasks**: Use `gpt-4-turbo` for varied, educational activities

### 3. Cost Optimization

```bash
# Use GPT-3.5-turbo for cost-sensitive testing
curl -H "X-Model-Override: gpt-3.5-turbo" \
  -X POST \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/assessments
```

### 4. Production Safety

- Overrides are automatically disabled in production
- Use `DISABLE_MODEL_OVERRIDES=true` for explicit control
- Monitor override usage in development

## Troubleshooting

### Common Issues

1. **Override not applied**
   - Check `NODE_ENV` is not 'production'
   - Verify `DISABLE_MODEL_OVERRIDES` is not 'true'
   - Ensure header format is correct

2. **Invalid model error**
   - Verify model name is supported
   - Check JSON format for content-type specific overrides

3. **No logging output**
   - Check console for override logs
   - Verify `LOG_MODEL_OVERRIDES=true` for file logging

### Debug Commands

```bash
# Check override statistics
node -e "import('./middleware/modelOverride.js').then(m => console.log(m.getOverrideStats()))"

# Clear override tracking
node -e "import('./middleware/modelOverride.js').then(m => m.clearOverrideTracking())"

# Test middleware directly
node scripts/demo-model-override.js
```

## API Reference

### Middleware Functions

```javascript
import {
  modelOverrideMiddleware,
  getModelConfigWithOverride,
  getOverrideStats,
  getOverrideReport,
  clearOverrideTracking
} from '../middleware/modelOverride.js';
```

### Configuration Options

```javascript
const middleware = modelOverrideMiddleware({
  method: 'both',        // 'header', 'query', or 'both'
  strict: false,         // Reject invalid overrides
  logging: true          // Enable override logging
});
```

## Support

For questions or issues with model overrides:

1. Check this documentation
2. Review console logs for error messages
3. Test with the demonstration script
4. Check override statistics for usage patterns

---

**Note**: Model overrides are intended for development and testing purposes. They are automatically disabled in production environments for security and cost control. 