import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeDiscoveryWorkflow } from '../../src/workflows/discovery.js';

// Mock all skills
vi.mock('../../src/skills/prd-analyzer.js', () => ({
  analyzePRD: vi.fn(async () => ({
    metadata: {
      analyzed_at: new Date().toISOString(),
      prd_source: 'test',
      total_requirements: 1,
    },
    requirements: [
      {
        id: 'REQ-FUNC-001',
        title: 'Test Requirement',
        description: 'Test',
        type: 'functional',
        priority: 'high',
        complexity: 3,
        acceptance_criteria: [],
        dependencies: [],
      },
    ],
  })),
}));

vi.mock('../../src/skills/figma-analyzer.js', () => ({
  analyzeFigmaDesign: vi.fn(async () => ({
    metadata: {
      figma_file_id: 'test',
      analyzed_at: new Date().toISOString(),
      total_components: 0,
    },
    components: [],
    design_tokens: {},
  })),
}));

vi.mock('../../src/skills/requirements-validator.js', () => ({
  validateRequirements: vi.fn(async () => ({
    metadata: {
      validated_at: new Date().toISOString(),
      total_gaps: 0,
      critical_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
    },
    gaps: [],
  })),
}));

vi.mock('../../src/skills/clarification-manager.js', () => ({
  generateClarifications: vi.fn(async () => ({
    metadata: {
      generated_at: new Date().toISOString(),
      total_questions: 0,
      critical_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
    },
    questions: [],
  })),
}));

vi.mock('../../src/skills/tdd-generator.js', () => ({
  generateTDD: vi.fn(async () => ({
    version: '1.0.0',
    title: 'Test TDD',
    sections: [],
    api_spec: {
      openapi: '3.1.0',
      info: { title: 'Test API', version: '1.0.0', description: 'Test' },
      paths: {},
    },
    database_schema: { tables: [], indexes: [], relationships: [] },
    tasks: [],
    architecture_diagram: 'graph TD',
    requirements_coverage: [],
    metadata: {
      generated_at: new Date().toISOString(),
      generator_version: '1.0.0',
      requirements_source: 'test',
    },
  })),
}));

describe('Discovery Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Orchestration', () => {
    it('should execute complete workflow successfully', async () => {
      const result = await executeDiscoveryWorkflow({
        prdSource: 'test-prd.md',
        projectName: 'Test Project',
      });

      expect(result.status).toBe('completed');
      expect(result.sessionId).toBeDefined();
      expect(result.sessionId).toMatch(/^sess-\d+$/);
      expect(result.completedSteps.length).toBeGreaterThan(0);
    }, 30000); // 30s timeout

    it('should create session with proper structure', async () => {
      const result = await executeDiscoveryWorkflow({
        prdSource: 'test-prd.md',
        projectName: 'Test Project',
      });

      expect(result.outputs).toBeDefined();
      expect(result.outputs.tddPath).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    }, 30000);

    it('should execute steps in correct order', async () => {
      const result = await executeDiscoveryWorkflow({
        prdSource: 'test-prd.md',
        figmaSource: 'test-figma-data',
        projectName: 'Test Project',
      });

      expect(result.status).toBe('completed');

      // Check that PRD analysis happens before validation
      const prdIndex = result.completedSteps.indexOf('prd-analysis');
      const validationIndex = result.completedSteps.indexOf('validation');

      if (prdIndex >= 0 && validationIndex >= 0) {
        expect(prdIndex).toBeLessThan(validationIndex);
      }
    }, 30000);
  });
});
