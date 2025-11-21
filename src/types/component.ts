/**
 * Component entity
 *
 * Represents a UI component extracted from Figma
 * Per spec.md Key Entities (line 247)
 */

export type ComponentCategory = 'atom' | 'molecule' | 'organism' | 'template';

/**
 * Component variant (e.g., button sizes, states)
 */
export interface ComponentVariant {
  name: string;
  properties: Record<string, unknown>;
}

/**
 * Component property definition
 */
export interface ComponentProperty {
  name: string;
  type: string;
  default_value?: unknown;
  description?: string;
}

/**
 * Design tokens extracted from component
 */
export interface DesignTokens {
  colors?: Record<string, string>;
  typography?: Record<string, unknown>;
  spacing?: Record<string, number>;
  shadows?: Record<string, string>;
  border_radius?: Record<string, number>;
}

/**
 * Component usage information
 */
export interface ComponentUsage {
  screens: string[];
  instances: number;
}

/**
 * UI component from Figma
 */
export interface Component {
  /** Unique ID (COMP-001, COMP-002, etc.) */
  id: string;

  /** Component name */
  name: string;

  /** Component type (Button, Input, Card, Modal, etc.) */
  type: string;

  /** Atomic design category */
  category: ComponentCategory;

  /** Component variants */
  variants: ComponentVariant[];

  /** Component properties */
  properties: ComponentProperty[];

  /** Design tokens used */
  design_tokens: DesignTokens;

  /** Usage information */
  usage: ComponentUsage;

  /** Screenshot path (if generated) */
  screenshot?: string;
}

/**
 * Components output from Figma Analyzer
 */
export interface ComponentsOutput {
  metadata: {
    figma_file_id: string;
    figma_file_name?: string;
    analyzed_at: string; // ISO8601
    analyzer_version?: string;
    total_components: number;
  };
  components: Component[];
  design_tokens: DesignTokens;
}
