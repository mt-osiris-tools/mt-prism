import { MCPError } from './errors.js';

/**
 * MCP (Model Context Protocol) client utilities
 *
 * Base class and utilities for MCP server integrations
 * Per Constitutional Principle VII: All external services via MCP
 */

/**
 * MCP request
 */
export interface MCPRequest {
  method: string;
  params?: Record<string, unknown>;
}

/**
 * MCP response
 */
export interface MCPResponse<T = unknown> {
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * MCP connection configuration
 */
export interface MCPConfig {
  /** Server name for error messages */
  name: string;
  /** Server URL or connection details */
  endpoint?: string;
  /** Authentication credentials */
  credentials?: Record<string, string>;
  /** Request timeout (ms) */
  timeout?: number;
  /** Max retry attempts */
  maxRetries?: number;
}

/**
 * Base class for MCP clients
 *
 * Provides common functionality for all MCP integrations:
 * - Error handling with retries (NFR-011)
 * - Timeout management
 * - Response validation
 */
export abstract class MCPClient {
  protected config: MCPConfig;

  constructor(config: MCPConfig) {
    this.config = {
      timeout: 30000, // 30s default
      maxRetries: 3,
      ...config,
    };
  }

  /**
   * Execute MCP request with retry logic
   *
   * @param request - MCP request
   * @returns MCP response result
   * @throws MCPError if request fails after retries
   */
  protected async executeRequest<T>(request: MCPRequest): Promise<T> {
    let lastError: Error | undefined;
    const maxRetries = this.config.maxRetries || 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.sendRequest<T>(request);

        if (response.error) {
          throw new MCPError(
            response.error.message,
            this.config.name,
            request.method
          );
        }

        if (response.result === undefined) {
          throw new MCPError(
            'No result in response',
            this.config.name,
            request.method
          );
        }

        return response.result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on authentication errors
        if (
          lastError.message.includes('auth') ||
          lastError.message.includes('unauthorized') ||
          lastError.message.includes('403')
        ) {
          throw new MCPError(
            `Authentication failed: ${lastError.message}`,
            this.config.name,
            request.method
          );
        }

        // Retry for transient errors
        if (attempt < maxRetries - 1) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // All retries failed
    throw new MCPError(
      `Request failed after ${maxRetries} attempts: ${lastError?.message}`,
      this.config.name,
      request.method
    );
  }

  /**
   * Send MCP request (implemented by concrete clients)
   *
   * @param request - MCP request
   * @returns MCP response
   */
  protected abstract sendRequest<T>(
    request: MCPRequest
  ): Promise<MCPResponse<T>>;

  /**
   * Check MCP server health
   *
   * @returns true if server is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.executeRequest({ method: 'ping' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get MCP server name
   */
  getName(): string {
    return this.config.name;
  }
}

/**
 * MCP client factory helper
 *
 * Validates MCP availability per checklist CHK018
 */
export async function validateMCPAvailability(
  client: MCPClient,
  required: boolean = true
): Promise<boolean> {
  const isAvailable = await client.healthCheck();

  if (required && !isAvailable) {
    throw new MCPError(
      `MCP server is required but unavailable. Please check connection and credentials.`,
      client.getName(),
      'healthCheck'
    );
  }

  return isAvailable;
}
