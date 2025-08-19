# Task List: AI Model Optimization by Content Type

Based on PRD: prd-ai-model-optimization.md

## Relevant Files

- `backend/lib/openai.js` - Main OpenAI integration file containing all content generation functions (2320 lines)
- `backend/lib/modelConfig.js` - New file for model configuration management
- `backend/lib/modelConfig.test.js` - Unit tests for model configuration
- `backend/lib/logging.js` - New file for structured AI usage logging
- `backend/lib/logging.test.js` - Unit tests for logging utilities
- `backend/routes/plans.js` - Weekly plan generation routes that call story and activity generation
- `backend/routes/assessments.js` - Assessment generation routes that call assessment generation
- `backend/middleware/modelOverride.js` - New middleware for development model overrides
- `backend/.env.example` - Updated to show model override environment variables
- `package.json` - May need additional dependencies for logging

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Create Model Configuration System
  - [x] 1.1 Create `backend/lib/modelConfig.js` with content-type-specific model configurations
  - [x] 1.2 Implement model selection function that returns appropriate model based on content type
  - [x] 1.3 Add environment variable support for development model overrides
  - [x] 1.4 Create comprehensive unit tests for model configuration logic
  - [x] 1.5 Update `.env.example` with model override examples and documentation

- [x] 2.0 Implement Usage Logging and Monitoring Foundation
  - [x] 2.1 Create `backend/lib/logging.js` with structured logging utilities for AI requests
  - [x] 2.2 Implement logging functions that capture model, content type, token usage, and timing
  - [x] 2.3 Add cost tracking data structures for future analysis
  - [x] 2.4 Create unit tests for logging functionality
  - [x] 2.5 Integrate logging into existing OpenAI API calls without breaking functionality

- [x] 3.0 Update OpenAI Integration to Use Model Configuration
  - [x] 3.1 Modify `generateStory()` function to use GPT-4o via model configuration system
  - [x] 3.2 Modify `generateAssessment()` function to use GPT-4-turbo via model configuration system
  - [x] 3.3 Modify `generateComprehensionQuestions()`, `generateVocabularyActivities()`, and `generateGameAndCreativeActivities()` functions to use GPT-4-turbo
  - [x] 3.4 Add model logging to all OpenAI API calls throughout the file
  - [x] 3.5 Ensure fallback error handling works correctly with new model system

- [x] 4.0 Create Development Override Middleware
  - [x] 4.1 Create `backend/middleware/modelOverride.js` middleware for testing different models
  - [x] 4.2 Implement request-level model override capability via headers or query parameters
  - [x] 4.3 Add logging for when overrides are used
  - [x] 4.4 Integrate middleware into routes that use AI generation
  - [x] 4.5 Create documentation for developers on how to use model overrides

- [x] 5.0 Testing and Validation
  - [x] 5.1 Test all content generation functions with new model configurations
  - [x] 5.2 Verify logging data is captured correctly for each content type
  - [x] 5.3 Test model override functionality in development environment
  - [x] 5.4 Validate that existing functionality remains unchanged
  - [x] 5.5 Create integration tests for end-to-end model selection and logging