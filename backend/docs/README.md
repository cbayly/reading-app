# Backend Documentation

This directory contains comprehensive documentation for the Reading App backend.

## Documentation Index

### AI Model Optimization

- **[Model Override Guide](./model-override-guide.md)** - Complete guide to using model overrides for development and testing
- **[Model Override Quick Reference](./model-override-quick-reference.md)** - Quick reference card for common commands

### API Documentation

- **Routes**: See individual route files in `../routes/` for API endpoint documentation
- **Middleware**: See individual middleware files in `../middleware/` for middleware documentation

## Quick Start

### Model Overrides

The model override system allows you to test different AI models during development:

```bash
# Test GPT-4o for story generation
curl -H "X-Model-Override: gpt-4o" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/plans/generate

# Test GPT-4-turbo for assessments
curl -H "X-Model-Override: gpt-4-turbo" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"studentId": 1}' \
  http://localhost:3000/api/assessments
```

### Environment Setup

```bash
# Development environment (overrides enabled)
NODE_ENV=development

# Production environment (overrides disabled)
NODE_ENV=production

# Enable override logging
LOG_MODEL_OVERRIDES=true
```

## Key Features

### AI Model Management

- **Dynamic Model Selection**: Choose AI models based on content type
- **Request-Level Overrides**: Override models via headers or query parameters
- **Environment Safety**: Automatic disable in production
- **Comprehensive Logging**: Track model usage and performance

### Scoring Logic v2 (Feature Flag)

- **Flag**: `SCORE_V2_ENABLED` (default: false)
- **Tunables**:
  - `FLUENCY_CAP` (default: 150)
  - `ACCURACY_HARD_FLOOR` (optional integer percent, e.g., 93)
- **Notes**:
  - When enabled, assessment submission uses floors per PRD to assign labels
  - API response fields remain unchanged
  - Structured scoring logs are emitted to console for observability
  - Minimal rollout counters summarize label distribution for v1/v2

Example env block:

```env
# Scoring Logic v2
SCORE_V2_ENABLED=false
FLUENCY_CAP=150
# ACCURACY_HARD_FLOOR=93
```

#### Flag control instructions

- Toggle at runtime via environment variable `SCORE_V2_ENABLED` (string `"true"`/`"false"`).
- For one-off local runs:

```bash
SCORE_V2_ENABLED=true npm start
```

- For tests inside this repo, integration tests set the env variable directly to validate on/off behavior.

#### Monitoring checklist

- Confirm console emits `📏 Scoring Metrics` entries on each submission with fields: flag, F, C, Composite, label, floors, capEngaged, accuracyHardFloorApplied.
- Observe periodic `📈 Scoring Summary (rollout counters)` logs (every 10 events) to review label distribution by v1 vs v2.
- Spot check for unexpected spikes in `Below` or `Above` labels after enabling v2.
- Validate average composite and label distribution over a day looks reasonable vs. prior runs.

#### Rollback steps

1. Set `SCORE_V2_ENABLED=false` and redeploy.
2. No schema or API changes are required; v1 and v2 return identical fields.
3. Continue to monitor `📏 Scoring Metrics` to confirm v1 is active (`useV2:false`).

### Content Generation

- **Story Creation**: 3-chapter short stories with GPT-4o
- **Assessment Creation**: Reading passages and questions with GPT-4-turbo
- **Daily Activities**: Vocabulary and comprehension exercises with GPT-4-turbo

### Development Tools

- **Model Override Middleware**: Test different models easily
- **Statistics and Monitoring**: Track override usage and performance
- **Validation and Error Handling**: Robust error handling for invalid overrides

## Getting Help

1. **Start with the Quick Reference**: [Model Override Quick Reference](./model-override-quick-reference.md)
2. **Read the Full Guide**: [Model Override Guide](./model-override-guide.md)
3. **Check the Code**: See implementation in `../middleware/modelOverride.js`
4. **Run the Demo**: `node scripts/demo-model-override.js`

## Contributing

When adding new features or documentation:

1. Update relevant documentation files
2. Add examples and usage patterns
3. Include error handling and troubleshooting
4. Test with the demonstration scripts

---

For questions or issues, check the troubleshooting sections in the documentation or review the console logs for error messages. 