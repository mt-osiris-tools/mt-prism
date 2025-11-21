import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { analyzePRD } from '../../../src/skills/prd-analyzer.js';
import { RequirementsOutputSchema } from '../../../src/schemas/requirement.js';
import type { RequirementsOutput, Requirement } from '../../../src/types/requirement.js';

// Create a shared mock provider instance
const mockGenerateStructured = vi.fn();
const mockProvider = {
  generateStructured: mockGenerateStructured,
  getInfo: vi.fn(() => ({ name: 'mock-provider', model: 'mock-model' })),
  streamText: vi.fn(),
  generateText: vi.fn(),
  estimateCost: vi.fn(() => 0.01),
};

// Mock LLM provider to return shared instance
vi.mock('../../../src/providers/index.js', () => ({
  createLLMProvider: vi.fn(() => Promise.resolve(mockProvider)),
}));

describe('PRD Analyzer', () => {
  const FIXTURES_DIR = join(process.cwd(), 'tests/fixtures/prds');

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('Core Functionality', () => {
    it('should extract requirements from simple PRD', async () => {
      // Arrange
      const prdContent = await readFile(join(FIXTURES_DIR, 'simple-prd.md'), 'utf-8');
      const sessionId = 'test-session-001';

      const mockOutput: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'simple-prd.md',
          total_requirements: 8,
          complexity_average: 3.5,
          confidence_average: 0.92,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            type: 'functional',
            priority: 'high',
            complexity: 3,
            title: 'User Registration',
            description: 'Users must be able to register with email and password',
            acceptance_criteria: [
              'Email format validation',
              'Password minimum 8 characters',
            ],
            dependencies: [],
            confidence: 0.95,
            status: 'draft',
            issues: [],
          },
          {
            id: 'REQ-FUNC-002',
            type: 'functional',
            priority: 'high',
            complexity: 4,
            title: 'Task Creation',
            description: 'Users can create tasks with title, description, priority, due date, and category',
            acceptance_criteria: [
              'Title required, max 200 characters',
              'Description optional, max 2000 characters',
              'Priority selection (Low, Medium, High)',
              'Optional due date',
              'Optional category/tag',
            ],
            dependencies: ['REQ-FUNC-001'],
            confidence: 0.93,
            status: 'draft',
            issues: [],
          },
        ],
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      // Act
      const result = await analyzePRD(prdContent, sessionId);

      // Assert
      expect(mockGenerateStructured).toHaveBeenCalledOnce();
      expect(result).toHaveProperty('requirements');
      expect(result).toHaveProperty('metadata');
      expect(result.requirements).toBeInstanceOf(Array);
      expect(result.requirements.length).toBeGreaterThan(0);

      // Validate against schema
      const validated = RequirementsOutputSchema.parse(result);
      expect(validated).toBeDefined();
    });

    it('should handle complex PRD with ambiguities', async () => {
      // Arrange
      const prdContent = await readFile(join(FIXTURES_DIR, 'complex-prd.md'), 'utf-8');
      const sessionId = 'test-session-002';

      const mockOutput: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'complex-prd.md',
          total_requirements: 15,
          complexity_average: 6.8,
          confidence_average: 0.68, // Lower confidence due to ambiguities
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            type: 'functional',
            priority: 'high',
            complexity: 7,
            title: 'Vendor Registration',
            description: 'Vendors can register with business info, tax details, and banking information',
            acceptance_criteria: [
              'Collect business information',
              'Collect tax details',
              'Collect banking information for payouts',
            ],
            dependencies: [],
            confidence: 0.60, // Low confidence - fields TBD
            status: 'draft',
            issues: [
              {
                type: 'ambiguous',
                severity: 'medium',
                description: 'Exact fields for business registration are TBD pending legal review',
              },
            ],
          },
          {
            id: 'REQ-PERF-001',
            type: 'performance',
            priority: 'medium',
            complexity: 5,
            title: 'Search Performance',
            description: 'Product search should be fast with various filters',
            acceptance_criteria: [
              'Search returns results quickly',
              'Support price range filter',
              'Support category filter',
              'Support brand filter',
              'Support ratings filter',
            ],
            dependencies: ['REQ-FUNC-003'],
            confidence: 0.50, // Very low - "fast" is ambiguous
            status: 'draft',
            issues: [
              {
                type: 'ambiguous',
                severity: 'high',
                description: 'Definition of "fast" is unclear - needs specific latency target',
              },
            ],
          },
        ],
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      // Act
      const result = await analyzePRD(prdContent, sessionId);

      // Assert
      expect(result.metadata.total_requirements).toBeGreaterThan(5);
      expect(result.metadata.confidence_average).toBeLessThan(0.8); // Should detect ambiguities

      // Check that issues are flagged
      const reqsWithIssues = result.requirements.filter((r) => r.issues.length > 0);
      expect(reqsWithIssues.length).toBeGreaterThan(0);

      // Validate schema
      RequirementsOutputSchema.parse(result);
    });

    it('should handle minimal PRD', async () => {
      // Arrange
      const prdContent = await readFile(join(FIXTURES_DIR, 'minimal-prd.md'), 'utf-8');
      const sessionId = 'test-session-003';

      const mockOutput: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'minimal-prd.md',
          total_requirements: 3,
          complexity_average: 2.3,
          confidence_average: 0.85,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            type: 'functional',
            priority: 'medium',
            complexity: 2,
            title: 'Theme Toggle',
            description: 'Users can toggle between light and dark themes',
            acceptance_criteria: ['Toggle switch in settings', 'Instant theme switch'],
            dependencies: [],
            confidence: 0.9,
            status: 'draft',
            issues: [],
          },
        ],
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      // Act
      const result = await analyzePRD(prdContent, sessionId);

      // Assert
      expect(result.requirements.length).toBeGreaterThan(0);
      expect(result.requirements.length).toBeLessThan(10);
      RequirementsOutputSchema.parse(result);
    });

    it('should handle edge cases in PRD structure', async () => {
      // Arrange
      const prdContent = await readFile(join(FIXTURES_DIR, 'edge-case-prd.md'), 'utf-8');
      const sessionId = 'test-session-004';

      const mockOutput: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'edge-case-prd.md',
          total_requirements: 5,
          complexity_average: 7.0,
          confidence_average: 0.35, // Very low - many ambiguities
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            type: 'functional',
            priority: 'high',
            complexity: 8,
            title: 'AI Assistant Chat Interface',
            description: 'AI assistant should answer questions via chat interface',
            acceptance_criteria: [
              'Chat interface in app',
              'AI can answer user questions',
            ],
            dependencies: [],
            confidence: 0.40,
            status: 'draft',
            issues: [
              {
                type: 'ambiguous',
                severity: 'high',
                description: 'AI provider not specified (GPT vs Claude)',
              },
              {
                type: 'ambiguous',
                severity: 'medium',
                description: 'Chat UI location unclear (modal vs inline)',
              },
              {
                type: 'incomplete',
                severity: 'high',
                description: 'Data privacy requirements undefined',
              },
            ],
          },
        ],
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      // Act
      const result = await analyzePRD(prdContent, sessionId);

      // Assert
      expect(result.metadata.confidence_average).toBeLessThan(0.6);

      // Should flag multiple issues
      const totalIssues = result.requirements.reduce((sum, r) => sum + r.issues.length, 0);
      expect(totalIssues).toBeGreaterThan(0);

      RequirementsOutputSchema.parse(result);
    });
  });

  describe('Metadata Generation', () => {
    it('should generate accurate metadata', async () => {
      // Arrange
      const prdContent = await readFile(join(FIXTURES_DIR, 'simple-prd.md'), 'utf-8');
      const sessionId = 'test-session-005';

      const mockOutput: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'simple-prd.md',
          total_requirements: 8,
          complexity_average: 3.5,
          confidence_average: 0.92,
        },
        requirements: Array(8).fill(null).map((_, i) => ({
          id: `REQ-FUNC-${String(i + 1).padStart(3, '0')}`,
          type: 'functional',
          priority: 'medium',
          complexity: 3,
          title: `Requirement ${i + 1}`,
          description: `Description ${i + 1}`,
          acceptance_criteria: [`Criterion ${i + 1}`],
          dependencies: [],
          confidence: 0.9,
          status: 'draft',
          issues: [],
        })),
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      // Act
      const result = await analyzePRD(prdContent, sessionId);

      // Assert
      expect(result.metadata.total_requirements).toBe(result.requirements.length);
      expect(result.metadata.analyzed_at).toBeDefined();
      expect(result.metadata.prd_source).toBeDefined();
      expect(result.metadata.complexity_average).toBeGreaterThan(0);
      expect(result.metadata.complexity_average).toBeLessThanOrEqual(10);
      expect(result.metadata.confidence_average).toBeGreaterThan(0);
      expect(result.metadata.confidence_average).toBeLessThanOrEqual(1);
    });

    it('should calculate correct complexity average', async () => {
      // Arrange
      const prdContent = 'Test PRD content';
      const sessionId = 'test-session-006';

      const mockOutput: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'test.md',
          total_requirements: 3,
          complexity_average: 5.0, // (3 + 5 + 7) / 3
          confidence_average: 0.87,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            type: 'functional',
            priority: 'low',
            complexity: 3,
            title: 'Simple Requirement',
            description: 'Description',
            acceptance_criteria: ['Criterion'],
            dependencies: [],
            confidence: 0.9,
            status: 'draft',
            issues: [],
          },
          {
            id: 'REQ-FUNC-002',
            type: 'functional',
            priority: 'medium',
            complexity: 5,
            title: 'Medium Requirement',
            description: 'Description',
            acceptance_criteria: ['Criterion'],
            dependencies: [],
            confidence: 0.85,
            status: 'draft',
            issues: [],
          },
          {
            id: 'REQ-FUNC-003',
            type: 'functional',
            priority: 'high',
            complexity: 7,
            title: 'Complex Requirement',
            description: 'Description',
            acceptance_criteria: ['Criterion'],
            dependencies: [],
            confidence: 0.85,
            status: 'draft',
            issues: [],
          },
        ],
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      // Act
      const result = await analyzePRD(prdContent, sessionId);

      // Assert
      const expectedAvg = (3 + 5 + 7) / 3;
      expect(result.metadata.complexity_average).toBeCloseTo(expectedAvg, 1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for empty PRD content', async () => {
      // Arrange
      const prdContent = '';
      const sessionId = 'test-session-007';

      // Act & Assert
      await expect(analyzePRD(prdContent, sessionId)).rejects.toThrow();
    });

    it('should throw error for invalid session ID', async () => {
      // Arrange
      const prdContent = 'Valid PRD content';
      const sessionId = '';

      // Act & Assert
      await expect(analyzePRD(prdContent, sessionId)).rejects.toThrow();
    });

    it('should handle LLM provider failures gracefully', async () => {
      // Arrange
      const prdContent = 'Test PRD content';
      const sessionId = 'test-session-008';

      mockGenerateStructured.mockRejectedValue(new Error('Provider timeout'));

      // Act & Assert
      await expect(analyzePRD(prdContent, sessionId)).rejects.toThrow('Provider timeout');
    });
  });

  describe('Output Validation', () => {
    it('should produce output that passes schema validation', async () => {
      // Arrange
      const prdContent = await readFile(join(FIXTURES_DIR, 'simple-prd.md'), 'utf-8');
      const sessionId = 'test-session-009';

      const mockOutput: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'simple-prd.md',
          total_requirements: 2,
          complexity_average: 3.5,
          confidence_average: 0.92,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            type: 'functional',
            priority: 'high',
            complexity: 3,
            title: 'User Registration',
            description: 'Users must be able to register',
            acceptance_criteria: ['Email validation', 'Password strength'],
            dependencies: [],
            confidence: 0.95,
            status: 'draft',
            issues: [],
          },
          {
            id: 'REQ-PERF-001',
            type: 'performance',
            priority: 'medium',
            complexity: 4,
            title: 'Page Load Time',
            description: 'Pages must load within 2 seconds',
            acceptance_criteria: ['Load time < 2s'],
            dependencies: [],
            confidence: 0.89,
            status: 'draft',
            issues: [],
          },
        ],
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      // Act
      const result = await analyzePRD(prdContent, sessionId);

      // Assert - should not throw
      expect(() => RequirementsOutputSchema.parse(result)).not.toThrow();
    });

    it('should validate requirement IDs follow correct format', async () => {
      // Arrange
      const prdContent = 'Test PRD';
      const sessionId = 'test-session-010';

      const mockOutput: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'test.md',
          total_requirements: 4,
          complexity_average: 4.0,
          confidence_average: 0.90,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            type: 'functional',
            priority: 'high',
            complexity: 4,
            title: 'Functional Requirement',
            description: 'Description',
            acceptance_criteria: ['Criterion'],
            dependencies: [],
            confidence: 0.9,
            status: 'draft',
            issues: [],
          },
          {
            id: 'REQ-PERF-001',
            type: 'performance',
            priority: 'high',
            complexity: 4,
            title: 'Performance Requirement',
            description: 'Description',
            acceptance_criteria: ['Criterion'],
            dependencies: [],
            confidence: 0.9,
            status: 'draft',
            issues: [],
          },
          {
            id: 'REQ-SEC-001',
            type: 'security',
            priority: 'critical',
            complexity: 4,
            title: 'Security Requirement',
            description: 'Description',
            acceptance_criteria: ['Criterion'],
            dependencies: [],
            confidence: 0.9,
            status: 'draft',
            issues: [],
          },
          {
            id: 'REQ-CONS-001',
            type: 'constraint',
            priority: 'high',
            complexity: 4,
            title: 'Constraint Requirement',
            description: 'Description',
            acceptance_criteria: ['Criterion'],
            dependencies: [],
            confidence: 0.9,
            status: 'draft',
            issues: [],
          },
        ],
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      // Act
      const result = await analyzePRD(prdContent, sessionId);

      // Assert
      result.requirements.forEach((req: Requirement) => {
        expect(req.id).toMatch(/^REQ-(FUNC|PERF|SEC|CONS)-\d{3}$/);
      });
    });
  });

  describe('Performance', () => {
    it('should complete analysis within 2 minutes', async () => {
      // Arrange
      const prdContent = await readFile(join(FIXTURES_DIR, 'complex-prd.md'), 'utf-8');
      const sessionId = 'test-session-011';
      const maxDuration = 120000; // 2 minutes in ms

      const mockOutput: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'complex-prd.md',
          total_requirements: 1,
          complexity_average: 5.0,
          confidence_average: 0.80,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            type: 'functional',
            priority: 'medium',
            complexity: 5,
            title: 'Test Requirement',
            description: 'Description',
            acceptance_criteria: ['Criterion'],
            dependencies: [],
            confidence: 0.8,
            status: 'draft',
            issues: [],
          },
        ],
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      // Act
      const startTime = Date.now();
      await analyzePRD(prdContent, sessionId);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(maxDuration);
    }, 120000); // 2 minute timeout for test
  });
});
