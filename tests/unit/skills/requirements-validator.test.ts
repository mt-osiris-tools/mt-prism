import { describe, it, expect } from 'vitest';
import { validateRequirements } from '../../../src/skills/requirements-validator.js';
import type { RequirementsOutput } from '../../../src/types/requirement.js';
import type { ComponentsOutput } from '../../../src/types/component.js';

describe('Requirements Validator', () => {
  describe('Core Functionality', () => {
    it('should detect missing UI for functional requirements', async () => {
      const requirements: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'test',
          total_requirements: 1,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            title: 'User login',
            description: 'Users must be able to log in',
            type: 'functional',
            priority: 'high',
            complexity: 5,
            acceptance_criteria: ['User can enter credentials'],
            dependencies: [],
          },
        ],
      };

      const components: ComponentsOutput = {
        metadata: {
          figma_file_id: 'test',
          analyzed_at: new Date().toISOString(),
          total_components: 0,
        },
        components: [],
        design_tokens: {},
      };

      const result = await validateRequirements(requirements, components, 'test-session', {
        saveOutput: false,
      });

      expect(result.gaps.length).toBeGreaterThan(0);
      const missingUI = result.gaps.find(g => g.type === 'missing_ui');
      expect(missingUI).toBeDefined();
      expect(missingUI?.requirement_id).toBe('REQ-FUNC-001');
    });

    it('should detect orphaned components with no requirements', async () => {
      const requirements: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'test',
          total_requirements: 0,
        },
        requirements: [],
      };

      const components: ComponentsOutput = {
        metadata: {
          figma_file_id: 'test',
          analyzed_at: new Date().toISOString(),
          total_components: 1,
        },
        components: [
          {
            id: 'COMP-001',
            name: 'Unused Button',
            type: 'Button',
            category: 'atom',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: {
              screens: ['Design'],
              instances: 1,
            },
          },
        ],
        design_tokens: {},
      };

      const result = await validateRequirements(requirements, components, 'test-session', {
        saveOutput: false,
      });

      expect(result.gaps.length).toBeGreaterThan(0);
      const orphaned = result.gaps.find(g => g.type === 'no_requirement');
      expect(orphaned).toBeDefined();
      expect(orphaned?.component_id).toBe('COMP-001');
    });

    it('should detect missing acceptance criteria', async () => {
      const requirements: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'test',
          total_requirements: 1,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            title: 'User profile',
            description: 'Users need a profile page',
            type: 'functional',
            priority: 'medium',
            complexity: 3,
            acceptance_criteria: [], // Empty!
            dependencies: [],
          },
        ],
      };

      const components: ComponentsOutput = {
        metadata: {
          figma_file_id: 'test',
          analyzed_at: new Date().toISOString(),
          total_components: 0,
        },
        components: [],
        design_tokens: {},
      };

      const result = await validateRequirements(requirements, components, 'test-session', {
        saveOutput: false,
      });

      const missingCriteria = result.gaps.find(g => g.type === 'missing_acceptance_criteria');
      expect(missingCriteria).toBeDefined();
      expect(missingCriteria?.requirement_id).toBe('REQ-FUNC-001');
    });

    it('should calculate gap statistics correctly', async () => {
      const requirements: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'test',
          total_requirements: 2,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            title: 'Critical feature',
            description: 'Must have this',
            type: 'functional',
            priority: 'critical',
            complexity: 8,
            acceptance_criteria: [],
            dependencies: [],
          },
          {
            id: 'REQ-FUNC-002',
            title: 'Medium feature',
            description: 'Nice to have',
            type: 'functional',
            priority: 'medium',
            complexity: 3,
            acceptance_criteria: [],
            dependencies: [],
          },
        ],
      };

      const components: ComponentsOutput = {
        metadata: {
          figma_file_id: 'test',
          analyzed_at: new Date().toISOString(),
          total_components: 0,
        },
        components: [],
        design_tokens: {},
      };

      const result = await validateRequirements(requirements, components, 'test-session', {
        saveOutput: false,
      });

      expect(result.metadata.total_gaps).toBeGreaterThan(0);
      expect(result.metadata.high_count).toBeGreaterThan(0); // Critical req should generate high severity gaps
      expect(result.metadata.medium_count).toBeGreaterThan(0);
    });
  });
});
