# MCP Integration Quick Reference Guide

**For MT-PRISM Plugin Implementation**

---

## Quick Start: 5-Minute Implementation Guide

### Step 1: Install Dependencies
```bash
npm install @modelcontextprotocol/sdk zod pino p-retry
npm install -D vitest @types/node
```

### Step 2: Create Base MCP Client
```typescript
// src/mcp/base-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export class BaseMCPClient {
  private client: Client;
  private connected = false;

  async connect(): Promise<void> {
    await this.client.initialize();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
```

### Step 3: Create Connection Manager
```typescript
// src/mcp/connection-manager.ts
export class MCPConnectionManager {
  private clients: Map<string, BaseMCPClient> = new Map();

  async discoverServers(): Promise<string[]> {
    // Connect to each configured server
    // Return list of available servers
  }

  getClient(serverName: string): BaseMCPClient {
    const client = this.clients.get(serverName);
    if (!client?.isConnected()) {
      throw new Error(`${serverName} is not connected`);
    }
    return client;
  }
}
```

### Step 4: Implement Error Handler
```typescript
// src/mcp/error-handler.ts
export class ErrorHandler {
  async handleError(error: any, retryFn?: () => Promise<any>) {
    if (this.isRetryable(error)) {
      return await this.retryWithBackoff(retryFn, 5);
    }
    throw error;
  }

  private async retryWithBackoff(fn: () => Promise<any>, maxRetries: number) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        const delay = Math.min(100 * Math.pow(2, i), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
```

### Step 5: Add Tests
```typescript
// tests/mcp/base-client.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('BaseMCPClient', () => {
  it('should connect and disconnect', async () => {
    const client = new BaseMCPClient(mockConfig);
    await client.connect();
    expect(client.isConnected()).toBe(true);
    await client.disconnect();
    expect(client.isConnected()).toBe(false);
  });
});
```

---

## Decision Tree: Choosing Patterns

```
Is this a new integration?
├─ Yes → Use BaseMCPClient pattern (§1.2)
└─ No → Extend existing client (§1.3)

Do you need retry logic?
├─ Yes → Use ErrorHandler with exponential backoff (§3.1)
└─ No → Direct pass-through

Multiple servers to manage?
├─ Yes → Use MCPConnectionManager (§2.1)
└─ No → Single client sufficient

Need testing?
├─ Yes → Use mock server fixtures (§4.2)
└─ No → Still recommended for reliability

Operating in hostile environment (network issues)?
├─ Yes → Add circuit breaker + chaos testing (§4.1)
└─ No → Basic retry logic sufficient
```

---

## Configuration Quick Reference

### Minimum Configuration
```typescript
const client = new BaseMCPClient({
  name: 'my-service',
  version: '1.0.0',
  transport: 'stdio',
  stdio: {
    command: 'node',
    args: ['./server.js']
  }
});
```

### Production Configuration
```typescript
const client = new BaseMCPClient({
  name: 'my-service',
  version: '1.0.0',
  transport: 'http',
  http: {
    url: process.env.MCP_SERVER_URL,
    headers: {
      'Authorization': `Bearer ${process.env.MCP_API_KEY}`
    }
  },
  requestTimeoutMs: 30000,
  retryConfig: {
    maxRetries: 5,
    initialDelayMs: 100,
    maxDelayMs: 10000
  },
  logLevel: 'info'
});
```

---

## Common Error Scenarios

### Scenario 1: Server Unavailable
```
Error: ECONNREFUSED
Resolution: Implement retry with backoff (ErrorHandler.handleError)
Fallback: Use cached data or degraded mode
```

### Scenario 2: Timeout
```
Error: Request timeout after 30000ms
Resolution: Check server performance, increase timeout if needed
Prevention: Implement request batching, add caching
```

### Scenario 3: Permission Denied
```
Error: 403 Forbidden
Resolution: Verify authentication credentials in config
Non-retryable: Don't retry this error
```

### Scenario 4: Rate Limited
```
Error: 429 Too Many Requests
Resolution: Implement adaptive backoff using Retry-After header
Prevention: Queue requests, implement rate limiter locally
```

---

## Testing Checklist

- [ ] Unit tests for all client methods (mock transport)
- [ ] Integration tests with test MCP server
- [ ] Error handling tests (connection failures, timeouts)
- [ ] Retry logic tests (backoff, max retries)
- [ ] Chaos tests (network partition, cascading failures)
- [ ] Performance tests (latency, throughput)
- [ ] Version negotiation tests
- [ ] Capability detection tests

---

## Performance Targets

| Metric | Target | Typical |
|--------|--------|---------|
| Connection Time | < 2s | ~500ms |
| Request Latency (p50) | < 100ms | ~50ms |
| Request Latency (p95) | < 500ms | ~200ms |
| Error Recovery Time | < 5s | ~2s |
| Health Check Interval | 30s | 30s |
| Throughput | > 100 req/s | ~500 req/s |

---

## Logging Best Practices

### What to Log
✅ Connection state changes
✅ Error classifications
✅ Retry attempts
✅ Protocol negotiation results
✅ Performance metrics

### What NOT to Log
❌ Sensitive credentials
❌ Full request/response bodies (size issue)
❌ Personally identifiable information (PII)
❌ Internal implementation details

### Structured Logging Example
```typescript
logger.info({
  event: 'mcp_request',
  serverName: 'confluence',
  requestId: 'req-123',
  durationMs: 245,
  status: 'success'
}, 'MCP request completed');
```

---

## Deployment Checklist

- [ ] All MCP server URLs configured via environment
- [ ] Authentication credentials securely stored
- [ ] Health checks enabled with monitoring
- [ ] Error handling and retry logic tested
- [ ] Fallback strategies implemented
- [ ] Logging configured for observability
- [ ] Performance tests pass
- [ ] Load testing completed
- [ ] Chaos testing validates resilience
- [ ] Documentation updated
- [ ] Team training completed

---

## Version Compatibility Matrix

| TypeScript SDK | MCP Protocol | Status | Notes |
|---|---|---|---|
| 1.0.0+ | 2025-06-18 | Current | Latest features |
| 0.9.x | 2024-11-05 | Legacy | Older deployments |
| 0.8.x | 2024-05-01 | EOL | No longer supported |

**Recommendation**: Always use latest SDK with negotiation for compatibility.

---

## Resources

### Official Documentation
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Building MCP Clients](https://modelcontextprotocol.info/docs/tutorials/building-a-client-node/)

### Reference Implementations
- [Atlassian MCP Server](https://github.com/sooperset/mcp-atlassian)
- [Figma MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/figma)
- [Jira MCP Server](https://github.com/cosmix/jira-mcp)

### Community Resources
- [MCP Servers Directory](https://mcpservers.org)
- [MCP Chinese Documentation](https://mcpcn.com)
- [Awesome MCP](https://github.com/punkpeye/awesome-mcp)

---

## Quick Command Reference

```bash
# Test MCP client
npm run test -- tests/mcp/

# Test with coverage
npm run test -- --coverage

# Run integration tests
npm run test -- tests/mcp/integration/

# Run chaos tests
npm run test -- tests/mcp/chaos/

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Format
npm run format
```

---

## Environment Variables Template

```bash
# .env.example

# MCP Server Endpoints
CONFLUENCE_MCP_URL=http://localhost:3001/mcp
FIGMA_MCP_URL=http://localhost:3002/mcp
JIRA_MCP_URL=http://localhost:3003/mcp
SLACK_MCP_URL=http://localhost:3004/mcp

# Authentication
CONFLUENCE_API_KEY=your_key_here
FIGMA_API_KEY=your_key_here
JIRA_API_KEY=your_key_here
SLACK_BOT_TOKEN=your_token_here

# Connection Settings (milliseconds)
MCP_CONNECT_TIMEOUT_MS=5000
MCP_REQUEST_TIMEOUT_MS=30000
MCP_HEALTH_CHECK_INTERVAL_MS=30000

# Retry Configuration
MCP_MAX_RETRIES=5
MCP_INITIAL_RETRY_DELAY_MS=100
MCP_MAX_RETRY_DELAY_MS=10000

# Logging
MCP_LOG_LEVEL=info

# Environment
NODE_ENV=production
```

---

## Troubleshooting Flow

```
Something is broken?
├─ Can't connect?
│  ├─ Check server is running (curl/ping)
│  ├─ Check URL/hostname correct
│  ├─ Check firewall/network
│  └─ Check auth credentials
│
├─ Slow responses?
│  ├─ Check server load/performance
│  ├─ Check network latency
│  ├─ Increase timeout if needed
│  └─ Add caching if possible
│
├─ Frequent errors?
│  ├─ Check error type in logs
│  ├─ Apply appropriate retry strategy
│  ├─ Check rate limits
│  └─ Review server capacity
│
└─ Tests failing?
   ├─ Check mock server setup
   ├─ Verify test data
   ├─ Check assertions
   └─ Run with verbose logging
```

---

## Next Steps

1. **Immediate** (Today): Set up base client and connection manager
2. **Short-term** (This week): Implement error handling and tests
3. **Medium-term** (Next week): Integrate first MCP server (Confluence)
4. **Long-term** (Weeks 2-3): Expand to other servers (Figma, Jira, Slack)
5. **Polish** (Week 4-5): Performance tuning and chaos testing

---

**For complete details, see**: `/docs/reports/MCP_INTEGRATION_BEST_PRACTICES.md`

Last Updated: November 20, 2025
