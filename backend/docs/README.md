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