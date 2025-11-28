/**
 * Contract tests for session state schema
 *
 * Validates session state YAML against Zod schema
 */

import { describe, it, expect } from 'vitest';
import { SessionStateSchema } from '../../src/schemas/session.js';
import type { SessionState } from '../../src/types/session.js';

describe('Session State Schema Validation', () => {
  it('should validate valid session state', () => {
    const validState: SessionState = {
      session: {
        session_id: 'sess-1732278750345',
        current_step: 'prd-analysis',
        status: 'in-progress',
        created_at: '2025-11-22T10:05:50.345Z',
        updated_at: '2025-11-22T10:05:50.345Z',
        prd_source: './test-prd.md',
        outputs: {},
        checkpoints: [],
        config: {
          ai_provider: 'anthropic',
          workflow_timeout_minutes: 30,
          max_clarification_iterations: 3,
        },
      },
      version: '1.0',
    };

    const result = SessionStateSchema.safeParse(validState);
    expect(result.success).toBe(true);
  });

  it('should validate session state with checkpoints', () => {
    const stateWithCheckpoints: SessionState = {
      session: {
        session_id: 'sess-1732278750345',
        current_step: 'validation',
        status: 'in-progress',
        created_at: '2025-11-22T10:05:50.345Z',
        updated_at: '2025-11-22T10:15:30.123Z',
        prd_source: './test-prd.md',
        figma_source: 'figma-abc123',
        outputs: {
          requirements_yaml: '.prism/sessions/sess-1732278750345/01-prd-analysis/requirements.yaml',
        },
        checkpoints: [
          {
            step: 'prd-analysis',
            timestamp: '2025-11-22T10:08:30.000Z',
            outputs: ['requirements.yaml'],
            metadata: {
              duration_ms: 120000,
              provider_used: 'claude',
              estimated_cost: 0.025,
            },
          },
        ],
        config: {
          ai_provider: 'anthropic',
          workflow_timeout_minutes: 30,
          max_clarification_iterations: 3,
        },
      },
      version: '1.0',
      last_checkpoint: {
        step: 'prd-analysis',
        timestamp: '2025-11-22T10:08:30.000Z',
        outputs: ['requirements.yaml'],
        metadata: {
          duration_ms: 120000,
        },
      },
    };

    const result = SessionStateSchema.safeParse(stateWithCheckpoints);
    expect(result.success).toBe(true);
  });

  it('should reject invalid session status', () => {
    const invalidState = {
      session: {
        session_id: 'sess-123',
        current_step: 'prd-analysis',
        status: 'invalid-status', // Invalid
        created_at: '2025-11-22T10:05:50.345Z',
        updated_at: '2025-11-22T10:05:50.345Z',
        prd_source: './test.md',
        outputs: {},
        checkpoints: [],
        config: {
          ai_provider: 'anthropic',
          workflow_timeout_minutes: 30,
          max_clarification_iterations: 3,
        },
      },
      version: '1.0',
    };

    const result = SessionStateSchema.safeParse(invalidState);
    expect(result.success).toBe(false);
  });

  it('should reject invalid workflow step', () => {
    const invalidState = {
      session: {
        session_id: 'sess-123',
        current_step: 'invalid-step', // Invalid
        status: 'in-progress',
        created_at: '2025-11-22T10:05:50.345Z',
        updated_at: '2025-11-22T10:05:50.345Z',
        prd_source: './test.md',
        outputs: {},
        checkpoints: [],
        config: {
          ai_provider: 'anthropic',
          workflow_timeout_minutes: 30,
          max_clarification_iterations: 3,
        },
      },
      version: '1.0',
    };

    const result = SessionStateSchema.safeParse(invalidState);
    expect(result.success).toBe(false);
  });

  it('should validate output paths are strings', () => {
    const state: SessionState = {
      session: {
        session_id: 'sess-123',
        current_step: 'tdd-generation',
        status: 'completed',
        created_at: '2025-11-22T10:05:50.345Z',
        updated_at: '2025-11-22T10:25:50.345Z',
        prd_source: './test.md',
        outputs: {
          tddPath: '.prism/sessions/sess-123/05-tdd/tdd.md',
          apiSpecPath: '.prism/sessions/sess-123/05-tdd/api-spec.yaml',
          databaseSchemaPath: '.prism/sessions/sess-123/05-tdd/database-schema.sql',
        },
        checkpoints: [],
        config: {
          ai_provider: 'anthropic',
          workflow_timeout_minutes: 30,
          max_clarification_iterations: 3,
        },
      },
      version: '1.0',
    };

    const result = SessionStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });
});
