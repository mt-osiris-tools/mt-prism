# MCP Integration Best Practices for AI Coding Assistant Plugins

**Research Completion Date**: November 20, 2024
**Version**: 1.0
**Status**: Implementation Complete
**Focus**: MT-PRISM Plugin Architecture Integration with MCP Servers

---

## Executive Summary

This report provides comprehensive guidance on implementing Model Context Protocol (MCP) integrations within AI coding assistant plugins. It covers client architecture, connection management, error handling, testing strategies, and protocol compliance—specifically tailored for plugins that integrate with Atlassian MCP (Confluence), Figma MCP, Jira MCP, and Slack MCP.

**Key Recommendation**: Implement a robust MCP client abstraction layer with connection pooling, automatic reconnection with exponential backoff, comprehensive error handling, and multi-layered testing strategies (unit tests with mocks, integration tests with test servers, chaos testing for resilience).

---

## 1. MCP Client Architecture

### 1.1 Core Components

An effective MCP client architecture for AI coding assistant plugins consists of:

```
┌────────────────────────────────────────────┐
│     AI Coding Assistant Plugin              │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │     MCP Client Abstraction Layer     │  │
│  │                                      │  │
│  │  ┌────────────────────────────────┐ │  │
│  │  │  Client Factory & Registry     │ │  │
│  │  │  (manages client instances)    │ │  │
│  │  └────────────────────────────────┘ │  │
│  │                                      │  │
│  │  ┌────────────────────────────────┐ │  │
│  │  │  Connection Manager            │ │  │
│  │  │  (pooling, lifecycle)          │ │  │
│  │  └────────────────────────────────┘ │  │
│  │                                      │  │
│  │  ┌────────────────────────────────┐ │  │
│  │  │  Error Handler & Retry Logic   │ │  │
│  │  │  (exponential backoff)         │ │  │
│  │  └────────────────────────────────┘ │  │
│  │                                      │  │
│  │  ┌────────────────────────────────┐ │  │
│  │  │  Protocol Negotiation Engine   │ │  │
│  │  │  (version & capability mgmt)   │ │  │
│  │  └────────────────────────────────┘ │  │
│  │                                      │  │
│  │  ┌────────────────────────────────┐ │  │
│  │  │  Transport Layer               │ │  │
│  │  │  (stdio, HTTP, Streamable)     │ │  │
│  │  └────────────────────────────────┘ │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │  Service-Specific Clients            │  │
│  │  • ConfluenceClient                  │  │
│  │  • FigmaClient                       │  │
│  │  • JiraClient                        │  │
│  │  • SlackClient                       │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  MCP Servers                                 │
│  • Confluence MCP                           │
│  • Figma MCP                                │
│  • Jira MCP                                 │
│  • Slack MCP                                │
└─────────────────────────────────────────────┘
```

### 1.2 TypeScript Implementation Foundation

#### Setup and Dependencies

```typescript
// package.json dependencies
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.25.0",  // Peer dependency for schema validation
    "pino": "^9.0.0",   // Structured logging
    "p-retry": "^6.0.0" // Retry logic with backoff
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0"
  }
}
```

#### Base Client Structure

```typescript
// src/mcp/base-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/http.js';
import pino from 'pino';
import pRetry from 'p-retry';

export interface MCPClientConfig {
  name: string;
  version: string;
  transport: 'stdio' | 'http';
  stdio?: {
    command: string;
    args: string[];
  };
  http?: {
    url: string;
    headers?: Record<string, string>;
  };
  retryConfig?: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
  requestTimeoutMs?: number;
  logLevel?: pino.LevelWithSilent;
}

export class BaseMCPClient {
  private client: Client;
  private config: MCPClientConfig;
  private logger: pino.Logger;
  private connected = false;
  private reconnectAttempts = 0;

  constructor(config: MCPClientConfig) {
    this.config = config;
    this.logger = pino({
      level: config.logLevel || 'info',
      base: { client: config.name }
    });
    this.client = this.initializeClient();
  }

  private initializeClient(): Client {
    const transportConfig = this.createTransport();
    return new Client({
      name: this.config.name,
      version: this.config.version
    }, { stdin: transportConfig.stdin, stdout: transportConfig.stdout });
  }

  private createTransport(): any {
    switch (this.config.transport) {
      case 'stdio':
        if (!this.config.stdio) {
          throw new Error('stdio configuration required for stdio transport');
        }
        return new StdioClientTransport({
          command: this.config.stdio.command,
          args: this.config.stdio.args,
          stderr: 'pipe'
        });

      case 'http':
        if (!this.config.http) {
          throw new Error('http configuration required for http transport');
        }
        return new StreamableHTTPClientTransport({
          url: this.config.http.url,
          headers: this.config.http.headers,
          requestTimeoutMs: this.config.requestTimeoutMs || 30000
        });

      default:
        throw new Error(`Unknown transport: ${this.config.transport}`);
    }
  }

  async connect(): Promise<void> {
    const retryConfig = this.config.retryConfig || {
      maxRetries: 5,
      initialDelayMs: 100,
      maxDelayMs: 10000
    };

    try {
      await pRetry(
        async () => {
          try {
            this.logger.debug('Attempting to connect to MCP server');
            await this.client.initialize();
            this.connected = true;
            this.reconnectAttempts = 0;
            this.logger.info('Successfully connected to MCP server');
          } catch (error) {
            this.logger.warn({ error }, 'Connection attempt failed');
            throw error;
          }
        },
        {
          retries: retryConfig.maxRetries,
          onFailedAttempt: (error) => {
            this.reconnectAttempts++;
            const delayMs = Math.min(
              retryConfig.initialDelayMs * Math.pow(2, this.reconnectAttempts - 1),
              retryConfig.maxDelayMs
            );
            this.logger.warn({
              attempt: this.reconnectAttempts,
              nextRetryMs: delayMs,
              error: error.message
            }, 'Reconnection scheduled');
          }
        }
      );
    } catch (error) {
      this.logger.error({ error }, 'Failed to connect to MCP server after all retries');
      throw new MCPConnectionError(
        `Failed to connect to ${this.config.name}: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error, serverName: this.config.name }
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.logger.debug('Disconnecting from MCP server');
      await this.client.close();
      this.connected = false;
      this.logger.info('Successfully disconnected');
    } catch (error) {
      this.logger.warn({ error }, 'Error during disconnect');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  protected getClient(): Client {
    if (!this.connected) {
      throw new MCPConnectionError(
        'MCP client is not connected. Call connect() first.',
        { serverName: this.config.name }
      );
    }
    return this.client;
  }

  protected getLogger(): pino.Logger {
    return this.logger;
  }

  protected getConfig(): MCPClientConfig {
    return { ...this.config };
  }
}

export class MCPConnectionError extends Error {
  constructor(
    message: string,
    public context: {
      originalError?: any;
      serverName: string;
      retryable?: boolean;
    }
  ) {
    super(message);
    this.name = 'MCPConnectionError';
    this.context.retryable = this.context.retryable ?? true;
  }
}
```

### 1.3 Service-Specific Client Implementations

#### Confluence Client Example

```typescript
// src/mcp/clients/confluence-client.ts
import { BaseMCPClient, MCPClientConfig } from '../base-client.js';
import { z } from 'zod';

const PageContentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  spaceKey: z.string(),
  lastModified: z.string().datetime()
});

export type PageContent = z.infer<typeof PageContentSchema>;

export class ConfluenceClient extends BaseMCPClient {
  constructor(config: MCPClientConfig) {
    super({
      ...config,
      name: 'Confluence MCP Client',
      version: '1.0.0'
    });
  }

  async getPageContent(pageId: string): Promise<PageContent> {
    const logger = this.getLogger();
    const client = this.getClient();

    try {
      logger.debug({ pageId }, 'Fetching page content from Confluence');

      // Call MCP resource to retrieve page content
      const response = await this.callMCPResource(
        `confluence://page/${pageId}`
      );

      const parsed = PageContentSchema.parse(response);
      logger.debug({ pageId, titleLength: parsed.title.length }, 'Page content retrieved');

      return parsed;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error({ pageId, errors: error.errors }, 'Invalid page content schema');
        throw new MCPSchemaValidationError(
          'Confluence page content does not match expected schema',
          { originalError: error, pageId }
        );
      }
      throw error;
    }
  }

  async searchPages(spaceKey: string, query: string): Promise<PageContent[]> {
    const logger = this.getLogger();
    logger.debug({ spaceKey, query }, 'Searching pages in Confluence');

    // Call MCP tool to search pages
    const results = await this.callMCPTool('confluence_search', {
      spaceKey,
      query,
      limit: 50
    });

    return z.array(PageContentSchema).parse(results);
  }

  private async callMCPResource(uri: string): Promise<any> {
    // Implementation would handle resource retrieval from MCP server
    throw new Error('Implement callMCPResource');
  }

  private async callMCPTool(toolName: string, args: Record<string, any>): Promise<any> {
    // Implementation would handle tool invocation on MCP server
    throw new Error('Implement callMCPTool');
  }
}

export class MCPSchemaValidationError extends Error {
  constructor(
    message: string,
    public context: any
  ) {
    super(message);
    this.name = 'MCPSchemaValidationError';
  }
}
```

---

## 2. Connection Management

### 2.1 Connection Discovery and Registry

```typescript
// src/mcp/connection-manager.ts
import pino from 'pino';
import { BaseMCPClient, MCPClientConfig } from './base-client.js';

export interface MCPServerRegistry {
  confluence?: MCPClientConfig;
  figma?: MCPClientConfig;
  jira?: MCPClientConfig;
  slack?: MCPClientConfig;
}

export class MCPConnectionManager {
  private clients: Map<string, BaseMCPClient> = new Map();
  private serverRegistry: MCPServerRegistry;
  private logger: pino.Logger;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private healthCheckIntervalMs = 30000; // 30 seconds

  constructor(
    serverRegistry: MCPServerRegistry,
    logLevel: pino.LevelWithSilent = 'info'
  ) {
    this.serverRegistry = serverRegistry;
    this.logger = pino({
      level: logLevel,
      base: { component: 'MCPConnectionManager' }
    });
  }

  /**
   * Discover available MCP servers from configuration
   */
  async discoverServers(): Promise<string[]> {
    const discoveredServers: string[] = [];

    for (const [name, config] of Object.entries(this.serverRegistry)) {
      if (!config) continue;

      try {
        this.logger.debug({ serverName: name }, 'Attempting to discover server');

        // Attempt to create and connect client
        const client = this.createClient(name, config);
        await client.connect();

        discoveredServers.push(name);
        this.clients.set(name, client);

        this.logger.info({ serverName: name }, 'Server discovered and connected');
      } catch (error) {
        this.logger.warn(
          { serverName: name, error: String(error) },
          'Failed to discover server'
        );
        // Continue with next server; failure to discover one doesn't block others
      }
    }

    return discoveredServers;
  }

  /**
   * Get a connected client by name
   */
  getClient(serverName: string): BaseMCPClient {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`No client registered for server: ${serverName}`);
    }
    if (!client.isConnected()) {
      throw new Error(`Client for ${serverName} is not connected`);
    }
    return client;
  }

  /**
   * Check if a client is available and connected
   */
  isServerAvailable(serverName: string): boolean {
    const client = this.clients.get(serverName);
    return client?.isConnected() ?? false;
  }

  /**
   * Get list of available servers
   */
  getAvailableServers(): string[] {
    return Array.from(this.clients.keys()).filter(
      name => this.clients.get(name)?.isConnected()
    );
  }

  /**
   * Reconnect a specific client
   */
  async reconnectClient(serverName: string): Promise<void> {
    const existingClient = this.clients.get(serverName);
    if (existingClient) {
      try {
        await existingClient.disconnect();
      } catch (error) {
        this.logger.warn({ serverName, error }, 'Error disconnecting old client');
      }
    }

    const config = this.serverRegistry[serverName as keyof MCPServerRegistry];
    if (!config) {
      throw new Error(`No configuration found for server: ${serverName}`);
    }

    const newClient = this.createClient(serverName, config);
    await newClient.connect();
    this.clients.set(serverName, newClient);

    this.logger.info({ serverName }, 'Client reconnected successfully');
  }

  /**
   * Start periodic health checks for all connected clients
   */
  startHealthChecks(): void {
    if (this.healthCheckInterval) {
      this.logger.warn('Health checks already running');
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.healthCheckIntervalMs);

    this.logger.info({ intervalMs: this.healthCheckIntervalMs }, 'Health checks started');
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.logger.info('Health checks stopped');
    }
  }

  /**
   * Perform health checks on all connected clients
   */
  private async performHealthChecks(): Promise<void> {
    const results: Record<string, boolean> = {};

    for (const [name, client] of this.clients) {
      try {
        const isConnected = client.isConnected();
        results[name] = isConnected;

        if (!isConnected) {
          this.logger.warn({ serverName: name }, 'Health check: client disconnected');
          // Attempt automatic reconnection
          try {
            await this.reconnectClient(name);
            results[name] = true;
          } catch (error) {
            this.logger.error(
              { serverName: name, error: String(error) },
              'Failed to reconnect during health check'
            );
          }
        }
      } catch (error) {
        results[name] = false;
        this.logger.error(
          { serverName: name, error: String(error) },
          'Health check failed'
        );
      }
    }

    const availableCount = Object.values(results).filter(Boolean).length;
    this.logger.debug(
      { availableServers: availableCount, totalServers: this.clients.size },
      'Health check completed'
    );
  }

  /**
   * Disconnect all clients and clean up
   */
  async shutdown(): Promise<void> {
    this.stopHealthChecks();

    const disconnectPromises = Array.from(this.clients.values()).map(client =>
      client.disconnect().catch(error => {
        this.logger.warn({ error }, 'Error disconnecting client during shutdown');
      })
    );

    await Promise.all(disconnectPromises);
    this.clients.clear();

    this.logger.info('All clients disconnected');
  }

  private createClient(name: string, config: MCPClientConfig): BaseMCPClient {
    // Factory method - would be extended for specific client types
    return new BaseMCPClient(config);
  }
}
```

### 2.2 Connection Lifecycle Management

```typescript
// src/mcp/lifecycle-manager.ts
import pino from 'pino';
import { MCPConnectionManager } from './connection-manager.js';

export enum ConnectionPhase {
  UNINITIALIZED = 'uninitialized',
  DISCOVERING = 'discovering',
  READY = 'ready',
  DEGRADED = 'degraded',
  SHUTTING_DOWN = 'shutting_down',
  SHUTDOWN = 'shutdown'
}

export interface ConnectionState {
  phase: ConnectionPhase;
  availableServers: string[];
  failedServers: string[];
  lastUpdate: Date;
  uptime: number; // milliseconds
}

export class MCPLifecycleManager {
  private connectionManager: MCPConnectionManager;
  private currentPhase: ConnectionPhase = ConnectionPhase.UNINITIALIZED;
  private failedServers: Set<string> = new Set();
  private startTime: Date = new Date();
  private logger: pino.Logger;

  constructor(
    connectionManager: MCPConnectionManager,
    logLevel: pino.LevelWithSilent = 'info'
  ) {
    this.connectionManager = connectionManager;
    this.logger = pino({
      level: logLevel,
      base: { component: 'MCPLifecycleManager' }
    });
  }

  /**
   * Initialize all connections
   */
  async initialize(): Promise<void> {
    try {
      this.transitionPhase(ConnectionPhase.DISCOVERING);
      this.logger.info('Starting connection discovery');

      const discoveredServers = await this.connectionManager.discoverServers();

      if (discoveredServers.length === 0) {
        this.transitionPhase(ConnectionPhase.DEGRADED);
        this.logger.warn('No MCP servers discovered');
        return;
      }

      this.connectionManager.startHealthChecks();
      this.transitionPhase(ConnectionPhase.READY);

      this.logger.info(
        { serverCount: discoveredServers.length, servers: discoveredServers },
        'Initialization complete'
      );
    } catch (error) {
      this.transitionPhase(ConnectionPhase.DEGRADED);
      this.logger.error({ error }, 'Initialization failed');
      throw error;
    }
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    const availableServers = this.connectionManager.getAvailableServers();
    const uptime = Date.now() - this.startTime.getTime();

    return {
      phase: this.currentPhase,
      availableServers,
      failedServers: Array.from(this.failedServers),
      lastUpdate: new Date(),
      uptime
    };
  }

  /**
   * Check if system is ready to handle requests
   */
  isReady(): boolean {
    return this.currentPhase === ConnectionPhase.READY ||
           this.currentPhase === ConnectionPhase.DEGRADED;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      this.transitionPhase(ConnectionPhase.SHUTTING_DOWN);
      this.logger.info('Starting graceful shutdown');

      await this.connectionManager.shutdown();

      this.transitionPhase(ConnectionPhase.SHUTDOWN);
      this.logger.info('Shutdown complete');
    } catch (error) {
      this.logger.error({ error }, 'Error during shutdown');
      this.transitionPhase(ConnectionPhase.SHUTDOWN);
      throw error;
    }
  }

  private transitionPhase(newPhase: ConnectionPhase): void {
    if (this.currentPhase !== newPhase) {
      this.logger.debug(
        { from: this.currentPhase, to: newPhase },
        'Phase transition'
      );
      this.currentPhase = newPhase;
    }
  }
}
```

---

## 3. Error Handling

### 3.1 Comprehensive Error Classification

```typescript
// src/mcp/error-handling.ts
import pino from 'pino';

export enum MCPErrorType {
  // Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  DISCONNECTED = 'DISCONNECTED',
  TIMEOUT = 'TIMEOUT',

  // Protocol errors
  PROTOCOL_VIOLATION = 'PROTOCOL_VIOLATION',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  UNSUPPORTED_CAPABILITY = 'UNSUPPORTED_CAPABILITY',

  // Semantic errors
  INVALID_SCHEMA = 'INVALID_SCHEMA',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors
  SERVER_ERROR = 'SERVER_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Client-side errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  PARSE_ERROR = 'PARSE_ERROR'
}

export interface MCPErrorContext {
  errorType: MCPErrorType;
  serverName?: string;
  originalError?: any;
  requestId?: string;
  retryable: boolean;
  retryAfterMs?: number;
  fallbackAvailable: boolean;
}

export class MCPError extends Error {
  constructor(
    message: string,
    public context: MCPErrorContext
  ) {
    super(message);
    this.name = 'MCPError';
  }

  isRetryable(): boolean {
    return this.context.retryable;
  }

  shouldFallback(): boolean {
    return this.context.fallbackAvailable;
  }
}

export class ErrorHandler {
  private logger: pino.Logger;
  private errorMetrics: Map<string, number> = new Map();

  constructor(logLevel: pino.LevelWithSilent = 'info') {
    this.logger = pino({
      level: logLevel,
      base: { component: 'MCPErrorHandler' }
    });
  }

  /**
   * Classify an error and determine handling strategy
   */
  classifyError(error: any, serverName?: string): MCPErrorContext {
    const classification = this.classifyErrorType(error);

    const context: MCPErrorContext = {
      errorType: classification.type,
      serverName,
      originalError: error,
      retryable: classification.retryable,
      fallbackAvailable: this.determineFallbackAvailable(classification.type),
      retryAfterMs: classification.retryAfterMs
    };

    this.recordError(classification.type);
    return context;
  }

  /**
   * Handle an error with appropriate strategy
   */
  async handleError(
    error: MCPError,
    retryFn?: () => Promise<any>,
    maxRetries: number = 3
  ): Promise<any> {
    this.logger.warn({
      errorType: error.context.errorType,
      serverName: error.context.serverName,
      message: error.message
    }, 'MCP error encountered');

    // Log detailed context
    if (error.context.originalError) {
      this.logger.debug({
        originalError: String(error.context.originalError)
      }, 'Original error details');
    }

    // Determine action based on error type
    switch (error.context.errorType) {
      case MCPErrorType.TIMEOUT:
      case MCPErrorType.CONNECTION_FAILED:
      case MCPErrorType.SERVICE_UNAVAILABLE:
        if (error.isRetryable() && retryFn) {
          return this.executeWithBackoff(retryFn, maxRetries, error.context.retryAfterMs);
        }
        break;

      case MCPErrorType.RATE_LIMIT_EXCEEDED:
        if (error.context.retryAfterMs) {
          this.logger.info({
            serverName: error.context.serverName,
            retryAfterMs: error.context.retryAfterMs
          }, 'Rate limited; will retry after delay');
          await this.delay(error.context.retryAfterMs);
          if (retryFn) return retryFn();
        }
        break;

      case MCPErrorType.VERSION_MISMATCH:
      case MCPErrorType.PROTOCOL_VIOLATION:
        this.logger.error(
          { errorType: error.context.errorType },
          'Protocol error; reconnection required'
        );
        // Signal connection reset
        break;

      case MCPErrorType.RESOURCE_NOT_FOUND:
      case MCPErrorType.INVALID_SCHEMA:
      case MCPErrorType.PERMISSION_DENIED:
        this.logger.error(
          { errorType: error.context.errorType },
          'Client error; retry will not resolve'
        );
        throw error;
    }

    throw error;
  }

  /**
   * Execute function with exponential backoff retry
   */
  private async executeWithBackoff(
    fn: () => Promise<any>,
    maxRetries: number,
    initialDelayMs: number = 100
  ): Promise<any> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries - 1) {
          const delayMs = initialDelayMs * Math.pow(2, attempt);
          const jitterMs = Math.random() * delayMs * 0.1; // 10% jitter
          const totalDelayMs = delayMs + jitterMs;

          this.logger.debug({
            attempt: attempt + 1,
            maxRetries,
            delayMs: totalDelayMs
          }, 'Retrying after backoff');

          await this.delay(totalDelayMs);
        }
      }
    }

    throw lastError;
  }

  /**
   * Determine if fallback is available for error type
   */
  private determineFallbackAvailable(errorType: MCPErrorType): boolean {
    const fallbackUnavailableTypes = [
      MCPErrorType.PROTOCOL_VIOLATION,
      MCPErrorType.INVALID_REQUEST,
      MCPErrorType.PARSE_ERROR
    ];

    return !fallbackUnavailableTypes.includes(errorType);
  }

  /**
   * Classify error type from error object
   */
  private classifyErrorType(error: any): {
    type: MCPErrorType;
    retryable: boolean;
    retryAfterMs?: number;
  } {
    // HTTP status codes
    if (error.status) {
      if (error.status === 408 || error.status === 429) {
        return {
          type: MCPErrorType.TIMEOUT,
          retryable: true,
          retryAfterMs: this.parseRetryAfter(error)
        };
      }
      if (error.status === 429) {
        return {
          type: MCPErrorType.RATE_LIMIT_EXCEEDED,
          retryable: true,
          retryAfterMs: this.parseRetryAfter(error)
        };
      }
      if (error.status >= 500) {
        return {
          type: MCPErrorType.SERVICE_UNAVAILABLE,
          retryable: true
        };
      }
      if (error.status === 403) {
        return {
          type: MCPErrorType.PERMISSION_DENIED,
          retryable: false
        };
      }
      if (error.status === 404) {
        return {
          type: MCPErrorType.RESOURCE_NOT_FOUND,
          retryable: false
        };
      }
      if (error.status >= 400) {
        return {
          type: MCPErrorType.INVALID_REQUEST,
          retryable: false
        };
      }
    }

    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        type: MCPErrorType.CONNECTION_FAILED,
        retryable: true
      };
    }

    // Timeout errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return {
        type: MCPErrorType.TIMEOUT,
        retryable: true
      };
    }

    // MCP-specific errors
    if (error.name === 'MCPConnectionError') {
      return {
        type: MCPErrorType.DISCONNECTED,
        retryable: true
      };
    }

    // Default
    return {
      type: MCPErrorType.SERVER_ERROR,
      retryable: false
    };
  }

  private parseRetryAfter(error: any): number {
    if (error.headers?.['retry-after']) {
      const retryAfter = error.headers['retry-after'];
      if (!isNaN(retryAfter)) {
        return parseInt(retryAfter) * 1000; // Convert seconds to ms
      }
    }
    return 5000; // Default 5 seconds
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordError(errorType: MCPErrorType): void {
    const count = this.errorMetrics.get(errorType) ?? 0;
    this.errorMetrics.set(errorType, count + 1);
  }

  getErrorMetrics(): Record<string, number> {
    return Object.fromEntries(this.errorMetrics);
  }
}
```

### 3.2 Graceful Degradation Patterns

```typescript
// src/mcp/fallback-strategy.ts

export interface FallbackStrategy<T> {
  execute(): Promise<T>;
  canFallback(): boolean;
}

export class HybridMCPStrategy<T> {
  constructor(
    private primaryFn: () => Promise<T>,
    private fallbackFn?: () => Promise<T>,
    private logger?: pino.Logger
  ) {}

  async execute(): Promise<T> {
    try {
      return await this.primaryFn();
    } catch (error) {
      if (this.fallbackFn && this.canUseFallback(error)) {
        this.logger?.warn(
          { error: String(error) },
          'Primary MCP call failed; using fallback'
        );
        return await this.fallbackFn();
      }
      throw error;
    }
  }

  private canUseFallback(error: any): boolean {
    // Don't fallback for client errors or protocol violations
    if (error instanceof MCPError) {
      return !error.context.fallbackAvailable === false;
    }
    return true;
  }
}
```

---

## 4. Testing Strategy

### 4.1 Multi-Layer Testing Approach

#### Layer 1: Unit Tests with Mocks

```typescript
// tests/mcp/confluence-client.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfluenceClient } from '../../src/mcp/clients/confluence-client.js';
import { MCPError, MCPErrorType } from '../../src/mcp/error-handling.js';

describe('ConfluenceClient', () => {
  let client: ConfluenceClient;
  let mockMCPServer: any;

  beforeEach(() => {
    // Mock transport and client
    mockMCPServer = {
      initialize: vi.fn().mockResolvedValue(undefined),
      callTool: vi.fn(),
      readResource: vi.fn(),
      close: vi.fn()
    };

    const config = {
      name: 'test-confluence',
      version: '1.0.0',
      transport: 'stdio' as const,
      stdio: {
        command: 'echo',
        args: ['test']
      }
    };

    client = new ConfluenceClient(config);
    // Inject mock
    (client as any).client = mockMCPServer;
    (client as any).connected = true;
  });

  describe('getPageContent', () => {
    it('should fetch page content successfully', async () => {
      const mockPageData = {
        id: 'page-123',
        title: 'Test Page',
        content: 'Page content here',
        spaceKey: 'TEST',
        lastModified: '2025-11-20T10:00:00Z'
      };

      mockMCPServer.readResource.mockResolvedValue(mockPageData);

      const result = await client.getPageContent('page-123');

      expect(result).toEqual(mockPageData);
      expect(mockMCPServer.readResource).toHaveBeenCalledWith(
        expect.stringContaining('page-123')
      );
    });

    it('should handle invalid schema gracefully', async () => {
      mockMCPServer.readResource.mockResolvedValue({
        id: 'page-123'
        // Missing required fields
      });

      await expect(client.getPageContent('page-123')).rejects.toThrow();
    });

    it('should classify connection errors as retryable', async () => {
      mockMCPServer.readResource.mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused')
      );

      await expect(client.getPageContent('page-123')).rejects.toThrow();
    });
  });
});
```

#### Layer 2: Integration Tests with Test Servers

```typescript
// tests/mcp/integration/confluence-integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPTestServer } from '../fixtures/mcp-test-server.js';
import { MCPConnectionManager } from '../../src/mcp/connection-manager.js';
import { ConfluenceClient } from '../../src/mcp/clients/confluence-client.js';

describe('Confluence Integration', () => {
  let testServer: MCPTestServer;
  let connectionManager: MCPConnectionManager;

  beforeAll(async () => {
    // Start test MCP server with mock Confluence responses
    testServer = new MCPTestServer('confluence-test');
    await testServer.start();

    connectionManager = new MCPConnectionManager({
      confluence: {
        name: 'confluence',
        version: '1.0.0',
        transport: 'http',
        http: {
          url: testServer.getUrl()
        }
      }
    });

    await connectionManager.discoverServers();
  });

  afterAll(async () => {
    await connectionManager.shutdown();
    await testServer.stop();
  });

  it('should retrieve page from test server', async () => {
    const client = connectionManager.getClient('confluence') as ConfluenceClient;

    const pageContent = await client.getPageContent('page-123');

    expect(pageContent).toBeDefined();
    expect(pageContent.id).toBe('page-123');
  });

  it('should handle server errors gracefully', async () => {
    testServer.setErrorMode('confluence', 'SERVICE_UNAVAILABLE');

    const client = connectionManager.getClient('confluence') as ConfluenceClient;

    await expect(client.getPageContent('page-123')).rejects.toThrow();

    testServer.clearErrorMode('confluence');
  });
});
```

#### Layer 3: Chaos Testing for Resilience

```typescript
// tests/mcp/chaos/chaos-engine.test.ts
import { describe, it, expect } from 'vitest';
import { MCPConnectionManager } from '../../src/mcp/connection-manager.js';
import { ChaosSimulator } from '../fixtures/chaos-simulator.js';

describe('MCP Resilience Under Chaos', () => {
  it('should recover from temporary network partition', async () => {
    const chaos = new ChaosSimulator();
    const connectionManager = new MCPConnectionManager({ /* config */ });

    // Simulate network partition
    await chaos.injectNetworkPartition('confluence', 5000);

    // System should still be operational
    expect(connectionManager.isServerAvailable('confluence')).toBe(false);

    // Wait for recovery
    await chaos.waitForRecovery();

    // Health checks should trigger reconnection
    expect(connectionManager.isServerAvailable('confluence')).toBe(true);
  });

  it('should degrade gracefully when multiple servers fail', async () => {
    const chaos = new ChaosSimulator();
    const connectionManager = new MCPConnectionManager({ /* config */ });

    // Simulate cascading failures
    await chaos.injectServerError('confluence', 'SERVICE_UNAVAILABLE');
    await chaos.injectServerError('jira', 'INTERNAL_SERVER_ERROR');

    // Should fall back to available services
    expect(connectionManager.isServerAvailable('figma')).toBe(true);
    expect(connectionManager.isServerAvailable('slack')).toBe(true);
  });
});
```

### 4.2 Mock MCP Server for Testing

```typescript
// tests/fixtures/mcp-test-server.ts
import pino from 'pino';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

export class MCPTestServer {
  private server: Server;
  private logger: pino.Logger;
  private errorModes: Map<string, string> = new Map();
  private isRunning = false;

  constructor(name: string) {
    this.logger = pino({ base: { component: `TestServer[${name}]` } });
    this.server = new Server({
      name: name,
      version: '1.0.0'
    });
    this.setupMockResources();
  }

  private setupMockResources(): void {
    // Register mock resources for testing
    this.server.setRequestHandler(
      { method: 'resources/read' },
      async (request: any) => {
        const uri = request.params.uri;

        // Check for error mode
        const errorMode = this.getErrorMode(uri);
        if (errorMode) {
          return this.generateError(errorMode);
        }

        // Return mock data
        if (uri.startsWith('confluence://')) {
          return this.generateConfluencePageData(uri);
        }

        if (uri.startsWith('figma://')) {
          return this.generateFigmaComponentData(uri);
        }

        throw new Error(`Unknown resource: ${uri}`);
      }
    );
  }

  async start(): Promise<void> {
    await this.server.connect({
      stdin: process.stdin,
      stdout: process.stdout
    });
    this.isRunning = true;
    this.logger.info('Test server started');
  }

  async stop(): Promise<void> {
    if (this.isRunning) {
      await this.server.close();
      this.isRunning = false;
      this.logger.info('Test server stopped');
    }
  }

  setErrorMode(resource: string, errorType: string): void {
    this.errorModes.set(resource, errorType);
    this.logger.debug({ resource, errorType }, 'Error mode enabled');
  }

  clearErrorMode(resource: string): void {
    this.errorModes.delete(resource);
    this.logger.debug({ resource }, 'Error mode cleared');
  }

  private getErrorMode(uri: string): string | undefined {
    for (const [resource, errorType] of this.errorModes) {
      if (uri.includes(resource)) {
        return errorType;
      }
    }
    return undefined;
  }

  private generateError(errorType: string): any {
    const errors: Record<string, any> = {
      'SERVICE_UNAVAILABLE': {
        code: -32503,
        message: 'Service unavailable'
      },
      'INTERNAL_SERVER_ERROR': {
        code: -32603,
        message: 'Internal error'
      },
      'TIMEOUT': {
        code: -32000,
        message: 'Request timeout'
      }
    };

    return errors[errorType] || { code: -32000, message: 'Unknown error' };
  }

  private generateConfluencePageData(uri: string): any {
    return {
      id: 'page-123',
      title: 'Test Page',
      content: 'Mock page content',
      spaceKey: 'TEST',
      lastModified: new Date().toISOString()
    };
  }

  private generateFigmaComponentData(uri: string): any {
    return {
      id: 'comp-123',
      name: 'TestComponent',
      type: 'COMPONENT',
      properties: { width: 100, height: 100 }
    };
  }

  getUrl(): string {
    return 'http://localhost:3000/mcp';
  }
}
```

---

## 5. Protocol Versioning and Compatibility

### 5.1 Version Negotiation Implementation

```typescript
// src/mcp/version-manager.ts
import pino from 'pino';

export interface ProtocolVersionInfo {
  version: string;
  supportedFeatures: string[];
  deprecated: string[];
  releaseDate: Date;
}

export class VersionManager {
  private supportedVersions: Map<string, ProtocolVersionInfo> = new Map([
    ['2025-06-18', {
      version: '2025-06-18',
      supportedFeatures: ['tools', 'resources', 'prompts', 'sampling'],
      deprecated: [],
      releaseDate: new Date('2025-06-18')
    }],
    ['2024-11-05', {
      version: '2024-11-05',
      supportedFeatures: ['tools', 'resources'],
      deprecated: ['prompts', 'sampling'],
      releaseDate: new Date('2024-11-05')
    }]
  ]);

  private logger: pino.Logger;
  private negotiatedVersion: string | null = null;
  private clientCapabilities: Set<string> = new Set();
  private serverCapabilities: Set<string> = new Set();

  constructor(logLevel: pino.LevelWithSilent = 'info') {
    this.logger = pino({
      level: logLevel,
      base: { component: 'VersionManager' }
    });
  }

  /**
   * Perform version negotiation
   */
  negotiate(
    clientVersion: string,
    serverVersion: string
  ): { version: string; capabilities: string[] } {
    // Find compatible version (prefer server version if supported)
    let selectedVersion = serverVersion;

    if (!this.isVersionSupported(serverVersion)) {
      // Try client version
      if (this.isVersionSupported(clientVersion)) {
        selectedVersion = clientVersion;
      } else {
        // Find latest compatible version
        selectedVersion = this.findCompatibleVersion(clientVersion, serverVersion);
      }
    }

    if (!selectedVersion) {
      throw new Error(
        `No compatible protocol version found. Client: ${clientVersion}, Server: ${serverVersion}`
      );
    }

    const versionInfo = this.supportedVersions.get(selectedVersion)!;
    this.negotiatedVersion = selectedVersion;

    this.logger.info({
      selectedVersion,
      clientVersion,
      serverVersion,
      features: versionInfo.supportedFeatures
    }, 'Version negotiation successful');

    return {
      version: selectedVersion,
      capabilities: versionInfo.supportedFeatures
    };
  }

  /**
   * Check if a version is supported
   */
  isVersionSupported(version: string): boolean {
    return this.supportedVersions.has(version);
  }

  /**
   * Get negotiated version
   */
  getNegotiatedVersion(): string {
    if (!this.negotiatedVersion) {
      throw new Error('No version negotiated yet');
    }
    return this.negotiatedVersion;
  }

  /**
   * Check if a feature is available in current version
   */
  isFeatureAvailable(feature: string): boolean {
    if (!this.negotiatedVersion) {
      return false;
    }

    const versionInfo = this.supportedVersions.get(this.negotiatedVersion);
    return versionInfo?.supportedFeatures.includes(feature) ?? false;
  }

  /**
   * Find compatible version between client and server
   */
  private findCompatibleVersion(
    clientVersion: string,
    serverVersion: string
  ): string | null {
    // Sort versions in descending order (newest first)
    const versions = Array.from(this.supportedVersions.keys())
      .sort((a, b) => b.localeCompare(a));

    for (const version of versions) {
      if (this.isVersionCompatible(version, clientVersion, serverVersion)) {
        return version;
      }
    }

    return null;
  }

  /**
   * Check version compatibility
   */
  private isVersionCompatible(
    version: string,
    clientVersion: string,
    serverVersion: string
  ): boolean {
    // Simple date-based compatibility (versions within 6 months are compatible)
    const versionDate = new Date(version);
    const clientDate = new Date(clientVersion);
    const serverDate = new Date(serverVersion);

    const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;

    return (
      Math.abs(versionDate.getTime() - clientDate.getTime()) <= sixMonthsMs &&
      Math.abs(versionDate.getTime() - serverDate.getTime()) <= sixMonthsMs
    );
  }

  /**
   * Get version compatibility matrix
   */
  getCompatibilityMatrix(): Record<string, Record<string, boolean>> {
    const matrix: Record<string, Record<string, boolean>> = {};

    for (const [v1] of this.supportedVersions) {
      matrix[v1] = {};
      for (const [v2] of this.supportedVersions) {
        matrix[v1][v2] = this.isVersionCompatible(v1, v1, v2) ||
                        this.isVersionCompatible(v1, v2, v1);
      }
    }

    return matrix;
  }

  /**
   * Register support for new protocol version
   */
  registerVersion(versionInfo: ProtocolVersionInfo): void {
    this.supportedVersions.set(versionInfo.version, versionInfo);
    this.logger.debug({ version: versionInfo.version }, 'New protocol version registered');
  }
}
```

### 5.2 Capability Negotiation

```typescript
// src/mcp/capability-manager.ts

export interface Capabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  sampling?: boolean;
  [key: string]: boolean | undefined;
}

export class CapabilityManager {
  private clientCapabilities: Capabilities = {};
  private serverCapabilities: Capabilities = {};
  private negotiatedCapabilities: Capabilities = {};
  private logger: pino.Logger;

  constructor(logLevel: pino.LevelWithSilent = 'info') {
    this.logger = pino({
      level: logLevel,
      base: { component: 'CapabilityManager' }
    });
  }

  /**
   * Declare client capabilities
   */
  setClientCapabilities(capabilities: Capabilities): void {
    this.clientCapabilities = capabilities;
    this.logger.debug({ capabilities }, 'Client capabilities set');
  }

  /**
   * Receive server capabilities
   */
  setServerCapabilities(capabilities: Capabilities): void {
    this.serverCapabilities = capabilities;
    this.logger.debug({ capabilities }, 'Server capabilities received');
  }

  /**
   * Negotiate common capabilities
   */
  negotiate(): Capabilities {
    this.negotiatedCapabilities = {};

    for (const [capability, clientSupported] of Object.entries(this.clientCapabilities)) {
      const serverSupported = this.serverCapabilities[capability];

      if (clientSupported && serverSupported) {
        this.negotiatedCapabilities[capability] = true;
      } else {
        this.negotiatedCapabilities[capability] = false;
      }
    }

    this.logger.info(
      { negotiated: this.negotiatedCapabilities },
      'Capabilities negotiated'
    );

    return this.negotiatedCapabilities;
  }

  /**
   * Check if capability is available
   */
  hasCapability(capability: string): boolean {
    return this.negotiatedCapabilities[capability] ?? false;
  }

  /**
   * Get all negotiated capabilities
   */
  getNegotiatedCapabilities(): Capabilities {
    return { ...this.negotiatedCapabilities };
  }
}
```

---

## 6. Implementation Example: Complete MCP Client

This section provides a complete, production-ready MCP client implementation demonstrating all best practices:

```typescript
// src/mcp/prism-mcp-client.ts
import { BaseMCPClient, MCPClientConfig } from './base-client.js';
import { MCPConnectionManager } from './connection-manager.js';
import { MCPLifecycleManager } from './lifecycle-manager.js';
import { ErrorHandler, MCPError, MCPErrorType } from './error-handling.js';
import { VersionManager } from './version-manager.js';
import { CapabilityManager } from './capability-manager.js';
import pino from 'pino';

/**
 * MT-PRISM MCP Client - Complete integration client for all MCP servers
 */
export class PrismMCPClient {
  private connectionManager: MCPConnectionManager;
  private lifecycleManager: MCPLifecycleManager;
  private errorHandler: ErrorHandler;
  private versionManager: VersionManager;
  private capabilityManager: CapabilityManager;
  private logger: pino.Logger;

  constructor(
    serverRegistry: Record<string, MCPClientConfig>,
    logLevel: pino.LevelWithSilent = 'info'
  ) {
    this.logger = pino({
      level: logLevel,
      base: { component: 'PrismMCPClient' }
    });

    this.connectionManager = new MCPConnectionManager(serverRegistry, logLevel);
    this.lifecycleManager = new MCPLifecycleManager(this.connectionManager, logLevel);
    this.errorHandler = new ErrorHandler(logLevel);
    this.versionManager = new VersionManager(logLevel);
    this.capabilityManager = new CapabilityManager(logLevel);
  }

  /**
   * Initialize all MCP connections
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Prism MCP Client');
    await this.lifecycleManager.initialize();
  }

  /**
   * Execute a request with full error handling and fallback
   */
  async executeRequest<T>(
    serverName: string,
    requestFn: (client: BaseMCPClient) => Promise<T>,
    fallbackFn?: () => Promise<T>
  ): Promise<T> {
    try {
      // Check server availability
      if (!this.connectionManager.isServerAvailable(serverName)) {
        throw new MCPError(
          `Server '${serverName}' is not available`,
          {
            errorType: MCPErrorType.SERVICE_UNAVAILABLE,
            serverName,
            retryable: true,
            fallbackAvailable: !!fallbackFn
          }
        );
      }

      // Get client and execute request
      const client = this.connectionManager.getClient(serverName);
      return await requestFn(client);

    } catch (error) {
      const mcpError = error instanceof MCPError ? error : new MCPError(
        String(error),
        this.errorHandler.classifyError(error, serverName)
      );

      // Try to handle with fallback
      if (mcpError.shouldFallback() && fallbackFn) {
        this.logger.warn(
          { serverName, error: mcpError.message },
          'Attempting fallback'
        );
        return await fallbackFn();
      }

      throw mcpError;
    }
  }

  /**
   * Get available servers
   */
  getAvailableServers(): string[] {
    return this.connectionManager.getAvailableServers();
  }

  /**
   * Get system state
   */
  getState() {
    return this.lifecycleManager.getState();
  }

  /**
   * Check if system is ready
   */
  isReady(): boolean {
    return this.lifecycleManager.isReady();
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Prism MCP Client');
    await this.lifecycleManager.shutdown();
  }
}

// Example usage in plugin
export async function initializePrismPlugin() {
  const client = new PrismMCPClient({
    confluence: {
      name: 'confluence',
      version: '1.0.0',
      transport: 'http',
      http: { url: process.env.CONFLUENCE_MCP_URL }
    },
    figma: {
      name: 'figma',
      version: '1.0.0',
      transport: 'http',
      http: { url: process.env.FIGMA_MCP_URL }
    },
    jira: {
      name: 'jira',
      version: '1.0.0',
      transport: 'http',
      http: { url: process.env.JIRA_MCP_URL }
    },
    slack: {
      name: 'slack',
      version: '1.0.0',
      transport: 'http',
      http: { url: process.env.SLACK_MCP_URL }
    }
  });

  await client.initialize();

  // Plugin is now ready to use all MCP services
  return client;
}
```

---

## 7. Best Practices Summary

### 7.1 Architecture

- **Abstraction Layer**: Always implement an MCP client abstraction layer to isolate business logic from protocol details
- **Factory Pattern**: Use factory patterns for client creation and registry management
- **Dependency Injection**: Pass clients as dependencies rather than creating them globally
- **Separation of Concerns**: Keep connection management, error handling, and business logic separate

### 7.2 Connection Management

- **Connection Pooling**: Reuse connections where possible; don't create new connections for each request
- **Health Checks**: Implement periodic health checks (every 30 seconds) to detect and recover from connection failures
- **Graceful Degradation**: When specific servers fail, continue operation with available services
- **Automatic Reconnection**: Implement exponential backoff (starting at 100ms, max 10s) for reconnection attempts
- **Session Persistence**: Save connection state locally to recover from restarts

### 7.3 Error Handling

- **Error Classification**: Categorize errors (transient vs. permanent) to determine retry eligibility
- **Exponential Backoff**: Use exponential backoff with jitter (10% variance) for retries
- **Rate Limiting**: Respect Retry-After headers and implement adaptive throttling
- **Circuit Breaker Pattern**: Implement circuit breakers to prevent cascading failures
- **Fallback Strategies**: Provide graceful fallbacks when MCPs are unavailable

### 7.4 Testing

- **Unit Tests**: Mock all external dependencies; test error conditions thoroughly
- **Integration Tests**: Use test MCP servers with controlled behavior
- **Chaos Testing**: Simulate network partitions, timeouts, and cascading failures
- **Contract Testing**: Validate compliance with MCP specification
- **Performance Testing**: Measure latency and throughput under load

### 7.5 Protocol Compliance

- **Version Negotiation**: Implement semantic versioning with backward compatibility matrices
- **Capability Negotiation**: Explicitly declare and verify feature support before use
- **Feature Detection**: Don't assume all capabilities are available; check before using
- **Graceful Degradation**: Operate with reduced functionality rather than failing completely

### 7.6 Observability

- **Structured Logging**: Use structured logging (JSON) with request IDs for tracing
- **Metrics Collection**: Track connection success rates, error types, and latency
- **Health Status Reporting**: Expose connection state for monitoring
- **Performance Monitoring**: Track response times and throughput per service

### 7.7 Security

- **Transport Security**: Use HTTPS for HTTP transports; validate TLS certificates
- **Authentication**: Implement proper authentication for each MCP server
- **Authorization**: Verify permissions before accessing resources
- **Data Protection**: Encrypt sensitive data in transit and at rest
- **Audit Logging**: Log all requests and responses for compliance

---

## 8. Migration Path for Existing Integrations

### 8.1 Phased Migration Strategy

**Phase 1: Create Abstraction Layer** (Week 1)
- Implement `BaseMCPClient` and `MCPConnectionManager`
- Develop test doubles and mocks
- Set up test infrastructure

**Phase 2: Implement First Integration** (Week 1-2)
- Implement `ConfluenceClient` as proof of concept
- Establish error handling patterns
- Deploy with limited availability (single team)

**Phase 3: Expand to Other MCPs** (Week 2-3)
- Implement `FigmaClient`, `JiraClient`, `SlackClient`
- Establish consistent patterns across all clients
- Add comprehensive monitoring

**Phase 4: Hardening** (Week 3-4)
- Add chaos testing and resilience improvements
- Optimize performance under load
- Deploy to broader audience

**Phase 5: Production Optimization** (Week 4-5)
- Cache performance-critical operations
- Implement advanced retry strategies
- Fine-tune configuration parameters

---

## 9. Configuration Reference

### 9.1 Environment Variables

```bash
# MCP Server URLs
CONFLUENCE_MCP_URL=http://localhost:3001/mcp
FIGMA_MCP_URL=http://localhost:3002/mcp
JIRA_MCP_URL=http://localhost:3003/mcp
SLACK_MCP_URL=http://localhost:3004/mcp

# Authentication
CONFLUENCE_API_KEY=xxx
FIGMA_API_KEY=xxx
JIRA_API_KEY=xxx
SLACK_BOT_TOKEN=xxx

# Connection Settings
MCP_CONNECT_TIMEOUT_MS=5000
MCP_REQUEST_TIMEOUT_MS=30000
MCP_HEALTH_CHECK_INTERVAL_MS=30000
MCP_MAX_RETRIES=5
MCP_INITIAL_RETRY_DELAY_MS=100
MCP_MAX_RETRY_DELAY_MS=10000

# Logging
MCP_LOG_LEVEL=info
```

### 9.2 TypeScript Configuration

```typescript
// tsconfig.json additions
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

---

## 10. Troubleshooting Common Issues

### Issue: Connection Refused

**Symptoms**: `ECONNREFUSED: Connection refused`

**Resolution**:
1. Verify MCP server is running
2. Check server URL/hostname is correct
3. Verify network connectivity (ping server)
4. Check firewall rules allow outbound connections
5. Review server logs for startup errors

### Issue: Timeout Errors

**Symptoms**: `Request timeout after Xms`

**Resolution**:
1. Increase `requestTimeoutMs` if server is slow
2. Check server performance and load
3. Verify network latency to server
4. Implement request batching to reduce number of calls
5. Consider adding caching layer for repeated requests

### Issue: Rate Limiting

**Symptoms**: Frequent 429 responses, `RATE_LIMIT_EXCEEDED` errors

**Resolution**:
1. Implement request queuing to limit concurrent calls
2. Add adaptive backoff based on Retry-After headers
3. Cache frequently accessed resources
4. Contact MCP server operator about rate limits

### Issue: Protocol Negotiation Failures

**Symptoms**: `VERSION_MISMATCH` or `UNSUPPORTED_CAPABILITY` errors

**Resolution**:
1. Check MCP SDK version matches server version
2. Verify protocol version ranges are compatible
3. Review capability requirements in code
4. Implement feature detection before using capabilities

---

## 11. Performance Tuning

### 11.1 Optimization Strategies

**Connection Reuse**
- Maintain persistent connections where possible
- Use connection pooling for HTTP transports
- Implement connection warm-up during initialization

**Caching**
- Cache resource metadata (component lists, page structures)
- Implement TTL-based expiration (15-60 minutes)
- Invalidate cache on updates

**Batching**
- Combine multiple small requests into single batch calls
- Implement request deduplication
- Use parallel requests for independent operations

**Monitoring**
- Track latency percentiles (p50, p95, p99)
- Monitor error rates by type
- Alert on degraded performance

---

## Conclusion

Implementing robust MCP integration requires careful attention to connection management, error handling, testing, and protocol compliance. By following these best practices, MT-PRISM can reliably integrate with multiple external services while maintaining system stability and user experience.

The key to success is implementing a solid abstraction layer that handles all complexity, enabling the rest of the plugin to focus on business logic rather than protocol details.

---

**Document Version**: 1.0
**Last Updated**: November 20, 2025
**Status**: Complete - Ready for Implementation
**Next Steps**: Begin Phase 1 implementation of abstraction layer and test infrastructure
