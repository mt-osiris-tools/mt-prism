import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { analyzeFigmaDesign } from '../../../src/skills/figma-analyzer.js';
import type { ComponentsOutput } from '../../../src/types/component.js';

// Mock LLM provider
const mockGenerateStructured = vi.fn();
const mockProvider = {
  generateStructured: mockGenerateStructured,
  getInfo: vi.fn(() => ({ name: 'mock-provider', model: 'mock-model' })),
  generateText: vi.fn(),
  streamText: vi.fn(),
  estimateCost: vi.fn(() => 0.01),
};

vi.mock('../../../src/providers/index.js', () => ({
  createLLMProvider: vi.fn(() => Promise.resolve(mockProvider)),
}));

describe('Figma Analyzer', () => {
  const FIXTURES_DIR = join(process.cwd(), 'tests/fixtures/figma');

  beforeEach(() => {
    mockGenerateStructured.mockClear();
  });

  describe('Core Functionality', () => {
    it('should extract components from simple design system', async () => {
      // Arrange
      const figmaData = await readFile(join(FIXTURES_DIR, 'simple-design-system.json'), 'utf-8');
      const sessionId = 'test-session-figma-001';

      const mockOutput: ComponentsOutput = {
        metadata: {
          figma_file_id: 'simple-task-manager',
          figma_file_name: 'Simple Task Manager Design System',
          analyzed_at: new Date().toISOString(),
          total_components: 3,
        },
        components: [
          {
            id: 'COMP-001',
            name: 'Button/Primary',
            type: 'Button',
            category: 'atom',
            variants: [
              {
                name: 'size=medium',
                properties: { size: 'medium', disabled: false },
              },
            ],
            properties: [
              {
                name: 'size',
                type: 'VARIANT',
                default_value: 'medium',
                description: 'Button size variant',
              },
            ],
            design_tokens: {
              colors: {
                background: 'rgba(51, 102, 204, 1.0)',
                text: 'rgba(255, 255, 255, 1.0)',
              },
              typography: {
                fontFamily: 'Inter',
                fontWeight: 600,
                fontSize: 14,
              },
            },
            usage: {
              screens: ['Components'],
              instances: 1,
            },
          },
          {
            id: 'COMP-002',
            name: 'Input/Text',
            type: 'Input',
            category: 'atom',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: {
              screens: ['Components'],
              instances: 1,
            },
          },
          {
            id: 'COMP-003',
            name: 'Card/Task',
            type: 'Card',
            category: 'molecule',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: {
              screens: ['Components'],
              instances: 1,
            },
          },
        ],
        design_tokens: {
          colors: {
            'primary-500': 'rgba(51, 102, 204, 1.0)',
            'gray-300': 'rgba(204, 204, 204, 1.0)',
          },
        },
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      // Act
      const result = await analyzeFigmaDesign(figmaData, sessionId, { saveOutput: false });

      // Assert
      expect(result).toBeDefined();
      expect(result.metadata.total_components).toBe(3);
      expect(result.components).toHaveLength(3);
      expect(result.components[0]?.name).toBe('Button/Primary');
      expect(result.components[1]?.name).toBe('Input/Text');
      expect(result.components[2]?.name).toBe('Card/Task');
    });

    it('should handle complex design with variants', async () => {
      // Arrange
      const figmaData = await readFile(join(FIXTURES_DIR, 'complex-ecommerce-design.json'), 'utf-8');
      const sessionId = 'test-session-figma-002';

      const mockOutput: ComponentsOutput = {
        metadata: {
          figma_file_id: 'ecommerce-platform',
          figma_file_name: 'E-Commerce Platform Design System',
          analyzed_at: new Date().toISOString(),
          total_components: 9,
        },
        components: [
          {
            id: 'COMP-001',
            name: 'ProductCard',
            type: 'Card',
            category: 'molecule',
            variants: [
              {
                name: 'layout=grid, state=default',
                properties: { layout: 'grid', state: 'default' },
              },
              {
                name: 'layout=list, state=default',
                properties: { layout: 'list', state: 'default' },
              },
              {
                name: 'layout=grid, state=hover',
                properties: { layout: 'grid', state: 'hover' },
              },
            ],
            properties: [],
            design_tokens: {},
            usage: {
              screens: ['Components', 'ProductGrid'],
              instances: 8,
            },
          },
        ],
        design_tokens: {},
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      // Act
      const result = await analyzeFigmaDesign(figmaData, sessionId, { saveOutput: false });

      // Assert
      expect(result.components[0]?.variants).toHaveLength(3);
      expect(result.components[0]?.variants[0]?.properties).toHaveProperty('layout', 'grid');
      expect(result.components[0]?.variants[0]?.properties).toHaveProperty('state', 'default');
    });

    it('should handle edge cases gracefully', async () => {
      // Arrange
      const figmaData = await readFile(join(FIXTURES_DIR, 'edge-case-design.json'), 'utf-8');
      const sessionId = 'test-session-figma-003';

      const mockOutput: ComponentsOutput = {
        metadata: {
          figma_file_id: 'edge-cases',
          figma_file_name: 'Edge Case Design',
          analyzed_at: new Date().toISOString(),
          total_components: 5,
        },
        components: [
          {
            id: 'COMP-001',
            name: 'UnnamedComponent',
            type: 'Frame',
            category: 'atom',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: {
              screens: ['Components'],
              instances: 1,
            },
          },
        ],
        design_tokens: {},
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      // Act
      const result = await analyzeFigmaDesign(figmaData, sessionId, { saveOutput: false });

      // Assert
      expect(result).toBeDefined();
      expect(result.components).toHaveLength(1);
    });
  });

  describe('Component Hierarchy Detection', () => {
    it('should categorize simple components as atoms', async () => {
      const figmaData = await readFile(join(FIXTURES_DIR, 'simple-design-system.json'), 'utf-8');
      const sessionId = 'test-session-figma-hierarchy-001';

      const mockOutput: ComponentsOutput = {
        metadata: {
          figma_file_id: 'test',
          analyzed_at: new Date().toISOString(),
          total_components: 2,
        },
        components: [
          {
            id: 'COMP-001',
            name: 'Button',
            type: 'Button',
            category: 'atom',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: { screens: [], instances: 0 },
          },
          {
            id: 'COMP-002',
            name: 'Input',
            type: 'Input',
            category: 'atom',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: { screens: [], instances: 0 },
          },
        ],
        design_tokens: {},
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      const result = await analyzeFigmaDesign(figmaData, sessionId, { saveOutput: false });

      expect(result.components[0]?.category).toBe('atom');
      expect(result.components[1]?.category).toBe('atom');
    });

    it('should categorize composed components as molecules', async () => {
      const figmaData = await readFile(join(FIXTURES_DIR, 'simple-design-system.json'), 'utf-8');
      const sessionId = 'test-session-figma-hierarchy-002';

      const mockOutput: ComponentsOutput = {
        metadata: {
          figma_file_id: 'test',
          analyzed_at: new Date().toISOString(),
          total_components: 1,
        },
        components: [
          {
            id: 'COMP-001',
            name: 'Card/Task',
            type: 'Card',
            category: 'molecule',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: { screens: [], instances: 0 },
          },
        ],
        design_tokens: {},
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      const result = await analyzeFigmaDesign(figmaData, sessionId, { saveOutput: false });

      expect(result.components[0]?.category).toBe('molecule');
    });

    it('should categorize complex layouts as organisms', async () => {
      const figmaData = await readFile(join(FIXTURES_DIR, 'complex-ecommerce-design.json'), 'utf-8');
      const sessionId = 'test-session-figma-hierarchy-003';

      const mockOutput: ComponentsOutput = {
        metadata: {
          figma_file_id: 'test',
          analyzed_at: new Date().toISOString(),
          total_components: 2,
        },
        components: [
          {
            id: 'COMP-001',
            name: 'FilterSidebar',
            type: 'Sidebar',
            category: 'organism',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: { screens: [], instances: 0 },
          },
          {
            id: 'COMP-002',
            name: 'ProductGrid',
            type: 'Grid',
            category: 'organism',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: { screens: [], instances: 0 },
          },
        ],
        design_tokens: {},
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      const result = await analyzeFigmaDesign(figmaData, sessionId, { saveOutput: false });

      expect(result.components[0]?.category).toBe('organism');
      expect(result.components[1]?.category).toBe('organism');
    });
  });

  describe('Variant Handling', () => {
    it('should extract component variants correctly', async () => {
      const figmaData = await readFile(join(FIXTURES_DIR, 'complex-ecommerce-design.json'), 'utf-8');
      const sessionId = 'test-session-figma-variants-001';

      const mockOutput: ComponentsOutput = {
        metadata: {
          figma_file_id: 'test',
          analyzed_at: new Date().toISOString(),
          total_components: 1,
        },
        components: [
          {
            id: 'COMP-001',
            name: 'ProductCard',
            type: 'Card',
            category: 'molecule',
            variants: [
              {
                name: 'layout=grid, state=default',
                properties: { layout: 'grid', state: 'default' },
              },
              {
                name: 'layout=list, state=default',
                properties: { layout: 'list', state: 'default' },
              },
            ],
            properties: [],
            design_tokens: {},
            usage: { screens: [], instances: 0 },
          },
        ],
        design_tokens: {},
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      const result = await analyzeFigmaDesign(figmaData, sessionId, { saveOutput: false });

      expect(result.components[0]?.variants).toHaveLength(2);
      expect(result.components[0]?.variants[0]?.name).toBe('layout=grid, state=default');
      expect(result.components[0]?.variants[1]?.name).toBe('layout=list, state=default');
    });

    it('should handle variant properties correctly', async () => {
      const figmaData = await readFile(join(FIXTURES_DIR, 'simple-design-system.json'), 'utf-8');
      const sessionId = 'test-session-figma-variants-002';

      const mockOutput: ComponentsOutput = {
        metadata: {
          figma_file_id: 'test',
          analyzed_at: new Date().toISOString(),
          total_components: 1,
        },
        components: [
          {
            id: 'COMP-001',
            name: 'Button',
            type: 'Button',
            category: 'atom',
            variants: [],
            properties: [
              {
                name: 'size',
                type: 'VARIANT',
                default_value: 'medium',
                description: 'Button size',
              },
              {
                name: 'disabled',
                type: 'BOOLEAN',
                default_value: false,
                description: 'Disabled state',
              },
            ],
            design_tokens: {},
            usage: { screens: [], instances: 0 },
          },
        ],
        design_tokens: {},
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      const result = await analyzeFigmaDesign(figmaData, sessionId, { saveOutput: false });

      expect(result.components[0]?.properties).toHaveLength(2);
      expect(result.components[0]?.properties[0]?.name).toBe('size');
      expect(result.components[0]?.properties[0]?.type).toBe('VARIANT');
      expect(result.components[0]?.properties[1]?.name).toBe('disabled');
      expect(result.components[0]?.properties[1]?.type).toBe('BOOLEAN');
    });
  });

  describe('Design Token Extraction', () => {
    it('should extract global design tokens', async () => {
      const figmaData = await readFile(join(FIXTURES_DIR, 'simple-design-system.json'), 'utf-8');
      const sessionId = 'test-session-figma-tokens-001';

      const mockOutput: ComponentsOutput = {
        metadata: {
          figma_file_id: 'test',
          analyzed_at: new Date().toISOString(),
          total_components: 0,
        },
        components: [],
        design_tokens: {
          colors: {
            'primary-500': 'rgba(51, 102, 204, 1.0)',
            'gray-300': 'rgba(204, 204, 204, 1.0)',
            'success-500': 'rgba(33, 196, 74, 1.0)',
          },
          typography: {
            'heading-h1': {
              fontFamily: 'Inter',
              fontWeight: 700,
              fontSize: 32,
              lineHeight: 40,
            },
            'body-regular': {
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
              lineHeight: 20,
            },
          },
          spacing: {
            xs: 4,
            sm: 8,
            md: 16,
          },
        },
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      const result = await analyzeFigmaDesign(figmaData, sessionId, { saveOutput: false });

      expect(result.design_tokens.colors).toBeDefined();
      expect(result.design_tokens.colors).toHaveProperty('primary-500');
      expect(result.design_tokens.typography).toBeDefined();
      expect(result.design_tokens.spacing).toBeDefined();
    });

    it('should extract component-specific design tokens', async () => {
      const figmaData = await readFile(join(FIXTURES_DIR, 'simple-design-system.json'), 'utf-8');
      const sessionId = 'test-session-figma-tokens-002';

      const mockOutput: ComponentsOutput = {
        metadata: {
          figma_file_id: 'test',
          analyzed_at: new Date().toISOString(),
          total_components: 1,
        },
        components: [
          {
            id: 'COMP-001',
            name: 'Button',
            type: 'Button',
            category: 'atom',
            variants: [],
            properties: [],
            design_tokens: {
              colors: {
                background: 'rgba(51, 102, 204, 1.0)',
                text: 'rgba(255, 255, 255, 1.0)',
              },
              border_radius: {
                cornerRadius: 8,
              },
            },
            usage: { screens: [], instances: 0 },
          },
        ],
        design_tokens: {},
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      const result = await analyzeFigmaDesign(figmaData, sessionId, { saveOutput: false });

      expect(result.components[0]?.design_tokens.colors).toBeDefined();
      expect(result.components[0]?.design_tokens.border_radius).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for empty Figma data', async () => {
      await expect(analyzeFigmaDesign('', 'test-session')).rejects.toThrow();
    });

    it('should throw error for invalid JSON', async () => {
      await expect(analyzeFigmaDesign('invalid json', 'test-session')).rejects.toThrow();
    });

    it('should handle LLM provider failures gracefully', async () => {
      const figmaData = await readFile(join(FIXTURES_DIR, 'simple-design-system.json'), 'utf-8');

      mockGenerateStructured.mockRejectedValue(new Error('Provider error'));

      await expect(analyzeFigmaDesign(figmaData, 'test-session')).rejects.toThrow();
    });
  });

  describe('Output Validation', () => {
    it('should produce output that matches ComponentsOutput schema', async () => {
      const figmaData = await readFile(join(FIXTURES_DIR, 'simple-design-system.json'), 'utf-8');
      const sessionId = 'test-session-figma-schema-001';

      const mockOutput: ComponentsOutput = {
        metadata: {
          figma_file_id: 'test',
          analyzed_at: new Date().toISOString(),
          total_components: 1,
        },
        components: [
          {
            id: 'COMP-001',
            name: 'Button',
            type: 'Button',
            category: 'atom',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: { screens: [], instances: 0 },
          },
        ],
        design_tokens: {},
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      const result = await analyzeFigmaDesign(figmaData, sessionId, { saveOutput: false });

      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('design_tokens');
      expect(result.metadata).toHaveProperty('figma_file_id');
      expect(result.metadata).toHaveProperty('analyzed_at');
      expect(result.metadata).toHaveProperty('total_components');
    });

    it('should validate component IDs follow correct format', async () => {
      const figmaData = await readFile(join(FIXTURES_DIR, 'simple-design-system.json'), 'utf-8');
      const sessionId = 'test-session-figma-schema-002';

      const mockOutput: ComponentsOutput = {
        metadata: {
          figma_file_id: 'test',
          analyzed_at: new Date().toISOString(),
          total_components: 3,
        },
        components: [
          {
            id: 'COMP-001',
            name: 'Button',
            type: 'Button',
            category: 'atom',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: { screens: [], instances: 0 },
          },
          {
            id: 'COMP-002',
            name: 'Input',
            type: 'Input',
            category: 'atom',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: { screens: [], instances: 0 },
          },
          {
            id: 'COMP-003',
            name: 'Card',
            type: 'Card',
            category: 'molecule',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: { screens: [], instances: 0 },
          },
        ],
        design_tokens: {},
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      const result = await analyzeFigmaDesign(figmaData, sessionId, { saveOutput: false });

      result.components.forEach((component) => {
        expect(component.id).toMatch(/^COMP-\d{3}$/);
      });
    });
  });

  describe('Performance', () => {
    it('should complete analysis within 3 minutes', async () => {
      const figmaData = await readFile(join(FIXTURES_DIR, 'complex-ecommerce-design.json'), 'utf-8');
      const sessionId = 'test-session-figma-perf-001';

      const mockOutput: ComponentsOutput = {
        metadata: {
          figma_file_id: 'test',
          analyzed_at: new Date().toISOString(),
          total_components: 1,
        },
        components: [
          {
            id: 'COMP-001',
            name: 'Component',
            type: 'Frame',
            category: 'atom',
            variants: [],
            properties: [],
            design_tokens: {},
            usage: { screens: [], instances: 0 },
          },
        ],
        design_tokens: {},
      };

      mockGenerateStructured.mockResolvedValue(mockOutput);

      const startTime = Date.now();
      await analyzeFigmaDesign(figmaData, sessionId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(180000); // 3 minutes
    }, 180000);
  });
});
