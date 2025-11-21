import { describe, it, expect } from 'vitest';
import { classifyRequirement, assignPriority, calculateComplexity } from '../../../src/skills/prd-analyzer/classifier.js';
import type { RequirementType, RequirementPriority } from '../../../src/types/requirement.js';

describe('Requirement Classification', () => {
  describe('Type Classification', () => {
    it('should classify functional requirements correctly', () => {
      const testCases = [
        {
          text: 'Users must be able to create new tasks',
          expected: 'functional' as RequirementType,
        },
        {
          text: 'The system shall allow users to upload files',
          expected: 'functional' as RequirementType,
        },
        {
          text: 'Users can filter results by category',
          expected: 'functional' as RequirementType,
        },
        {
          text: 'The application should support user registration',
          expected: 'functional' as RequirementType,
        },
      ];

      testCases.forEach(({ text, expected }) => {
        const result = classifyRequirement(text);
        expect(result.type).toBe(expected);
      });
    });

    it('should classify performance requirements correctly', () => {
      const testCases = [
        {
          text: 'The page must load within 2 seconds',
          expected: 'performance' as RequirementType,
        },
        {
          text: 'System should handle 10,000 concurrent users',
          expected: 'performance' as RequirementType,
        },
        {
          text: 'API response time must be under 500ms',
          expected: 'performance' as RequirementType,
        },
        {
          text: 'Database queries should complete in less than 100ms',
          expected: 'performance' as RequirementType,
        },
        {
          text: 'The application must scale to support 1 million users',
          expected: 'performance' as RequirementType,
        },
      ];

      testCases.forEach(({ text, expected }) => {
        const result = classifyRequirement(text);
        expect(result.type).toBe(expected);
      });
    });

    it('should classify security requirements correctly', () => {
      const testCases = [
        {
          text: 'All passwords must be hashed using bcrypt',
          expected: 'security' as RequirementType,
        },
        {
          text: 'The system shall encrypt all sensitive data at rest',
          expected: 'security' as RequirementType,
        },
        {
          text: 'API endpoints must be protected with JWT authentication',
          expected: 'security' as RequirementType,
        },
        {
          text: 'User sessions must expire after 24 hours',
          expected: 'security' as RequirementType,
        },
        {
          text: 'The application must comply with PCI DSS standards',
          expected: 'security' as RequirementType,
        },
      ];

      testCases.forEach(({ text, expected }) => {
        const result = classifyRequirement(text);
        expect(result.type).toBe(expected);
      });
    });

    it('should classify constraint requirements correctly', () => {
      const testCases = [
        {
          text: 'The system must use PostgreSQL database',
          expected: 'constraint' as RequirementType,
        },
        {
          text: 'Application must be built with React framework',
          expected: 'constraint' as RequirementType,
        },
        {
          text: 'Must integrate with existing OAuth 2.0 service',
          expected: 'constraint' as RequirementType,
        },
        {
          text: 'Deployment must be on AWS infrastructure',
          expected: 'constraint' as RequirementType,
        },
        {
          text: 'The project must be completed within 6 months',
          expected: 'constraint' as RequirementType,
        },
      ];

      testCases.forEach(({ text, expected }) => {
        const result = classifyRequirement(text);
        expect(result.type).toBe(expected);
      });
    });

    it('should handle ambiguous requirements with default classification', () => {
      const ambiguousText = 'The system should work well';
      const result = classifyRequirement(ambiguousText);

      // Should default to functional or mark as low confidence
      expect(result.type).toBeDefined();
      expect(result.confidence).toBeLessThan(0.7); // Low confidence for ambiguous
    });
  });

  describe('Priority Assignment', () => {
    it('should assign critical priority to security and compliance requirements', () => {
      const testCases = [
        'All passwords must be encrypted',
        'System must comply with HIPAA regulations',
        'PCI DSS compliance is mandatory',
        'Data breach notification within 72 hours required',
      ];

      testCases.forEach((text) => {
        const priority = assignPriority(text, 'security');
        expect(priority).toBe('critical');
      });
    });

    it('should assign high priority to core functional requirements', () => {
      const testCases = [
        'Users must be able to create accounts',
        'The system shall process payments',
        'Users must be able to login',
        'Core feature: product catalog',
      ];

      testCases.forEach((text) => {
        const priority = assignPriority(text, 'functional');
        expect(['high', 'critical']).toContain(priority);
      });
    });

    it('should assign medium priority to enhancement features', () => {
      const testCases = [
        'Users should be able to customize themes',
        'The system could provide analytics dashboard',
        'Nice to have: export functionality',
        'Optional feature: social sharing',
      ];

      testCases.forEach((text) => {
        const priority = assignPriority(text, 'functional');
        expect(['medium', 'low']).toContain(priority);
      });
    });

    it('should assign low priority to optional features', () => {
      const testCases = [
        'Optional: dark mode support',
        'Future consideration: mobile app',
        'Phase 2: advanced search',
        'If time permits: keyboard shortcuts',
      ];

      testCases.forEach((text) => {
        const priority = assignPriority(text, 'functional');
        expect(priority).toBe('low');
      });
    });

    it('should consider requirement type in priority assignment', () => {
      const text = 'The system should respond quickly';

      const perfPriority = assignPriority(text, 'performance');
      const funcPriority = assignPriority(text, 'functional');

      // Performance requirement about speed should be higher priority
      expect(perfPriority).not.toBe('low');
    });
  });

  describe('Complexity Calculation', () => {
    it('should assign low complexity (1-3) to simple requirements', () => {
      const testCases = [
        {
          text: 'Add a logout button',
          acceptanceCriteria: ['Button displays in header', 'Clicking logs out user'],
          dependencies: [],
        },
        {
          text: 'Display user email in profile',
          acceptanceCriteria: ['Email shown on profile page'],
          dependencies: [],
        },
      ];

      testCases.forEach((req) => {
        const complexity = calculateComplexity(
          req.text,
          req.acceptanceCriteria,
          req.dependencies
        );
        expect(complexity).toBeGreaterThanOrEqual(1);
        expect(complexity).toBeLessThanOrEqual(3);
      });
    });

    it('should assign medium complexity (4-6) to moderate requirements', () => {
      const testCases = [
        {
          text: 'Implement user registration with email verification',
          acceptanceCriteria: [
            'Registration form with validation',
            'Send verification email',
            'Verify email token',
            'Activate account',
          ],
          dependencies: ['REQ-FUNC-001'],
        },
        {
          text: 'Create shopping cart with persistence',
          acceptanceCriteria: [
            'Add/remove items',
            'Update quantities',
            'Calculate totals',
            'Persist across sessions',
          ],
          dependencies: ['REQ-FUNC-002', 'REQ-FUNC-003'],
        },
      ];

      testCases.forEach((req) => {
        const complexity = calculateComplexity(
          req.text,
          req.acceptanceCriteria,
          req.dependencies
        );
        expect(complexity).toBeGreaterThanOrEqual(4);
        expect(complexity).toBeLessThanOrEqual(6);
      });
    });

    it('should assign high complexity (7-10) to complex requirements', () => {
      const testCases = [
        {
          text: 'Implement real-time collaborative editing with conflict resolution',
          acceptanceCriteria: [
            'WebSocket connection',
            'Operational transformation',
            'Conflict detection',
            'Merge strategy',
            'Undo/redo support',
            'Cursor position tracking',
            'User presence indicators',
            'Offline sync when reconnected',
          ],
          dependencies: ['REQ-FUNC-001', 'REQ-FUNC-005', 'REQ-PERF-002'],
        },
        {
          text: 'Build ML-powered recommendation engine',
          acceptanceCriteria: [
            'Data collection pipeline',
            'Feature engineering',
            'Model training',
            'A/B testing framework',
            'Real-time inference',
            'Model monitoring',
            'Personalization rules',
          ],
          dependencies: ['REQ-FUNC-010', 'REQ-PERF-005', 'REQ-SEC-003'],
        },
      ];

      testCases.forEach((req) => {
        const complexity = calculateComplexity(
          req.text,
          req.acceptanceCriteria,
          req.dependencies
        );
        expect(complexity).toBeGreaterThanOrEqual(7);
        expect(complexity).toBeLessThanOrEqual(10);
      });
    });

    it('should factor acceptance criteria count into complexity', () => {
      const baseReq = {
        text: 'Implement feature X',
        dependencies: [],
      };

      const simple = calculateComplexity(baseReq.text, ['Single criterion'], baseReq.dependencies);
      const moderate = calculateComplexity(
        baseReq.text,
        ['Criterion 1', 'Criterion 2', 'Criterion 3', 'Criterion 4'],
        baseReq.dependencies
      );
      const complex = calculateComplexity(
        baseReq.text,
        Array(10).fill('Criterion'),
        baseReq.dependencies
      );

      expect(complex).toBeGreaterThan(moderate);
      expect(moderate).toBeGreaterThan(simple);
    });

    it('should factor dependency count into complexity', () => {
      const baseReq = {
        text: 'Implement feature Y',
        acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
      };

      const noDeps = calculateComplexity(baseReq.text, baseReq.acceptanceCriteria, []);
      const fewDeps = calculateComplexity(
        baseReq.text,
        baseReq.acceptanceCriteria,
        ['REQ-001', 'REQ-002']
      );
      const manyDeps = calculateComplexity(
        baseReq.text,
        baseReq.acceptanceCriteria,
        ['REQ-001', 'REQ-002', 'REQ-003', 'REQ-004', 'REQ-005']
      );

      expect(manyDeps).toBeGreaterThan(fewDeps);
      expect(fewDeps).toBeGreaterThan(noDeps);
    });

    it('should recognize technical complexity keywords', () => {
      const simpleText = 'Display a list of items';
      const complexText = 'Implement distributed transaction coordinator with two-phase commit and saga pattern';

      const simpleComplexity = calculateComplexity(simpleText, ['Display list'], []);
      const complexComplexity = calculateComplexity(complexText, ['Implement coordinator'], []);

      expect(complexComplexity).toBeGreaterThan(simpleComplexity);
    });

    it('should never return complexity outside 1-10 range', () => {
      const edgeCases = [
        { text: '', criteria: [], deps: [] },
        { text: 'Simple', criteria: ['One'], deps: [] },
        { text: 'Complex distributed system', criteria: Array(20).fill('Criterion'), deps: Array(10).fill('REQ-001') },
      ];

      edgeCases.forEach((req) => {
        const complexity = calculateComplexity(req.text, req.criteria, req.deps);
        expect(complexity).toBeGreaterThanOrEqual(1);
        expect(complexity).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings gracefully', () => {
      const result = classifyRequirement('');
      expect(result.type).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5); // Very low confidence
    });

    it('should handle requirements with mixed signals', () => {
      // Requirement has both functional and performance aspects
      const text = 'Users must be able to search products with results returned in under 1 second';
      const result = classifyRequirement(text);

      // Should choose one type (likely performance due to time constraint)
      expect(['functional', 'performance']).toContain(result.type);
      expect(result.confidence).toBeLessThan(0.9); // Some uncertainty
    });

    it('should handle requirements with unclear language', () => {
      const text = 'The system should probably do something with the data maybe';
      const result = classifyRequirement(text);

      expect(result.type).toBeDefined();
      expect(result.confidence).toBeLessThan(0.6); // Low confidence
    });

    it('should handle very long requirement descriptions', () => {
      const longText = 'The system ' + 'must handle user authentication and authorization '.repeat(50);
      const result = classifyRequirement(longText);

      expect(result.type).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle requirements in different phrasings', () => {
      // Same requirement, different phrasings
      const phrasings = [
        'Users must be able to login',
        'The system shall support user authentication',
        'User login functionality required',
        'Support for user sign-in',
      ];

      const results = phrasings.map((text) => classifyRequirement(text));

      // All should be classified as functional
      results.forEach((result) => {
        expect(result.type).toBe('functional');
      });
    });
  });

  describe('Confidence Scoring', () => {
    it('should return high confidence for clear requirements', () => {
      const clearRequirements = [
        'All passwords must be hashed using bcrypt',
        'The page must load within 2 seconds',
        'Users can create new tasks',
      ];

      clearRequirements.forEach((text) => {
        const result = classifyRequirement(text);
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    it('should return low confidence for ambiguous requirements', () => {
      const ambiguousRequirements = [
        'The system should work well',
        'Make it fast',
        'Improve user experience',
        'Something about security',
      ];

      ambiguousRequirements.forEach((text) => {
        const result = classifyRequirement(text);
        expect(result.confidence).toBeLessThan(0.6);
      });
    });

    it('should return medium confidence for partially clear requirements', () => {
      const partialRequirements = [
        'The system should respond quickly to user actions',
        'Security measures should be in place',
        'Users need some way to manage their data',
      ];

      partialRequirements.forEach((text) => {
        const result = classifyRequirement(text);
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.confidence).toBeLessThan(0.8);
      });
    });
  });
});
