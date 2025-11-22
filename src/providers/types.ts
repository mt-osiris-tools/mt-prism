import type { ZodSchema } from 'zod';

/**
 * Generation options for LLM requests
 */
export interface GenerateOptions {
  /** Temperature (0.0-1.0). Default: 0 for analysis tasks */
  temperature?: number;
  /** Maximum output tokens */
  maxTokens?: number;
  /** Override default model */
  model?: string;
  /** Stop sequences */
  stopSequences?: string[];
}

/**
 * Provider information and pricing
 */
export interface ProviderInfo {
  /** Provider name */
  name: 'Anthropic Claude' | 'OpenAI GPT-4' | 'Google Gemini';
  /** Specific model version */
  model: string;
  /** Cost per 1K input tokens (USD) */
  inputCostPer1K: number;
  /** Cost per 1K output tokens (USD) */
  outputCostPer1K: number;
}

/**
 * Unified interface for AI provider operations
 *
 * All skills must use this interface (never call provider SDKs directly).
 * Supports: Anthropic Claude, OpenAI GPT-4, Google Gemini
 */
export interface LLMProvider {
  /**
   * Generate text completion
   * @param prompt - The input prompt
   * @param options - Generation options
   * @returns Generated text
   */
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;

  /**
   * Stream text completion
   * @param prompt - The input prompt
   * @param options - Generation options
   * @returns Async generator of text chunks
   */
  streamText(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string>;

  /**
   * Generate structured output matching schema
   * @param prompt - The input prompt
   * @param schema - Zod schema for validation
   * @param options - Generation options
   * @returns Validated structured output
   */
  generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T>;

  /**
   * Get provider information
   * @returns Provider name, model, and pricing
   */
  getInfo(): ProviderInfo;

  /**
   * Estimate cost for request
   * @param inputTokens - Estimated input token count
   * @param outputTokens - Estimated output token count
   * @returns Estimated cost in USD
   */
  estimateCost(inputTokens: number, outputTokens: number): number;
}

/**
 * Provider configuration from environment
 */
export interface ProviderConfig {
  /** Selected provider */
  provider: 'anthropic' | 'openai' | 'google';
  /** API keys for each provider */
  apiKeys: {
    anthropic?: string;
    openai?: string;
    google?: string;
  };
  /** Optional model override */
  model?: string;
  /** Default temperature */
  temperature?: number;
  /** Default max tokens */
  maxTokens?: number;
}

/**
 * Provider fallback notification
 */
export interface ProviderFallbackEvent {
  /** Provider that failed */
  failedProvider: string;
  /** Reason for failure */
  reason: string;
  /** New active provider */
  activeProvider: string;
  /** Timestamp */
  timestamp: Date;
}
