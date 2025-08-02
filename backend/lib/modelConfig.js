/**
 * AI Model Configuration System
 * 
 * This module manages content-type-specific AI model selection for the reading app.
 * It provides a centralized way to configure which AI model to use for different
 * types of content generation, with support for development overrides.
 */

// Content type constants
export const CONTENT_TYPES = {
  STORY_CREATION: 'story_creation',
  ASSESSMENT_CREATION: 'assessment_creation',
  DAILY_TASK_GENERATION: 'daily_task_generation'
};

// Model constants
export const MODELS = {
  GPT_4O: 'gpt-4o',
  GPT_4_TURBO: 'gpt-4-turbo'
};

// Default model configuration per content type
const DEFAULT_MODEL_CONFIG = {
  [CONTENT_TYPES.STORY_CREATION]: {
    model: MODELS.GPT_4O,
    reasoning: 'GPT-4o excels at creative and coherent narrative generation, providing engaging, high-quality stories with excellent contextual understanding.',
    temperature: 0.7,
    maxTokens: 4000
  },
  [CONTENT_TYPES.ASSESSMENT_CREATION]: {
    model: MODELS.GPT_4_TURBO,
    reasoning: 'GPT-4-turbo provides precise control, consistent output, and faster responses, ideal for structured content generation like assessments.',
    temperature: 0.7,
    maxTokens: 3000
  },
  [CONTENT_TYPES.DAILY_TASK_GENERATION]: {
    model: MODELS.GPT_4_TURBO,
    reasoning: 'GPT-4-turbo efficiently handles structured and repetitive content generation tasks with speed and consistency.',
    temperature: 0.7,
    maxTokens: 2000
  }
};

// Development override configuration
const getDevelopmentOverrides = () => {
  const overrides = {};
  
  // Check for environment variable overrides with validation
  const overrideEnvVars = {
    [CONTENT_TYPES.STORY_CREATION]: 'OVERRIDE_STORY_MODEL',
    [CONTENT_TYPES.ASSESSMENT_CREATION]: 'OVERRIDE_ASSESSMENT_MODEL',
    [CONTENT_TYPES.DAILY_TASK_GENERATION]: 'OVERRIDE_DAILY_TASK_MODEL'
  };
  
  Object.entries(overrideEnvVars).forEach(([contentType, envVar]) => {
    const overrideModel = process.env[envVar];
    if (overrideModel) {
      // Validate the override model is supported
      if (!isModelSupported(overrideModel)) {
        console.warn(`⚠️ Invalid override model for ${contentType}: ${overrideModel}. Using default.`);
        return;
      }
      
      overrides[contentType] = {
        model: overrideModel,
        reason: `Environment variable override (${envVar})`,
        envVar
      };
    }
  });
  
  return overrides;
};

/**
 * Sets a model override for development/testing purposes
 * @param {string} contentType - The content type to override
 * @param {string} modelName - The model to use instead
 * @param {string} reason - Optional reason for the override
 */
export function setModelOverride(contentType, modelName, reason = 'Manual override') {
  if (!Object.values(CONTENT_TYPES).includes(contentType)) {
    throw new Error(`Invalid content type: ${contentType}`);
  }
  
  if (!isModelSupported(modelName)) {
    throw new Error(`Unsupported model: ${modelName}`);
  }
  
  // Set environment variable for this session
  const envVarMap = {
    [CONTENT_TYPES.STORY_CREATION]: 'OVERRIDE_STORY_MODEL',
    [CONTENT_TYPES.ASSESSMENT_CREATION]: 'OVERRIDE_ASSESSMENT_MODEL',
    [CONTENT_TYPES.DAILY_TASK_GENERATION]: 'OVERRIDE_DAILY_TASK_MODEL'
  };
  
  const envVar = envVarMap[contentType];
  if (envVar) {
    process.env[envVar] = modelName;
    console.log(`🔧 Set model override for ${contentType}: ${modelName} (${reason})`);
  }
}

/**
 * Clears all model overrides
 */
export function clearModelOverrides() {
  const envVars = [
    'OVERRIDE_STORY_MODEL',
    'OVERRIDE_ASSESSMENT_MODEL',
    'OVERRIDE_DAILY_TASK_MODEL'
  ];
  
  envVars.forEach(envVar => {
    if (process.env[envVar]) {
      delete process.env[envVar];
    }
  });
  
  console.log('🧹 Cleared all model overrides');
}

/**
 * Gets the current override status for all content types
 * @returns {object} - Override status for each content type
 */
export function getOverrideStatus() {
  const overrides = getDevelopmentOverrides();
  const status = {};
  
  Object.values(CONTENT_TYPES).forEach(contentType => {
    const override = overrides[contentType];
    status[contentType] = {
      isOverridden: !!override,
      overrideModel: override?.model || null,
      overrideReason: override?.reason || null,
      defaultModel: DEFAULT_MODEL_CONFIG[contentType].model
    };
  });
  
  return status;
}

/**
 * Gets the appropriate model configuration for a given content type
 * @param {string} contentType - The type of content being generated
 * @returns {object} - Model configuration object
 */
export function getModelConfig(contentType) {
  if (!CONTENT_TYPES[contentType] && !Object.values(CONTENT_TYPES).includes(contentType)) {
    throw new Error(`Invalid content type: ${contentType}. Valid types: ${Object.values(CONTENT_TYPES).join(', ')}`);
  }
  
  const defaultConfig = DEFAULT_MODEL_CONFIG[contentType];
  const overrides = getDevelopmentOverrides();
  const override = overrides[contentType];
  
  if (override) {
    console.log(`🔧 Using model override for ${contentType}: ${override.model} (${override.reason})`);
    return {
      ...defaultConfig,
      model: override.model,
      isOverride: true,
      overrideReason: override.reason
    };
  }
  
  return {
    ...defaultConfig,
    isOverride: false
  };
}

/**
 * Gets the model name for a given content type
 * @param {string} contentType - The type of content being generated
 * @returns {string} - The model name to use
 */
export function getModelForContentType(contentType) {
  const config = getModelConfig(contentType);
  return config.model;
}

/**
 * Enhanced model selection function with validation and fallback
 * @param {string} contentType - The type of content being generated
 * @param {object} options - Optional parameters for model selection
 * @param {string} options.fallbackModel - Fallback model if primary model fails
 * @param {boolean} options.allowOverride - Whether to allow development overrides
 * @returns {object} - Model configuration with metadata
 */
export function selectModelForContentType(contentType, options = {}) {
  const { fallbackModel, allowOverride = true } = options;
  
  try {
    const config = getModelConfig(contentType);
    
    // Validate the selected model is supported
    if (!isModelSupported(config.model)) {
      throw new Error(`Unsupported model: ${config.model}`);
    }
    
    // Check if override is being used and if it's allowed
    if (config.isOverride && !allowOverride) {
      throw new Error(`Model override not allowed for ${contentType}`);
    }
    
    return {
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      isOverride: config.isOverride,
      overrideReason: config.overrideReason,
      contentType,
      reasoning: config.reasoning,
      fallbackModel: fallbackModel || config.model // Use same model as fallback if not specified
    };
  } catch (error) {
    // If fallback model is provided and different from current, try it
    if (fallbackModel && fallbackModel !== config?.model) {
      console.warn(`⚠️ Primary model selection failed for ${contentType}, trying fallback: ${fallbackModel}`);
      
      if (!isModelSupported(fallbackModel)) {
        throw new Error(`Both primary and fallback models are unsupported: ${config?.model}, ${fallbackModel}`);
      }
      
      return {
        model: fallbackModel,
        temperature: 0.7, // Default temperature
        maxTokens: 3000, // Default max tokens
        isOverride: false,
        overrideReason: null,
        contentType,
        reasoning: 'Fallback model due to primary model failure',
        fallbackModel: fallbackModel
      };
    }
    
    throw error;
  }
}

/**
 * Gets all model configurations (useful for debugging and monitoring)
 * @returns {object} - All model configurations with override status
 */
export function getAllModelConfigs() {
  const configs = {};
  const overrides = getDevelopmentOverrides();
  
  Object.values(CONTENT_TYPES).forEach(contentType => {
    const defaultConfig = DEFAULT_MODEL_CONFIG[contentType];
    const override = overrides[contentType];
    
    configs[contentType] = {
      ...defaultConfig,
      isOverride: !!override,
      overrideReason: override?.reason || null,
      effectiveModel: override?.model || defaultConfig.model
    };
  });
  
  return configs;
}

/**
 * Validates that a model name is supported
 * @param {string} modelName - The model name to validate
 * @returns {boolean} - True if the model is supported
 */
export function isModelSupported(modelName) {
  return Object.values(MODELS).includes(modelName);
}

/**
 * Gets a human-readable description of the model configuration
 * @param {string} contentType - The content type
 * @returns {string} - Human-readable description
 */
export function getModelDescription(contentType) {
  const config = getModelConfig(contentType);
  const overrideText = config.isOverride ? ` (OVERRIDE: ${config.overrideReason})` : '';
  
  return `${contentType}: ${config.model}${overrideText} - ${config.reasoning}`;
}

/**
 * Logs the current model configuration (useful for debugging)
 */
export function logModelConfiguration() {
  console.log('🤖 Current AI Model Configuration:');
  console.log('=====================================');
  
  Object.values(CONTENT_TYPES).forEach(contentType => {
    const description = getModelDescription(contentType);
    console.log(`• ${description}`);
  });
  
  const overrides = getDevelopmentOverrides();
  if (Object.keys(overrides).length > 0) {
    console.log('\n🔧 Active Overrides:');
    Object.entries(overrides).forEach(([contentType, override]) => {
      console.log(`• ${contentType}: ${override.model} (${override.reason})`);
    });
  }
  
  console.log('=====================================');
} 