/**
 * Agent Detection Contracts
 *
 * Defines interfaces for detecting and selecting coding agents as LLM providers.
 * This is a design contract, not executable code.
 */

/**
 * Result of agent detection in current environment
 */
export interface AgentDetectionResult {
  /** Name of detected coding agent, or null if none found */
  detectedAgent: 'claude-code' | 'codex' | 'cursor' | 'copilot' | null;

  /** Confidence in detection (0.0-1.0) */
  confidence: number;

  /** Method used to detect agent */
  detectionMethod: 'env-var' | 'config-file' | 'process' | 'explicit' | 'none';

  /** Recommended LLM provider based on detected agent */
  recommendedProvider: 'anthropic' | 'openai' | 'google' | null;

  /** Timestamp of detection */
  detectedAt: string; // ISO 8601

  /** Whether API provider fallback is available */
  fallbackAvailable: boolean;
}

/**
 * User configuration for agent-based provider selection
 */
export interface AgentConfiguration {
  /** Detection mode */
  mode: 'auto' | 'explicit' | 'disabled';

  /** User's preferred agent (overrides auto-detection) */
  preferredAgent: 'claude-code' | 'codex' | 'cursor' | 'copilot' | null;

  /** Enable fallback to API providers if agent unavailable */
  enableFallback: boolean;

  /** Custom priority order for auto-detection */
  detectionPriority: string[];

  /** Provider overrides per skill */
  perSkillOverrides: Record<string, string>;
}

/**
 * Final provider selection result
 */
export interface ProviderSelectionResult {
  /** Selected LLM provider */
  selectedProvider: 'anthropic' | 'openai' | 'google';

  /** How provider was selected */
  source: 'agent-detection' | 'api-configured' | 'default' | 'skill-override';

  /** Agent detection context (if applicable) */
  agentContext: AgentDetectionResult | null;

  /** Explanation of selection */
  rationale: string;

  /** Any warnings or issues */
  warnings: string[];
}

/**
 * Agent detector service interface
 */
export interface AgentDetector {
  /**
   * Detect all available coding agents in environment
   * @returns Detection result with recommended provider
   */
  detectAll(): Promise<AgentDetectionResult>;

  /**
   * Detect specific coding agent
   * @param agentName - Agent to detect
   * @returns True if agent is available
   */
  detectSpecific(agentName: string): Promise<boolean>;

  /**
   * Get priority order for auto-detection
   * @returns Array of agent names in priority order
   */
  getPriorityOrder(): string[];

  /**
   * Get recommended provider for detected agent
   * @param agent - Detected agent name
   * @returns Recommended LLM provider
   */
  getRecommendedProvider(agent: string): 'anthropic' | 'openai' | 'google' | null;
}

/**
 * Detection method signature for each agent
 */
export type AgentDetectionMethod = () => Promise<{
  available: boolean;
  confidence: number;
  method: string;
}>;

/**
 * Registry of agent detection methods
 */
export interface AgentDetectionRegistry {
  'claude-code': AgentDetectionMethod;
  'codex': AgentDetectionMethod;
  'cursor': AgentDetectionMethod;
  'copilot': AgentDetectionMethod;
}
