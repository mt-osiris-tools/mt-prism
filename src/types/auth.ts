/**
 * Authentication Credentials Types
 *
 * Defines credential discovery and management for LLM providers
 */

export interface AuthCredentials {
  /** Source of discovered credentials */
  source: 'env-var' | 'oauth' | 'env-file' | 'not-found';

  /** Anthropic API key (Claude) */
  anthropicApiKey?: string;

  /** OpenAI API key (GPT-4) */
  openaiApiKey?: string;

  /** Google API key (Gemini) */
  googleApiKey?: string;

  /** OAuth token expiration timestamp (ms since epoch) */
  expiresAt?: number;

  /** OAuth refresh token */
  refreshToken?: string;

  /** When credentials were discovered */
  discoveredAt: Date;
}
