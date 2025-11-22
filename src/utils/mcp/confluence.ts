/**
 * Confluence MCP Client
 *
 * Implements Model Context Protocol client for Atlassian Confluence.
 * Fetches PRD content from Confluence pages.
 *
 * @module utils/mcp/confluence
 */

import { MCPClient, type MCPConfig, type MCPRequest, type MCPResponse } from '../mcp.js';
import { MCPError } from '../errors.js';

/**
 * Confluence page metadata
 */
export interface ConfluencePage {
  id: string;
  title: string;
  spaceKey: string;
  version: number;
  lastModified: string; // ISO 8601
  content?: string;
  labels?: string[];
}

/**
 * Confluence page search result
 */
export interface ConfluenceSearchResult {
  id: string;
  title: string;
  spaceKey: string;
  excerpt?: string;
}

/**
 * Content format options
 */
export type ContentFormat = 'storage' | 'markdown' | 'plain';

/**
 * Confluence MCP Client
 *
 * Extends MCPClient base class with Confluence-specific methods
 */
export class ConfluenceMCPClient extends MCPClient {
  constructor(config: Partial<MCPConfig> = {}) {
    super({
      name: 'confluence',
      endpoint: config.endpoint || process.env.CONFLUENCE_URL || '',
      credentials: config.credentials || {
        apiToken: process.env.CONFLUENCE_API_TOKEN || '',
        username: process.env.CONFLUENCE_USERNAME || '',
      },
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
    });

    // Validate configuration
    if (!this.config.endpoint) {
      throw new MCPError(
        'Confluence URL not configured. Set CONFLUENCE_URL environment variable.',
        this.config.name,
        'constructor'
      );
    }

    const creds = this.config.credentials as Record<string, string>;
    if (!creds.apiToken || !creds.username) {
      throw new MCPError(
        'Confluence credentials not configured. Set CONFLUENCE_API_TOKEN and CONFLUENCE_USERNAME environment variables.',
        this.config.name,
        'constructor'
      );
    }
  }

  /**
   * Fetches page content by ID
   *
   * @param pageId - Confluence page ID
   * @param format - Content format (default: markdown)
   * @returns Page content as string
   */
  async getPageContent(pageId: string, format: ContentFormat = 'markdown'): Promise<string> {
    const request: MCPRequest = {
      method: 'confluence.getPageContent',
      params: {
        pageId,
        format,
      },
    };

    try {
      const response = await this.executeRequest<{ content: string }>(request);
      return response.content;
    } catch (error) {
      throw new MCPError(
        `Failed to fetch page content: ${error instanceof Error ? error.message : String(error)}`,
        this.config.name,
        'getPageContent'
      );
    }
  }

  /**
   * Fetches page by title and space key
   *
   * @param spaceKey - Confluence space key
   * @param title - Page title
   * @returns Page content as string
   */
  async getPageByTitle(spaceKey: string, title: string): Promise<string> {
    const request: MCPRequest = {
      method: 'confluence.getPageByTitle',
      params: {
        spaceKey,
        title,
      },
    };

    try {
      const response = await this.executeRequest<{ content: string }>(request);
      return response.content;
    } catch (error) {
      throw new MCPError(
        `Failed to fetch page by title "${title}" in space "${spaceKey}": ${error instanceof Error ? error.message : String(error)}`,
        this.config.name,
        'getPageByTitle'
      );
    }
  }

  /**
   * Fetches page with metadata
   *
   * @param pageId - Confluence page ID
   * @returns Page with metadata
   */
  async getPageWithMetadata(pageId: string): Promise<ConfluencePage> {
    const request: MCPRequest = {
      method: 'confluence.getPage',
      params: {
        pageId,
        includeMetadata: true,
      },
    };

    try {
      const response = await this.executeRequest<ConfluencePage>(request);
      return response;
    } catch (error) {
      throw new MCPError(
        `Failed to fetch page metadata: ${error instanceof Error ? error.message : String(error)}`,
        this.config.name,
        'getPageWithMetadata'
      );
    }
  }

  /**
   * Searches for pages in a space
   *
   * @param spaceKey - Confluence space key
   * @param keyword - Search keyword
   * @returns List of matching pages
   */
  async searchPages(spaceKey: string, keyword: string): Promise<ConfluenceSearchResult[]> {
    const request: MCPRequest = {
      method: 'confluence.searchPages',
      params: {
        spaceKey,
        query: keyword,
      },
    };

    try {
      const response = await this.executeRequest<{ results: ConfluenceSearchResult[] }>(request);
      return response.results;
    } catch (error) {
      throw new MCPError(
        `Failed to search pages: ${error instanceof Error ? error.message : String(error)}`,
        this.config.name,
        'searchPages'
      );
    }
  }

  /**
   * Lists pages in a space
   *
   * @param spaceKey - Confluence space key
   * @param options - Listing options
   * @returns List of pages
   */
  async listPagesInSpace(
    spaceKey: string,
    options?: {
      limit?: number;
      label?: string;
      start?: number;
    }
  ): Promise<ConfluencePage[]> {
    const request: MCPRequest = {
      method: 'confluence.listPages',
      params: {
        spaceKey,
        limit: options?.limit || 25,
        start: options?.start || 0,
        label: options?.label,
      },
    };

    try {
      const response = await this.executeRequest<{ pages: ConfluencePage[] }>(request);
      return response.pages;
    } catch (error) {
      throw new MCPError(
        `Failed to list pages: ${error instanceof Error ? error.message : String(error)}`,
        this.config.name,
        'listPagesInSpace'
      );
    }
  }

  /**
   * Invalidates cache for a specific page (if caching is implemented)
   *
   * @param pageId - Confluence page ID
   */
  async invalidateCache(pageId: string): Promise<void> {
    const request: MCPRequest = {
      method: 'confluence.invalidateCache',
      params: {
        pageId,
      },
    };

    try {
      await this.executeRequest(request);
    } catch (error) {
      // Cache invalidation is not critical, log but don't throw
      console.warn(`Cache invalidation failed for page ${pageId}:`, error);
    }
  }

  /**
   * Implements abstract sendRequest method from MCPClient
   *
   * @param request - MCP request
   * @returns MCP response
   */
  protected async sendRequest<T>(request: MCPRequest): Promise<MCPResponse<T>> {
    const endpoint = this.config.endpoint;
    const creds = this.config.credentials as Record<string, string>;

    // Create basic auth header
    const authHeader = `Basic ${Buffer.from(`${creds.username}:${creds.apiToken}`).toString('base64')}`;

    try {
      // Use node-fetch for HTTP requests
      const fetch = (await import('node-fetch')).default;

      const response = await fetch(`${endpoint}/rest/api/content`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(request),
        // @ts-ignore - node-fetch types
        timeout: this.config.timeout,
      });

      if (!response.ok) {
        // Map HTTP status to appropriate error
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failed: ${response.statusText}`);
        }
        if (response.status === 404) {
          throw new Error(`Resource not found: ${response.statusText}`);
        }
        if (response.status === 429) {
          throw new Error(`429 Rate limit exceeded`);
        }
        if (response.status >= 500) {
          throw new Error(`${response.status} Server error: ${response.statusText}`);
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        result: data as T,
      };
    } catch (error) {
      return {
        error: {
          code: 'CONFLUENCE_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
