/**
 * Provider Factory Extension Contract
 *
 * Extends existing createLLMProvider() to support agent-based provider selection.
 * This is a design contract, not executable code.
 */

import type { LLMProvider } from '../../../src/providers/types';
import type { AgentConfiguration, ProviderSelectionResult } from './agent-detection';

/**
 * Extended provider factory options
 */
export interface ProviderFactoryOptions {
  /** Optional callback for fallback events */
  onFallback?: (event: ProviderFallbackEvent) => void;

  /** Optional callback for agent detection results */
  onAgentDetected?: (result: AgentDetectionResult) => void;

  /** Force specific provider (bypasses detection and fallback) */
  forceProvider?: 'anthropic' | 'openai' | 'google';

  /** Skill name for per-skill overrides */
  skillName?: string;

  /** Agent configuration (defaults to loadAgentConfig()) */
  agentConfig?: AgentConfiguration;
}

/**
 * Extended createLLMProvider with agent detection
 *
 * Workflow:
 * 1. Check for explicit forceProvider
 * 2. Check for per-skill override (if skillName provided)
 * 3. Check for explicit AI_PROVIDER configuration
 * 4. Run agent detection (if mode is 'auto')
 * 5. Fall back to standard provider chain
 *
 * @param options - Factory options
 * @returns LLM provider instance
 * @throws ProviderError if no provider available
 */
export async function createLLMProvider(
  options?: ProviderFactoryOptions
): Promise<LLMProvider>;

/**
 * Select provider based on environment and configuration
 *
 * @param config - Agent configuration
 * @param skillName - Optional skill name for overrides
 * @returns Provider selection result
 */
export async function selectProvider(
  config: AgentConfiguration,
  skillName?: string
): Promise<ProviderSelectionResult>;

/**
 * Load agent configuration from environment and config files
 *
 * Priority order:
 * 1. Environment variables (AI_PROVIDER, AGENT_MODE, PREFERRED_AGENT)
 * 2. .prism/config.yaml
 * 3. Default configuration
 *
 * @returns Merged configuration
 */
export async function loadAgentConfig(): Promise<AgentConfiguration>;
