import { describe, it, expect } from 'vitest';
import { generateTDD } from '../../../src/skills/tdd-generator.js';
import type { RequirementsOutput } from '../../../src/types/requirement.js';
import type { ComponentsOutput } from '../../../src/types/component.js';

describe('TDD Generator', () => {
  describe('Core Functionality', () => {
    it('should generate TDD from requirements and components', async () => {
      const requirements: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'test',
          total_requirements: 2,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            title: 'User Authentication',
            description: 'Users must be able to log in securely',
            type: 'functional',
            priority: 'critical',
            complexity: 5,
            acceptance_criteria: ['Users can log in', 'Passwords are hashed'],
            dependencies: [],
          },
          {
            id: 'REQ-FUNC-002',
            title: 'User Profile',
            description: 'Users can view and edit their profile',
            type: 'functional',
            priority: 'high',
            complexity: 3,
            acceptance_criteria: ['Profile displays correctly', 'Users can edit details'],
            dependencies: ['REQ-FUNC-001'],
          },
        ],
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
            name: 'Login Form',
            type: 'Form',
            category: 'organism',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: {
              screens: ['Login'],
              instances: 1,
            },
          },
        ],
        design_tokens: {},
      };

      const result = await generateTDD(requirements, components, 'test-session', {
        saveOutput: false,
        projectName: 'Test Project',
      });

      expect(result).toBeDefined();
      expect(result.title).toContain('Test Project');
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('should generate valid OpenAPI specification', async () => {
      const requirements: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'test',
          total_requirements: 1,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            title: 'Get User',
            description: 'API endpoint to retrieve user data',
            type: 'functional',
            priority: 'high',
            complexity: 2,
            acceptance_criteria: ['Returns user data'],
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

      const result = await generateTDD(requirements, components, 'test-session', {
        saveOutput: false,
      });

      expect(result.api_spec).toBeDefined();
      expect(result.api_spec.openapi).toBe('3.1.0');
      expect(result.api_spec.info).toBeDefined();
      expect(result.api_spec.paths).toBeDefined();
      expect(Object.keys(result.api_spec.paths).length).toBeGreaterThan(0);
    });

    it('should generate database schema', async () => {
      const requirements: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'test',
          total_requirements: 1,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            title: 'User Management',
            description: 'Store and manage user data',
            type: 'functional',
            priority: 'critical',
            complexity: 5,
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

      const result = await generateTDD(requirements, components, 'test-session', {
        saveOutput: false,
      });

      expect(result.database_schema).toBeDefined();
      expect(result.database_schema.tables).toBeDefined();
      expect(result.database_schema.tables.length).toBeGreaterThan(0);
      expect(result.database_schema.indexes).toBeDefined();
    });

    it('should generate implementation tasks', async () => {
      const requirements: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'test',
          total_requirements: 3,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            title: 'Task 1',
            description: 'First task',
            type: 'functional',
            priority: 'high',
            complexity: 5,
            acceptance_criteria: [],
            dependencies: [],
          },
          {
            id: 'REQ-FUNC-002',
            title: 'Task 2',
            description: 'Second task',
            type: 'functional',
            priority: 'medium',
            complexity: 3,
            acceptance_criteria: [],
            dependencies: ['REQ-FUNC-001'],
          },
          {
            id: 'REQ-FUNC-003',
            title: 'Task 3',
            description: 'Third task',
            type: 'functional',
            priority: 'low',
            complexity: 2,
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

      const result = await generateTDD(requirements, components, 'test-session', {
        saveOutput: false,
      });

      expect(result.tasks).toBeDefined();
      expect(result.tasks.length).toBeGreaterThan(0);
      expect(result.tasks[0]?.id).toMatch(/^TASK-\d{3}$/);
      expect(result.tasks[0]?.effort_estimate).toBeGreaterThan(0);
    });

    it('should include architecture diagram', async () => {
      const requirements: RequirementsOutput = {
        metadata: {
          analyzed_at: new Date().toISOString(),
          prd_source: 'test',
          total_requirements: 1,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            title: 'Feature',
            description: 'A feature',
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

      const result = await generateTDD(requirements, components, 'test-session', {
        saveOutput: false,
      });

      expect(result.architecture_diagram).toBeDefined();
      expect(result.architecture_diagram.length).toBeGreaterThan(0);
      expect(result.architecture_diagram).toContain('graph');
    });
  });
});
