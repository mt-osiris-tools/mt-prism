/**
 * TDD (Technical Design Document) entity
 *
 * Represents the final comprehensive technical specification
 * Per spec.md Key Entities (line 255)
 */

/**
 * TDD section
 */
export interface TDDSection {
  title: string;
  content: string;
  order: number;
}

/**
 * API specification (OpenAPI 3.1)
 */
export interface APISpecification {
  openapi: string; // "3.1.0"
  info: {
    title: string;
    version: string;
    description: string;
  };
  paths: Record<string, unknown>;
  components?: Record<string, unknown>;
}

/**
 * Database schema
 */
export interface DatabaseSchema {
  tables: DatabaseTable[];
  indexes: DatabaseIndex[];
  relationships: DatabaseRelationship[];
}

export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
  primary_key: string[];
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: unknown;
}

export interface DatabaseIndex {
  table: string;
  columns: string[];
  unique: boolean;
  name: string;
}

export interface DatabaseRelationship {
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

/**
 * Implementation task
 */
export interface ImplementationTask {
  id: string;
  title: string;
  description: string;
  effort_estimate: number; // story points
  dependencies: string[];
  assignee?: string;
}

/**
 * Requirements coverage tracking
 */
export interface RequirementCoverage {
  requirement_id: string;
  covered_in_sections: string[];
  coverage_percentage: number;
}

/**
 * Technical Design Document
 *
 * Complete technical specification generated from validated requirements
 */
export interface TDD {
  /** TDD version */
  version: string;

  /** Document title */
  title: string;

  /** All 12 required sections */
  sections: TDDSection[];

  /** API specification (OpenAPI 3.1) */
  api_spec: APISpecification;

  /** Database schema */
  database_schema: DatabaseSchema;

  /** Implementation tasks */
  tasks: ImplementationTask[];

  /** Architecture diagram (Mermaid syntax) */
  architecture_diagram: string;

  /** Requirements coverage (must be 100% per SC-006) */
  requirements_coverage: RequirementCoverage[];

  /** Generation metadata */
  metadata: {
    generated_at: string; // ISO8601
    generator_version: string;
    requirements_source: string;
    components_source?: string;
  };
}
