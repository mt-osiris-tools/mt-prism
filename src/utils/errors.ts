/**
 * Custom error classes for MT-PRISM
 *
 * Provides structured error handling with clear error types
 * Per NFR-006: All skills must provide clear, actionable error messages
 */

/**
 * Base error class for all MT-PRISM errors
 */
export class PRISMError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = false
  ) {
    super(message);
    this.name = 'PRISMError';
  }
}

/**
 * MCP connection or operation failed
 */
export class MCPError extends PRISMError {
  constructor(
    message: string,
    public readonly mcpName: string,
    public readonly operation: string
  ) {
    super(
      `MCP ${mcpName} ${operation} failed: ${message}`,
      'MCP_ERROR',
      true // MCP errors are often transient
    );
    this.name = 'MCPError';
  }
}

/**
 * AI provider API call failed
 */
export class ProviderError extends PRISMError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly isTransient: boolean
  ) {
    super(
      `AI provider ${provider} failed: ${message}`,
      'PROVIDER_ERROR',
      isTransient
    );
    this.name = 'ProviderError';
  }
}

/**
 * Schema validation failed
 */
export class ValidationError extends PRISMError {
  constructor(
    message: string,
    public readonly schemaName: string,
    public readonly validationErrors: unknown[]
  ) {
    super(
      `Validation failed for ${schemaName}: ${message}`,
      'VALIDATION_ERROR',
      false // Validation errors require fixing data
    );
    this.name = 'ValidationError';
  }
}

/**
 * Session state is corrupted or invalid
 */
export class SessionError extends PRISMError {
  constructor(
    message: string,
    public readonly sessionId: string
  ) {
    super(
      `Session ${sessionId} error: ${message}`,
      'SESSION_ERROR',
      false // Corrupted session requires manual intervention
    );
    this.name = 'SessionError';
  }
}

/**
 * Configuration is missing or invalid
 */
export class ConfigurationError extends PRISMError {
  constructor(
    message: string,
    public readonly configKey: string
  ) {
    super(
      `Configuration error for ${configKey}: ${message}`,
      'CONFIG_ERROR',
      false // Config errors require user to fix .env or config file
    );
    this.name = 'ConfigurationError';
  }
}

/**
 * Workflow execution failed
 */
export class WorkflowError extends PRISMError {
  constructor(
    message: string,
    public readonly step: string,
    public override readonly cause?: Error
  ) {
    super(
      `Workflow failed at step ${step}: ${message}`,
      'WORKFLOW_ERROR',
      false
    );
    this.name = 'WorkflowError';
    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * Format error for user-friendly display (NFR-006)
 *
 * @param error - Error to format
 * @returns User-friendly error message with recovery suggestions
 */
export function formatError(error: unknown): string {
  if (!(error instanceof Error)) {
    return `Unknown error: ${String(error)}`;
  }

  if (error instanceof PRISMError) {
    let message = `❌ ${error.message}\n`;
    message += `   Code: ${error.code}\n`;

    // Add recovery suggestions based on error type
    if (error instanceof MCPError) {
      message += `   💡 Check MCP server connection and credentials\n`;
      message += `   💡 Verify ${error.mcpName} MCP is running and accessible\n`;
    } else if (error instanceof ProviderError) {
      if (error.isTransient) {
        message += `   💡 This is a transient error. Automatic fallback should occur.\n`;
      } else {
        message += `   💡 Check your API key for ${error.provider} in .env file\n`;
      }
    } else if (error instanceof ValidationError) {
      message += `   💡 Check output format matches ${error.schemaName} schema\n`;
      message += `   Validation errors:\n`;
      error.validationErrors.forEach((err, i) => {
        message += `     ${i + 1}. ${JSON.stringify(err)}\n`;
      });
    } else if (error instanceof SessionError) {
      message += `   💡 Try deleting .prism/sessions/${error.sessionId} and restarting\n`;
    } else if (error instanceof ConfigurationError) {
      message += `   💡 Check your .env file and ensure ${error.configKey} is set correctly\n`;
    } else if (error instanceof WorkflowError) {
      message += `   💡 Workflow can be resumed from last checkpoint\n`;
      if (error.cause) {
        message += `   Root cause: ${error.cause.message}\n`;
      }
    }

    return message;
  }

  // Generic error formatting
  return `❌ Error: ${error.message}\n   ${error.stack || ''}`;
}

/**
 * Check if error is recoverable (can retry)
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof PRISMError) {
    return error.recoverable;
  }
  return false;
}
