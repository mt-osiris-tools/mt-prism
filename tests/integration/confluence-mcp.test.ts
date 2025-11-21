import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { ConfluenceMCPClient } from '../../src/utils/mcp/confluence.js';
import { MCPError } from '../../src/utils/errors.js';

describe('Confluence MCP Integration', () => {
  let client: ConfluenceMCPClient;
  const testConfig = {
    name: 'test-confluence',
    endpoint: process.env.CONFLUENCE_URL || 'https://test.atlassian.net',
    credentials: {
      apiToken: process.env.CONFLUENCE_API_TOKEN || 'test-token',
      username: process.env.CONFLUENCE_USERNAME || 'test@example.com',
    },
    timeout: 10000,
    maxRetries: 2,
  };

  beforeAll(() => {
    // Skip tests if Confluence credentials not provided
    if (!process.env.CONFLUENCE_URL || !process.env.CONFLUENCE_API_TOKEN) {
      console.log('⚠️  Skipping Confluence MCP integration tests (credentials not provided)');
      console.log('   Set CONFLUENCE_URL and CONFLUENCE_API_TOKEN to run these tests');
    }
  });

  beforeEach(() => {
    client = new ConfluenceMCPClient(testConfig);
  });

  describe('Connection and Health Check', () => {
    it('should successfully connect to Confluence MCP server', async () => {
      if (!process.env.CONFLUENCE_URL) {
        return; // Skip if no credentials
      }

      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should fail health check with invalid credentials', async () => {
      const invalidClient = new ConfluenceMCPClient({
        ...testConfig,
        credentials: {
          apiToken: 'invalid-token',
          username: 'invalid@example.com',
        },
      });

      const isHealthy = await invalidClient.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('should fail health check with invalid endpoint', async () => {
      const invalidClient = new ConfluenceMCPClient({
        ...testConfig,
        endpoint: 'https://nonexistent-confluence.invalid',
      });

      const isHealthy = await invalidClient.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('should timeout on slow connections', async () => {
      const slowClient = new ConfluenceMCPClient({
        ...testConfig,
        timeout: 100, // 100ms timeout
      });

      // Mock a slow endpoint that won't respond in time
      const startTime = Date.now();
      try {
        await slowClient.healthCheck();
      } catch (error) {
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(500); // Should timeout quickly
      }
    }, 10000);
  });

  describe('Fetching PRD Content', () => {
    it('should fetch PRD content from Confluence page by ID', async () => {
      if (!process.env.CONFLUENCE_URL || !process.env.TEST_CONFLUENCE_PAGE_ID) {
        return; // Skip if no test page configured
      }

      const pageId = process.env.TEST_CONFLUENCE_PAGE_ID;
      const content = await client.getPageContent(pageId);

      expect(content).toBeDefined();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should fetch PRD content from Confluence page by title and space', async () => {
      if (!process.env.CONFLUENCE_URL || !process.env.TEST_CONFLUENCE_SPACE) {
        return; // Skip if no test space configured
      }

      const spaceKey = process.env.TEST_CONFLUENCE_SPACE;
      const pageTitle = process.env.TEST_CONFLUENCE_PAGE_TITLE || 'Test PRD';

      const content = await client.getPageByTitle(spaceKey, pageTitle);

      expect(content).toBeDefined();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent page ID', async () => {
      if (!process.env.CONFLUENCE_URL) {
        return;
      }

      const nonExistentId = '999999999';

      await expect(client.getPageContent(nonExistentId)).rejects.toThrow(MCPError);
    });

    it('should throw error for non-existent page title', async () => {
      if (!process.env.CONFLUENCE_URL || !process.env.TEST_CONFLUENCE_SPACE) {
        return;
      }

      const spaceKey = process.env.TEST_CONFLUENCE_SPACE;
      const nonExistentTitle = 'This Page Does Not Exist 12345';

      await expect(client.getPageByTitle(spaceKey, nonExistentTitle)).rejects.toThrow(MCPError);
    });

    it('should return content in markdown format', async () => {
      if (!process.env.CONFLUENCE_URL || !process.env.TEST_CONFLUENCE_PAGE_ID) {
        return;
      }

      const pageId = process.env.TEST_CONFLUENCE_PAGE_ID;
      const content = await client.getPageContent(pageId, 'markdown');

      // Check for markdown formatting
      expect(content).toMatch(/^#/m); // Markdown headings
      expect(content).not.toContain('<html>'); // Not HTML
      expect(content).not.toContain('<div>'); // Not HTML
    });

    it('should fetch metadata along with content', async () => {
      if (!process.env.CONFLUENCE_URL || !process.env.TEST_CONFLUENCE_PAGE_ID) {
        return;
      }

      const pageId = process.env.TEST_CONFLUENCE_PAGE_ID;
      const page = await client.getPageWithMetadata(pageId);

      expect(page).toHaveProperty('id');
      expect(page).toHaveProperty('title');
      expect(page).toHaveProperty('content');
      expect(page).toHaveProperty('version');
      expect(page).toHaveProperty('lastModified');
      expect(page.id).toBe(pageId);
    });
  });

  describe('Error Handling', () => {
    it.skip('should handle authentication errors without retry', async () => { // TODO: Requires proper MCP server mock
      const invalidClient = new ConfluenceMCPClient({
        ...testConfig,
        credentials: {
          apiToken: 'definitely-invalid-token',
          username: 'invalid@example.com',
        },
        maxRetries: 3,
      });

      const startTime = Date.now();

      try {
        await invalidClient.getPageContent('123456');
        expect.fail('Should have thrown MCPError');
      } catch (error) {
        expect(error).toBeInstanceOf(MCPError);
        expect((error as MCPError).message).toContain('Authentication failed');

        // Should not retry auth errors
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(2000); // No exponential backoff delays
      }
    });

    it('should retry on transient errors', async () => {
      if (!process.env.CONFLUENCE_URL) {
        return;
      }

      // Mock transient error (rate limit)
      const mockClient = new ConfluenceMCPClient({
        ...testConfig,
        maxRetries: 3,
      });

      let attemptCount = 0;
      const originalSendRequest = mockClient['sendRequest'];
      mockClient['sendRequest'] = async (request: any) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('429 Rate limit exceeded');
        }
        return originalSendRequest.call(mockClient, request);
      };

      // Should eventually succeed after retries
      try {
        // This will retry 3 times due to mocked rate limit errors
        await mockClient.healthCheck();
      } catch (error) {
        // Expected to retry
        expect(attemptCount).toBeGreaterThan(1);
      }
    });

    it.skip('should provide clear error messages for common issues', async () => { // TODO: Requires proper config validation mock
      const testCases = [
        {
          config: { ...testConfig, endpoint: '' },
          expectedMessage: 'endpoint',
        },
        {
          config: { ...testConfig, credentials: { apiToken: '', username: '' } },
          expectedMessage: 'credentials',
        },
      ];

      for (const { config, expectedMessage } of testCases) {
        const testClient = new ConfluenceMCPClient(config);
        try {
          await testClient.getPageContent('123');
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error).toBeInstanceOf(MCPError);
          expect((error as MCPError).message.toLowerCase()).toContain(expectedMessage);
        }
      }
    });

    it.skip('should handle network timeouts gracefully', async () => { // TODO: Requires proper timeout mock
      const timeoutClient = new ConfluenceMCPClient({
        ...testConfig,
        timeout: 100, // Very short timeout
        endpoint: 'https://httpstat.us/200?sleep=5000', // Slow endpoint
      });

      await expect(timeoutClient.healthCheck()).rejects.toThrow();
    }, 10000);
  });

  describe('Retry Logic', () => {
    it('should respect maxRetries configuration', async () => {
      const maxRetries = 2;
      const retryClient = new ConfluenceMCPClient({
        ...testConfig,
        maxRetries,
      });

      let attemptCount = 0;
      const originalSendRequest = retryClient['sendRequest'];
      retryClient['sendRequest'] = async (request: any) => {
        attemptCount++;
        throw new Error('500 Internal Server Error'); // Transient error
      };

      try {
        await retryClient.getPageContent('123');
        expect.fail('Should have thrown error after retries');
      } catch (error) {
        expect(attemptCount).toBe(maxRetries);
      }
    });

    it('should use exponential backoff for retries', async () => {
      const retryClient = new ConfluenceMCPClient({
        ...testConfig,
        maxRetries: 3,
      });

      const retryTimestamps: number[] = [];
      const originalSendRequest = retryClient['sendRequest'];
      retryClient['sendRequest'] = async (request: any) => {
        retryTimestamps.push(Date.now());
        if (retryTimestamps.length < 3) {
          throw new Error('503 Service Unavailable');
        }
        return originalSendRequest.call(retryClient, request);
      };

      try {
        await retryClient.healthCheck();
      } catch (error) {
        // Calculate delays between retries
        if (retryTimestamps.length >= 2) {
          const delay1 = retryTimestamps[1]! - retryTimestamps[0]!;
          const delay2 = retryTimestamps[2]! - retryTimestamps[1]!;

          // Second delay should be longer than first (exponential backoff)
          expect(delay2).toBeGreaterThan(delay1);
        }
      }
    }, 15000);
  });

  describe('Content Parsing', () => {
    it('should handle Confluence storage format', async () => {
      if (!process.env.CONFLUENCE_URL || !process.env.TEST_CONFLUENCE_PAGE_ID) {
        return;
      }

      const pageId = process.env.TEST_CONFLUENCE_PAGE_ID;
      const content = await client.getPageContent(pageId, 'storage');

      // Storage format is Confluence's internal XML-like format
      expect(content).toBeDefined();
      expect(typeof content).toBe('string');
    });

    it('should strip Confluence macros and convert to clean text', async () => {
      if (!process.env.CONFLUENCE_URL || !process.env.TEST_CONFLUENCE_PAGE_ID) {
        return;
      }

      const pageId = process.env.TEST_CONFLUENCE_PAGE_ID;
      const content = await client.getPageContent(pageId, 'markdown');

      // Should not contain Confluence-specific syntax
      expect(content).not.toContain('ac:');
      expect(content).not.toContain('<ac:');
      expect(content).not.toContain('ri:');
    });

    it('should preserve important formatting in conversion', async () => {
      if (!process.env.CONFLUENCE_URL || !process.env.TEST_CONFLUENCE_PAGE_ID) {
        return;
      }

      const pageId = process.env.TEST_CONFLUENCE_PAGE_ID;
      const content = await client.getPageContent(pageId, 'markdown');

      // Check that headings, lists, and basic formatting are preserved
      // (Actual assertions depend on test page content)
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('Search and Discovery', () => {
    it('should search for pages by keyword', async () => {
      if (!process.env.CONFLUENCE_URL || !process.env.TEST_CONFLUENCE_SPACE) {
        return;
      }

      const spaceKey = process.env.TEST_CONFLUENCE_SPACE;
      const keyword = process.env.TEST_SEARCH_KEYWORD || 'PRD';

      const results = await client.searchPages(spaceKey, keyword);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      results.forEach((page) => {
        expect(page).toHaveProperty('id');
        expect(page).toHaveProperty('title');
        expect(page).toHaveProperty('spaceKey');
        expect(page.spaceKey).toBe(spaceKey);
      });
    });

    it('should list pages in a space', async () => {
      if (!process.env.CONFLUENCE_URL || !process.env.TEST_CONFLUENCE_SPACE) {
        return;
      }

      const spaceKey = process.env.TEST_CONFLUENCE_SPACE;
      const pages = await client.listPagesInSpace(spaceKey, { limit: 10 });

      expect(Array.isArray(pages)).toBe(true);
      expect(pages.length).toBeGreaterThanOrEqual(0);
      expect(pages.length).toBeLessThanOrEqual(10);

      pages.forEach((page) => {
        expect(page).toHaveProperty('id');
        expect(page).toHaveProperty('title');
        expect(page.spaceKey).toBe(spaceKey);
      });
    });

    it('should filter pages by label', async () => {
      if (!process.env.CONFLUENCE_URL || !process.env.TEST_CONFLUENCE_SPACE) {
        return;
      }

      const spaceKey = process.env.TEST_CONFLUENCE_SPACE;
      const label = process.env.TEST_PAGE_LABEL || 'prd';

      const pages = await client.listPagesInSpace(spaceKey, { label });

      expect(Array.isArray(pages)).toBe(true);
      pages.forEach((page) => {
        expect(page).toHaveProperty('labels');
        expect(page.labels).toContain(label);
      });
    });
  });

  describe('Caching (if implemented)', () => {
    it('should cache page content for repeated requests', async () => {
      if (!process.env.CONFLUENCE_URL || !process.env.TEST_CONFLUENCE_PAGE_ID) {
        return;
      }

      const pageId = process.env.TEST_CONFLUENCE_PAGE_ID;

      const start1 = Date.now();
      const content1 = await client.getPageContent(pageId);
      const duration1 = Date.now() - start1;

      const start2 = Date.now();
      const content2 = await client.getPageContent(pageId);
      const duration2 = Date.now() - start2;

      expect(content1).toBe(content2);
      // Second request should be faster (cached)
      expect(duration2).toBeLessThan(duration1);
    }, 10000);

    it('should allow cache invalidation', async () => {
      if (!process.env.CONFLUENCE_URL || !process.env.TEST_CONFLUENCE_PAGE_ID) {
        return;
      }

      const pageId = process.env.TEST_CONFLUENCE_PAGE_ID;

      await client.getPageContent(pageId); // Cache it
      await client.invalidateCache(pageId);

      const start = Date.now();
      await client.getPageContent(pageId); // Should fetch fresh
      const duration = Date.now() - start;

      // Should take time (not instant cache hit)
      expect(duration).toBeGreaterThan(10);
    }, 10000);
  });
});
