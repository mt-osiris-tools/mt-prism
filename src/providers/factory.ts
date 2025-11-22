import { config } from 'dotenv';
import type {
  LLMProvider,
  ProviderConfig,
  ProviderFallbackEvent,
} from './types.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { GoogleProvider } from './google.js';

// Load environment variables
config();

/**
 * Provider fallback chain order (per FR-054)
 * Claude → GPT-4 → Gemini
 */
const FALLBACK_CHAIN: Array<'anthropic' | 'openai' | 'google'> = [
  'anthropic',
  'openai',
  'google',
];

/**
 * Fallback notification callback
 */
export type FallbackNotifier = (event: ProviderFallbackEvent) => void;

/**
 * Load provider configuration from environment variables
 * @returns Provider configuration
 */
export function loadProviderConfig(): ProviderConfig {
  const provider = (process.env.AI_PROVIDER || 'anthropic') as
    | 'anthropic'
    | 'openai'
    | 'google';

  const apiKeys = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    google: process.env.GOOGLE_API_KEY,
  };

  return {
    provider,
    apiKeys,
    model: process.env.AI_MODEL,
    temperature: process.env.AI_TEMPERATURE
      ? parseFloat(process.env.AI_TEMPERATURE)
      : undefined,
    maxTokens: process.env.AI_MAX_TOKENS
      ? parseInt(process.env.AI_MAX_TOKENS, 10)
      : undefined,
  };
}

/**
 * Create LLM provider instance
 * @param providerName - Provider to create
 * @param config - Provider configuration
 * @returns LLM provider instance
 * @throws Error if API key is missing
 */
function createProviderInstance(
  providerName: 'anthropic' | 'openai' | 'google',
  config: ProviderConfig
): LLMProvider {
  const apiKey = config.apiKeys[providerName];

  if (!apiKey) {
    throw new Error(
      `API key for ${providerName} not found in environment. Please set ${providerName.toUpperCase()}_API_KEY in .env file.`
    );
  }

  switch (providerName) {
    case 'anthropic':
      return new AnthropicProvider(apiKey, config.model);
    case 'openai':
      return new OpenAIProvider(apiKey, config.model);
    case 'google':
      return new GoogleProvider(apiKey, config.model);
  }
}

/**
 * Determine if an error is transient (retry-able) or permanent
 * Per FR-056: Fallback for transient failures, not authentication errors
 */
function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  // Authentication errors are permanent
  if (
    message.includes('authentication') ||
    message.includes('unauthorized') ||
    message.includes('invalid api key') ||
    message.includes('api key not found')
  ) {
    return false;
  }

  // Rate limits and timeouts are transient
  if (
    message.includes('rate limit') ||
    message.includes('quota') ||
    message.includes('timeout') ||
    message.includes('temporarily unavailable') ||
    message.includes('503') ||
    message.includes('429')
  ) {
    return true;
  }

  return false;
}

/**
 * Create LLM provider with automatic fallback chain (FR-054, FR-055)
 *
 * Attempts providers in order: Claude → GPT-4 → Gemini
 * Notifies user when fallback occurs
 *
 * @param onFallback - Optional callback for fallback notifications
 * @returns LLM provider instance
 * @throws Error if no provider is available
 */
export async function createLLMProvider(
  onFallback?: FallbackNotifier
): Promise<LLMProvider> {
  const config = loadProviderConfig();

  // Get fallback chain starting with configured provider
  const providerIndex = FALLBACK_CHAIN.indexOf(config.provider);
  const orderedProviders = [
    ...FALLBACK_CHAIN.slice(providerIndex),
    ...FALLBACK_CHAIN.slice(0, providerIndex),
  ];

  let lastError: Error | undefined;

  for (const providerName of orderedProviders) {
    // Skip if no API key available
    if (!config.apiKeys[providerName]) {
      continue;
    }

    try {
      const provider = createProviderInstance(providerName, config);

      // Test provider with simple request
      await provider.generateText('test', { maxTokens: 1 });

      // Notify if this isn't the primary provider (fallback occurred)
      if (providerName !== config.provider && onFallback) {
        onFallback({
          failedProvider: config.provider,
          reason: lastError?.message || 'Unknown error',
          activeProvider: providerName,
          timestamp: new Date(),
        });
      }

      return provider;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only continue fallback chain for transient errors
      if (!isTransientError(error)) {
        throw new Error(
          `Permanent error with ${providerName}: ${lastError.message}. Please check your API key and try again.`
        );
      }

      // Continue to next provider in fallback chain
      continue;
    }
  }

  // All providers failed
  throw new Error(
    `All AI providers failed. Last error: ${lastError?.message}. Please check your API keys in .env file and ensure at least one provider is configured.`
  );
}

/**
 * Create provider with fallback and console notification (default behavior)
 */
export async function createLLMProviderWithNotification(): Promise<LLMProvider> {
  return createLLMProvider((event) => {
    console.warn(
      `⚠️  Provider fallback: ${event.failedProvider} failed (${event.reason}). Now using ${event.activeProvider}.`
    );
  });
}
