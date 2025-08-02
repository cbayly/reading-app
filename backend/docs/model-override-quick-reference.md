# Model Override Quick Reference

## Quick Commands

### Basic Overrides

```bash
# Override all models to GPT-4o
curl -H "X-Model-Override: gpt-4o" http://localhost:3000/api/assessments

# Override via query parameter
curl "http://localhost:3000/api/assessments?model=gpt-4-turbo"

# Content-type specific override
curl -H 'X-Model-Override: {"story_creation":"gpt-4o"}' http://localhost:3000/api/plans/generate
```

### Assessment Generation

```bash
# Generate assessment with GPT-4o
curl -H "X-Model-Override: gpt-4o" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/assessments
```

### Story Generation

```bash
# Generate story with GPT-4o
curl -H "X-Model-Override: gpt-4o" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/plans/generate
```

### Activity Generation

```bash
# Generate activity with GPT-4-turbo
curl -H "X-Model-Override: gpt-4-turbo" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"planId": 1, "dayOfWeek": 1}' \
  http://localhost:3000/api/plans/activity/generate
```

## Supported Models

| Model | Best For | Cost |
|-------|----------|------|
| `gpt-4o` | Creative content, stories | High |
| `gpt-4-turbo` | Structured content, assessments | Medium |
| `gpt-3.5-turbo` | Testing, cost optimization | Low |

## Content Types

- `story_creation` - 3-chapter stories
- `assessment_creation` - Reading passages & questions
- `daily_task_generation` - Daily activities

## Environment Variables

```bash
# Development (overrides enabled)
NODE_ENV=development

# Production (overrides disabled)
NODE_ENV=production

# Explicitly disable overrides
DISABLE_MODEL_OVERRIDES=true

# Enable file logging
LOG_MODEL_OVERRIDES=true
```

## Common Patterns

### Model Comparison Testing

```bash
# Test with default model
curl -X POST -d '{"studentId": 1}' http://localhost:3000/api/assessments

# Test with GPT-4o
curl -H "X-Model-Override: gpt-4o" -X POST -d '{"studentId": 1}' http://localhost:3000/api/assessments

# Test with GPT-4-turbo
curl -H "X-Model-Override: gpt-4-turbo" -X POST -d '{"studentId": 1}' http://localhost:3000/api/assessments
```

### Cost Optimization

```bash
# Use GPT-3.5-turbo for testing
curl -H "X-Model-Override: gpt-3.5-turbo" \
  -X POST \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/assessments
```

### Mixed Content Types

```bash
# Different models for different content types
curl -H 'X-Model-Override: {"story_creation":"gpt-4o","assessment_creation":"gpt-4-turbo"}' \
  -X POST \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/plans/generate
```

## Debug Commands

```bash
# Check override statistics
node -e "import('./middleware/modelOverride.js').then(m => console.log(m.getOverrideStats()))"

# Generate detailed report
node -e "import('./middleware/modelOverride.js').then(m => m.getOverrideReport())"

# Clear tracking data
node -e "import('./middleware/modelOverride.js').then(m => m.clearOverrideTracking())"

# Run demonstration
node scripts/demo-model-override.js
```

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Override not applied` | Production environment | Use development environment |
| `Invalid model` | Unsupported model name | Use: gpt-4o, gpt-4-turbo, gpt-3.5-turbo |
| `Malformed JSON` | Invalid JSON in header | Check JSON syntax |

## Priority Order

1. **Header override** (`X-Model-Override`)
2. **Query parameter** (`?model=`)
3. **Default configuration**

## Frontend Integration

```javascript
// Add override to fetch request
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
```

---

**Remember**: Overrides are disabled in production for security and cost control. 