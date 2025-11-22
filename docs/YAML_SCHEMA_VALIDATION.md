# YAML Schema Validation with Zod

**Research Date**: 2025-11-20
**Project Context**: MT-PRISM AI Agent Plugin
**Focus**: TypeScript/Zod/YAML integration patterns for validating AI-generated output

---

## Executive Summary

This research document provides best practices for validating YAML outputs from AI providers using Zod schemas. The MT-PRISM project must validate complex nested structures (requirements, components, gaps, questions, sessions, TDDs) with rich error messages and compile-time type safety.

**Key Findings**:
- Zod provides excellent type safety and error formatting for YAML validation
- Custom error maps enable business-friendly error messages
- Refinements and transforms handle complex validation logic
- Discriminated unions elegantly handle polymorphic types (gap types, requirement types)
- Schema versioning ensures forward/backward compatibility

---

## 1. Schema Design Pattern: Best Practices for Complex Zod Schemas

### 1.1 Core Principles

Zod schemas for YAML validation should follow these principles:

1. **Composability**: Break complex schemas into reusable parts
2. **Explicitness**: Use `.describe()` and `.catch()` liberally for clarity
3. **Strictness**: Use `.strict()` to reject unknown fields
4. **Validation-First**: Validate types, formats, relationships, and invariants
5. **Error-Friendly**: Provide specific, actionable error messages

### 1.2 Layered Schema Architecture

For large data structures, organize schemas in layers:

```typescript
// Layer 1: Primitives (enums, branded strings)
const PrioritySchema = z.enum(['critical', 'high', 'medium', 'low'])
  .describe('Business priority level');

const ComplexitySchema = z.number()
  .int('Complexity must be an integer')
  .min(1, 'Complexity must be at least 1')
  .max(10, 'Complexity must be at most 10')
  .describe('Implementation complexity on 1-10 scale');

const RequirementIdSchema = z.string()
  .regex(/^REQ-(FUNC|NF|CONST|ASSUMP)-\d{3}$/,
    'Invalid requirement ID format. Use REQ-FUNC-NNN, REQ-NF-NNN, etc.')
  .describe('Unique requirement identifier with type and sequence number');

// Layer 2: Objects (entities with validation)
const IssueSchema = z.object({
  type: z.enum(['ambiguity', 'missing', 'conflict', 'incomplete'])
    .describe('Issue type classification'),
  severity: z.enum(['critical', 'high', 'medium', 'low'])
    .describe('Issue severity'),
  description: z.string().min(1)
    .describe('What is wrong'),
  suggestion: z.string().min(1)
    .describe('How to fix it'),
}).strict().describe('Quality issue detected during analysis');

// Layer 3: Complex aggregates (with relationships)
const RequirementSchema = z.object({
  id: RequirementIdSchema,
  type: z.enum(['functional', 'non-functional', 'constraint', 'assumption']),
  category: z.enum(['feature', 'enhancement', 'bug-fix', 'technical-debt',
                    'performance', 'security', 'compliance']),
  priority: PrioritySchema,
  complexity: ComplexitySchema,
  title: z.string().min(1).max(100),
  description: z.string().min(1),
  acceptance_criteria: z.array(z.string()).default([]),
  user_stories: z.array(z.string()).default([]),
  dependencies: z.array(RequirementIdSchema).default([]),
  source_location: z.string().min(1),
  confidence: z.number().min(0).max(1),
  status: z.enum(['draft', 'validated', 'clarified', 'approved']),
  issues: z.array(IssueSchema).default([]),
}).strict().describe('Structured requirement from PRD analysis');

// Layer 4: Collections with metadata
const RequirementsFileSchema = z.object({
  metadata: z.object({
    prd_source: z.string().url('Must be valid URL or file path'),
    analyzed_at: z.string().datetime('Must be ISO8601 datetime'),
    analyzer_version: z.string(),
    total_requirements: z.number().nonnegative().int(),
  }).strict().describe('Analysis metadata'),
  requirements: z.array(RequirementSchema),
}).strict()
  .refine(
    (data) => data.metadata.total_requirements === data.requirements.length,
    {
      message: 'total_requirements must match requirements array length',
      path: ['metadata', 'total_requirements'],
    }
  );
```

### 1.3 Pattern: Enum-Based Polymorphism for Type Safety

For entities with multiple subtypes (gaps, requirements), use discriminated unions:

```typescript
// Gap types use discriminated unions for type-safe handling
const MissingUIGapSchema = z.object({
  type: z.literal('missing_ui'),
  requirement_id: RequirementIdSchema,
  description: z.string(),
  impact: z.string(),
}).strict();

const NoRequirementGapSchema = z.object({
  type: z.literal('no_requirement'),
  component_id: ComponentIdSchema,
  description: z.string(),
  impact: z.string(),
}).strict();

const InconsistencyGapSchema = z.object({
  type: z.literal('inconsistency'),
  requirement_id: RequirementIdSchema,
  component_id: ComponentIdSchema,
  description: z.string(),
  impact: z.string(),
}).strict();

// Union all gap types with discriminator
const GapSchema = z.discriminatedUnion('type', [
  MissingUIGapSchema,
  NoRequirementGapSchema,
  InconsistencyGapSchema,
])
  .pipe(
    z.object({
      id: GapIdSchema,
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      stakeholder: z.array(z.enum(['product', 'design', 'engineering'])).min(1),
      question_id: QuestionIdSchema.optional(),
      resolved: z.boolean().default(false),
      resolution: z.string().optional(),
    }).strict()
  );

// Benefits:
// - Type narrowing in code: if (gap.type === 'missing_ui') { gap.requirement_id ... }
// - Zod validates only relevant fields per type
// - Compile-time safety: TypeScript knows which fields exist for each gap type
// - Clear error messages: "Gap type 'missing_ui' requires requirement_id"
```

### 1.4 Pattern: Refinements for Complex Validation

Use `.refine()` for multi-field validation and invariants:

```typescript
const SessionSchema = z.object({
  session_id: z.string().regex(/^sess-\d{13}$/),
  status: z.enum(['running', 'paused', 'completed', 'failed']),
  current_step: z.number().int().min(1).max(5),
  steps_completed: z.array(z.number().int().min(1).max(5)),
  error: z.object({
    step: z.number().int(),
    message: z.string(),
    recoverable: z.boolean(),
  }).optional(),
}).strict()
  // Validation 1: steps_completed must be sorted
  .refine(
    (session) => {
      const sorted = [...session.steps_completed].sort();
      return JSON.stringify(session.steps_completed) === JSON.stringify(sorted);
    },
    {
      message: 'steps_completed must be sorted in ascending order',
      path: ['steps_completed'],
    }
  )
  // Validation 2: error only if status is 'failed'
  .refine(
    (session) => {
      if (session.status === 'failed' && !session.error) return false;
      if (session.status !== 'failed' && session.error) return false;
      return true;
    },
    {
      message: 'error must be present if status is "failed" and absent otherwise',
      path: ['error'],
    }
  )
  // Validation 3: current_step consistency
  .refine(
    (session) => {
      const maxCompleted = Math.max(...session.steps_completed, 0);
      return session.current_step > maxCompleted || session.status === 'completed';
    },
    {
      message: 'current_step must be greater than all steps_completed',
      path: ['current_step'],
    }
  );
```

### 1.5 Pattern: Custom Transforms for Data Normalization

Use `.transform()` to normalize or enrich data during validation:

```typescript
const RequirementWithNormalization = RequirementSchema
  .transform((req) => ({
    ...req,
    // Normalize title: trim and ensure single case
    title: req.title.trim(),
    // Auto-generate source_location if missing reference section
    source_location: req.source_location || `Requirement ${req.id}`,
    // Ensure dependencies are unique
    dependencies: [...new Set(req.dependencies)],
    // Compute metrics
    hasIssues: req.issues.length > 0,
    criticalIssues: req.issues.filter(i => i.severity === 'critical').length,
  }));

// Usage:
const normalized = RequirementWithNormalization.parse(rawData);
// normalized includes computed fields like hasIssues
```

---

## 2. YAML-to-Zod Integration: Parsing and Validation

### 2.1 End-to-End Flow

```typescript
import YAML from 'yaml';
import * as fs from 'fs';
import { z } from 'zod';

// Flow: YAML file → parse to JS → validate with Zod → typed data
async function loadAndValidateRequirements(
  filePath: string
): Promise<LoadResult> {
  try {
    // Step 1: Read file
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Step 2: Parse YAML to JavaScript object
    const rawData = YAML.parse(fileContent);

    // Step 3: Validate with Zod schema
    const validated = RequirementsFileSchema.parse(rawData);

    // Step 4: Return with success status
    return {
      success: true,
      data: validated,
      warnings: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors,
        warnings: [],
      };
    }
    throw error;
  }
}

// Type definitions
interface LoadResult {
  success: boolean;
  data: z.infer<typeof RequirementsFileSchema> | null;
  errors?: z.ZodError['errors'];
  warnings: string[];
}
```

### 2.2 Handling Optional Files with Defaults

```typescript
// Some YAML files may be optional with default values
const OptionalGapsFileSchema = z.object({
  metadata: z.object({
    validator_version: z.string(),
    validated_at: z.string().datetime(),
  }).strict(),
  gaps: z.array(GapSchema).default([]),
}).strict();

async function loadGapsWithDefaults(
  filePath: string | undefined
): Promise<z.infer<typeof OptionalGapsFileSchema>> {
  if (!filePath || !fs.existsSync(filePath)) {
    // Return defaults if file doesn't exist
    return {
      metadata: {
        validator_version: '1.0.0',
        validated_at: new Date().toISOString(),
      },
      gaps: [],
    };
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const rawData = YAML.parse(fileContent);
  return OptionalGapsFileSchema.parse(rawData);
}
```

### 2.3 Batch Validation with Aggregated Errors

```typescript
interface ValidationReport {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  results: {
    filePath: string;
    valid: boolean;
    data?: any;
    errors?: ZodErrorDetail[];
  }[];
}

async function validateWorkflowArtifacts(
  sessionDir: string
): Promise<ValidationReport> {
  const files = [
    { path: `${sessionDir}/requirements.yaml`, schema: RequirementsFileSchema },
    { path: `${sessionDir}/components.yaml`, schema: ComponentsFileSchema },
    { path: `${sessionDir}/gaps.yaml`, schema: GapsFileSchema },
  ];

  const results = await Promise.all(
    files.map(async ({ path, schema }) => {
      try {
        if (!fs.existsSync(path)) {
          return { filePath: path, valid: false, errors: [{ message: 'File not found' }] };
        }

        const content = fs.readFileSync(path, 'utf-8');
        const raw = YAML.parse(content);
        const data = schema.parse(raw);

        return { filePath: path, valid: true, data };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            filePath: path,
            valid: false,
            errors: error.errors.map(e => ({
              message: e.message,
              path: e.path.join('.'),
            })),
          };
        }
        return {
          filePath: path,
          valid: false,
          errors: [{ message: String(error) }],
        };
      }
    })
  );

  return {
    totalFiles: files.length,
    validFiles: results.filter(r => r.valid).length,
    invalidFiles: results.filter(r => !r.valid).length,
    results,
  };
}
```

---

## 3. Error Handling: Custom Error Messages and Validation Feedback

### 3.1 Custom Error Map for User-Friendly Messages

```typescript
const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  // Handle type errors with context
  if (issue.code === z.ZodIssueCode.invalid_type) {
    return {
      message: `Expected ${issue.expected}, but received ${issue.received}. ` +
               `Field: ${issue.path.join('.')}`
    };
  }

  // Handle enum errors with suggestions
  if (issue.code === z.ZodIssueCode.invalid_enum_value) {
    const validValues = issue.options?.join(', ') || 'unknown';
    return {
      message: `Invalid value "${issue.received}" for field ${issue.path.join('.')}. ` +
               `Allowed values: ${validValues}`
    };
  }

  // Handle string format errors
  if (issue.code === z.ZodIssueCode.invalid_string) {
    if (issue.validation === 'url') {
      return {
        message: `Field ${issue.path.join('.')} must be a valid URL, ` +
                 `but got "${ctx.data}"`
      };
    }
    if (issue.validation === 'datetime') {
      return {
        message: `Field ${issue.path.join('.')} must be ISO8601 datetime, ` +
                 `but got "${ctx.data}". Example: "2025-11-20T10:30:56Z"`
      };
    }
    if (issue.validation === 'regex') {
      return {
        message: `Field ${issue.path.join('.')} format is invalid. ` +
                 `Pattern: ${issue.regex}. Got: "${ctx.data}"`
      };
    }
  }

  // Handle array errors
  if (issue.code === z.ZodIssueCode.too_small && issue.type === 'array') {
    return {
      message: `Field ${issue.path.join('.')} must have at least ${issue.minimum} items, ` +
               `but has ${(ctx.data as any[]).length}`
    };
  }

  // Handle number range errors
  if (issue.code === z.ZodIssueCode.too_big || issue.code === z.ZodIssueCode.too_small) {
    const field = issue.path.join('.');
    if (issue.code === z.ZodIssueCode.too_big) {
      return { message: `${field} must be at most ${issue.maximum}` };
    }
    return { message: `${field} must be at least ${issue.minimum}` };
  }

  // Fallback to default message
  return { message: ctx.defaultError };
};

// Apply custom error map globally
z.setErrorMap(customErrorMap);
```

### 3.2 Formatted Error Report for Stakeholders

```typescript
class ValidationError extends Error {
  constructor(
    public zodError: z.ZodError,
    public filePath: string
  ) {
    super(`Validation failed for ${filePath}`);
  }

  // Generate user-friendly error report
  toReport(): string {
    const lines: string[] = [];
    lines.push(`VALIDATION ERROR REPORT`);
    lines.push(`File: ${this.filePath}`);
    lines.push(`Total Issues: ${this.zodError.errors.length}`);
    lines.push('');

    // Group errors by severity
    const bySeverity = {
      critical: [] as z.ZodError['errors'],
      high: [] as z.ZodError['errors'],
      medium: [] as z.ZodError['errors'],
    };

    this.zodError.errors.forEach(error => {
      // Classify by type
      if (error.code === 'invalid_type' || error.code === 'invalid_enum_value') {
        bySeverity.critical.push(error);
      } else if (error.code === 'too_small' || error.code === 'too_big') {
        bySeverity.high.push(error);
      } else {
        bySeverity.medium.push(error);
      }
    });

    // Critical issues
    if (bySeverity.critical.length > 0) {
      lines.push('CRITICAL ISSUES:');
      bySeverity.critical.forEach((error, i) => {
        const path = error.path.join('.');
        lines.push(`  ${i + 1}. [${path}] ${error.message}`);
      });
      lines.push('');
    }

    // High priority issues
    if (bySeverity.high.length > 0) {
      lines.push('HIGH PRIORITY ISSUES:');
      bySeverity.high.forEach((error, i) => {
        const path = error.path.join('.');
        lines.push(`  ${i + 1}. [${path}] ${error.message}`);
      });
      lines.push('');
    }

    // Medium priority issues
    if (bySeverity.medium.length > 0) {
      lines.push('MEDIUM PRIORITY ISSUES:');
      bySeverity.medium.forEach((error, i) => {
        const path = error.path.join('.');
        lines.push(`  ${i + 1}. [${path}] ${error.message}`);
      });
    }

    return lines.join('\n');
  }
}

// Usage
try {
  const data = RequirementsFileSchema.parse(rawData);
} catch (error) {
  if (error instanceof z.ZodError) {
    const report = new ValidationError(error, 'requirements.yaml');
    console.log(report.toReport());
  }
}
```

### 3.3 Interactive Error Resolution

```typescript
interface ValidationFix {
  fieldPath: string;
  currentValue: any;
  issue: string;
  suggestions: string[];
  autoFix?: any;
}

function generateFixSuggestions(error: z.ZodError): ValidationFix[] {
  return error.errors.map(err => {
    const fieldPath = err.path.join('.');

    // Auto-fix for common issues
    let autoFix: any = undefined;

    if (err.code === 'invalid_string' && err.validation === 'datetime') {
      // Auto-fix: Current ISO timestamp
      autoFix = new Date().toISOString();
    }

    if (err.code === 'too_small' && err.type === 'string') {
      // Auto-fix: Provide reasonable default
      autoFix = 'N/A';
    }

    if (err.code === 'invalid_enum_value') {
      // Auto-fix: Use first valid option
      autoFix = err.options?.[0];
    }

    return {
      fieldPath,
      currentValue: err.path.reduce((obj, key) => obj?.[key], error),
      issue: err.message,
      suggestions: generateSuggestionsForError(err),
      autoFix,
    };
  });
}

function generateSuggestionsForError(error: z.ZodIssueOptionalMessage): string[] {
  if (error.code === 'invalid_enum_value' && error.options) {
    return [`Use one of: ${error.options.join(', ')}`];
  }

  if (error.code === 'invalid_string') {
    if (error.validation === 'datetime') {
      return [
        'Format: ISO8601 (e.g., "2025-11-20T10:30:56Z")',
        'Use: new Date().toISOString()',
      ];
    }
    if (error.validation === 'url') {
      return [
        'Must be a valid URL starting with http:// or https://',
        'Or a file path like "/path/to/file.md"',
      ];
    }
    if (error.validation === 'regex') {
      return [
        'Check the pattern in the error message',
        'Review example values provided in documentation',
      ];
    }
  }

  if (error.code === 'too_small') {
    return [
      `Minimum length/value: ${error.minimum}`,
      `Current length/value: ${error.type === 'array' ? (error as any).received?.length : 'N/A'}`,
    ];
  }

  return ['Check the data format and try again'];
}
```

---

## 4. Type Safety: Compile-Time Types from Zod Schemas

### 4.1 Deriving TypeScript Types from Zod Schemas

```typescript
// Extract TypeScript types from Zod schemas - single source of truth
type Requirements = z.infer<typeof RequirementsFileSchema>;
type Requirement = z.infer<typeof RequirementSchema>;
type Gap = z.infer<typeof GapSchema>;
type Component = z.infer<typeof ComponentSchema>;
type Session = z.infer<typeof SessionSchema>;
type TDD = z.infer<typeof TDDSchema>;

// Benefits:
// - Types always match runtime validation
// - No manual type definitions to keep in sync
// - Full autocomplete in IDE
// - Refactor schemas → types automatically update
// - No type/runtime mismatches possible
```

### 4.2 Type Guards from Discriminated Unions

```typescript
// Zod discriminated unions provide type narrowing
function processGap(gap: Gap): void {
  // TypeScript knows the exact shape based on gap.type
  if (gap.type === 'missing_ui') {
    // gap.requirement_id is definitely present here
    const req = findRequirement(gap.requirement_id);
  } else if (gap.type === 'no_requirement') {
    // gap.component_id is definitely present here
    const comp = findComponent(gap.component_id);
  } else if (gap.type === 'inconsistency') {
    // Both IDs are present here
    const req = findRequirement(gap.requirement_id);
    const comp = findComponent(gap.component_id);
  }
}

// Using type predicate for runtime checks
function isMissingUIGap(gap: Gap): gap is z.infer<typeof MissingUIGapSchema> {
  return gap.type === 'missing_ui';
}

// Usage with narrowing
const missingUIGaps = gaps.filter(isMissingUIGap);
// missingUIGaps: array of gaps where .type is 'missing_ui'
```

### 4.3 Brand Types for Enhanced Type Safety

```typescript
// Create branded types for IDs (prevent accidental mixing)
type RequirementId = z.infer<typeof RequirementIdSchema> & { readonly __brand: 'RequirementId' };
type ComponentId = z.infer<typeof ComponentIdSchema> & { readonly __brand: 'ComponentId' };
type GapId = z.infer<typeof GapIdSchema> & { readonly __brand: 'GapId' };

const createRequirementId = (id: string): RequirementId => {
  const validated = RequirementIdSchema.parse(id);
  return validated as RequirementId;
};

// Usage - prevents mixing IDs
function findRequirement(id: RequirementId): Requirement | undefined {
  return requirements.find(r => r.id === id);
}

// This won't compile - type safety at compile time!
// const comp = findRequirement(componentId);  // TS Error
```

### 4.4 Utility Types for Common Patterns

```typescript
// Extract success case from validation result
type ValidatedRequirements = z.infer<typeof RequirementsFileSchema>;

// Create optional version of schema
type PartialRequirement = Partial<Requirement>;

// Map over array elements
type RequirementArray = z.infer<typeof z.array(RequirementSchema)>;

// Handle both success and error cases
type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: z.ZodError };

const loadRequirements = async (
  path: string
): Promise<ValidationResult<ValidatedRequirements>> => {
  try {
    const data = await loadAndValidateRequirements(path);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
};
```

---

## 5. Implementation Example: Requirements Entity Schema

### 5.1 Complete Requirements Schema with All Features

```typescript
import { z } from 'zod';

// Base primitives - reusable across all schemas
export const PrioritySchema = z.enum(['critical', 'high', 'medium', 'low'])
  .describe('Business priority level: critical > high > medium > low');

export const RequirementTypeSchema = z.enum([
  'functional',
  'non-functional',
  'constraint',
  'assumption'
]).describe('Requirement classification type');

export const CategorySchema = z.enum([
  'feature',
  'enhancement',
  'bug-fix',
  'technical-debt',
  'performance',
  'security',
  'compliance'
]).describe('Requirement business category');

export const StatusSchema = z.enum([
  'draft',
  'validated',
  'clarified',
  'approved'
]).describe('Lifecycle status - one-way progression');

export const ComplexitySchema = z.number()
  .int('Complexity must be an integer')
  .min(1, 'Complexity minimum is 1')
  .max(10, 'Complexity maximum is 10')
  .describe('Implementation complexity 1-10 scale');

export const ConfidenceSchema = z.number()
  .min(0, 'Confidence minimum is 0')
  .max(1, 'Confidence maximum is 1')
  .describe('Extraction confidence 0.0-1.0');

export const RequirementIdSchema = z.string()
  .regex(/^REQ-(FUNC|NF|CONST|ASSUMP)-\d{3}$/, {
    message: 'Invalid requirement ID format. Use REQ-FUNC-NNN, REQ-NF-NNN, REQ-CONST-NNN, or REQ-ASSUMP-NNN',
  })
  .describe('Unique requirement ID: REQ-{TYPE}-{NUMBER}');

// Issue entity
export const IssueSchema = z.object({
  type: z.enum(['ambiguity', 'missing', 'conflict', 'incomplete'])
    .describe('Type of quality issue'),
  severity: z.enum(['critical', 'high', 'medium', 'low'])
    .describe('Issue severity'),
  description: z.string()
    .min(1, 'Description required')
    .describe('What is wrong with this requirement'),
  suggestion: z.string()
    .min(1, 'Suggestion required')
    .describe('How to resolve this issue'),
}).strict()
  .describe('Quality issue detected in requirement');

// Main Requirement entity
export const RequirementSchema = z.object({
  id: RequirementIdSchema,
  type: RequirementTypeSchema,
  category: CategorySchema,
  priority: PrioritySchema,
  complexity: ComplexitySchema,
  title: z.string()
    .min(1, 'Title required')
    .max(100, 'Title must be under 100 characters')
    .refine(t => !t.includes('\n'), 'Title cannot contain newlines')
    .describe('Short, descriptive requirement title'),
  description: z.string()
    .min(1, 'Description required')
    .describe('Full requirement description and context'),
  acceptance_criteria: z.array(z.string().min(1))
    .default([])
    .describe('Testable, specific acceptance criteria'),
  user_stories: z.array(z.string().min(1))
    .default([])
    .describe('Related user stories or use cases'),
  dependencies: z.array(RequirementIdSchema)
    .default([])
    .describe('Other requirements this depends on'),
  source_location: z.string()
    .min(1, 'Source location required')
    .describe('Where in PRD this came from (e.g., "Section 3.1")'),
  confidence: ConfidenceSchema,
  status: StatusSchema.default('draft'),
  issues: z.array(IssueSchema)
    .default([])
    .describe('Quality issues detected during extraction'),
}).strict()
  .describe('Requirement extracted from PRD document')
  // Validation: confidence should be high if no issues
  .refine(
    (req) => {
      if (req.issues.length === 0 && req.confidence < 0.85) {
        return false; // Warning: high confidence expected if no issues
      }
      return true;
    },
    {
      message: 'Requirements with no detected issues should have confidence >= 0.85',
      path: ['confidence'],
    }
  )
  // Validation: critical issues should have lower confidence
  .refine(
    (req) => {
      const criticalIssues = req.issues.filter(i => i.severity === 'critical');
      if (criticalIssues.length > 0 && req.confidence > 0.8) {
        return false;
      }
      return true;
    },
    {
      message: 'Requirements with critical issues should have lower confidence (< 0.8)',
      path: ['confidence'],
    }
  );

// Requirements file with metadata
export const RequirementsFileSchema = z.object({
  metadata: z.object({
    prd_source: z.string()
      .min(1, 'Source required')
      .describe('URL or file path to source PRD'),
    analyzed_at: z.string()
      .datetime('Must be ISO8601 datetime')
      .describe('When analysis was performed'),
    analyzer_version: z.string()
      .regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic (X.Y.Z)')
      .describe('Version of PRD Analyzer'),
    total_requirements: z.number()
      .int('Must be integer')
      .nonnegative('Cannot be negative')
      .describe('Total requirements extracted'),
  }).strict()
    .describe('Analysis metadata'),

  requirements: z.array(RequirementSchema)
    .min(0, 'At least empty array required')
    .describe('Extracted requirements'),
}).strict()
  // Validation: count consistency
  .refine(
    (file) => file.metadata.total_requirements === file.requirements.length,
    {
      message: 'total_requirements must match requirements array length',
      path: ['metadata', 'total_requirements'],
    }
  )
  // Validation: all requirement IDs are unique
  .refine(
    (file) => {
      const ids = file.requirements.map(r => r.id);
      return new Set(ids).size === ids.length;
    },
    {
      message: 'All requirement IDs must be unique',
      path: ['requirements'],
    }
  )
  // Validation: all dependencies exist
  .refine(
    (file) => {
      const validIds = new Set(file.requirements.map(r => r.id));
      return file.requirements.every(req =>
        req.dependencies.every(dep => validIds.has(dep))
      );
    },
    {
      message: 'All dependencies must reference existing requirements',
      path: ['requirements'],
    }
  )
  // Validation: no circular dependencies
  .refine(
    (file) => {
      const deps = new Map<string, Set<string>>();

      // Build dependency map
      file.requirements.forEach(req => {
        deps.set(req.id, new Set(req.dependencies));
      });

      // Check for cycles using DFS
      const visited = new Set<string>();
      const recStack = new Set<string>();

      const hasCycle = (id: string): boolean => {
        visited.add(id);
        recStack.add(id);

        for (const dep of deps.get(id) || []) {
          if (!visited.has(dep)) {
            if (hasCycle(dep)) return true;
          } else if (recStack.has(dep)) {
            return true;
          }
        }

        recStack.delete(id);
        return false;
      };

      for (const id of deps.keys()) {
        if (!visited.has(id) && hasCycle(id)) {
          return false;
        }
      }

      return true;
    },
    {
      message: 'Circular dependencies detected in requirements',
      path: ['requirements'],
    }
  );

// Export types
export type Priority = z.infer<typeof PrioritySchema>;
export type RequirementType = z.infer<typeof RequirementTypeSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type RequirementsFile = z.infer<typeof RequirementsFileSchema>;
```

### 5.2 Usage: Loading and Processing Requirements

```typescript
import YAML from 'yaml';
import fs from 'fs';

// Load requirements from file
async function loadRequirements(
  filePath: string
): Promise<{ success: true; data: RequirementsFile } | { success: false; error: ValidationError }> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const raw = YAML.parse(content);
    const data = RequirementsFileSchema.parse(raw);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: new ValidationError(error, filePath),
      };
    }
    throw error;
  }
}

// Save requirements to file
async function saveRequirements(
  filePath: string,
  data: RequirementsFile
): Promise<void> {
  // Re-validate before saving
  const validated = RequirementsFileSchema.parse(data);
  const yaml = YAML.stringify(validated, { lineWidth: 0 });
  fs.writeFileSync(filePath, yaml, 'utf-8');
}

// Query functions with type safety
function findRequirementById(
  file: RequirementsFile,
  id: RequirementId
): Requirement | undefined {
  return file.requirements.find(r => r.id === id);
}

function requirementsByPriority(
  file: RequirementsFile
): Map<Priority, Requirement[]> {
  const map = new Map<Priority, Requirement[]>();

  (['critical', 'high', 'medium', 'low'] as const).forEach(priority => {
    map.set(priority, file.requirements.filter(r => r.priority === priority));
  });

  return map;
}

function requirementsWithIssues(file: RequirementsFile): Requirement[] {
  return file.requirements.filter(r => r.issues.length > 0);
}

function buildDependencyGraph(file: RequirementsFile): Map<RequirementId, Set<RequirementId>> {
  const graph = new Map<RequirementId, Set<RequirementId>>();

  file.requirements.forEach(req => {
    graph.set(req.id, new Set(req.dependencies));
  });

  return graph;
}

// Example usage
async function analyzeRequirements(): Promise<void> {
  const result = await loadRequirements('./requirements.yaml');

  if (!result.success) {
    console.error(result.error.toReport());
    return;
  }

  const { data: file } = result;

  // Analyze
  console.log(`Total requirements: ${file.requirements.length}`);
  console.log(`Extraction confidence: ${(file.requirements.reduce((sum, r) => sum + r.confidence, 0) / file.requirements.length * 100).toFixed(1)}%`);

  const byPriority = requirementsByPriority(file);
  console.log(`Critical: ${byPriority.get('critical')?.length || 0}`);
  console.log(`High: ${byPriority.get('high')?.length || 0}`);
  console.log(`Medium: ${byPriority.get('medium')?.length || 0}`);
  console.log(`Low: ${byPriority.get('low')?.length || 0}`);

  const withIssues = requirementsWithIssues(file);
  console.log(`Requirements with issues: ${withIssues.length}`);

  withIssues.forEach(req => {
    console.log(`\n${req.id}: ${req.title}`);
    req.issues.forEach(issue => {
      console.log(`  - [${issue.severity}] ${issue.type}: ${issue.description}`);
    });
  });
}
```

---

## 6. Schema Versioning and Migration Strategies

### 6.1 Versioning Approach: Semantic Versioning

```typescript
// Define schema versions
const SCHEMA_VERSION = '1.0.0';

type SchemaVersion = `${number}.${number}.${number}`;

interface VersionedSchema {
  schema_version: SchemaVersion;
  // ... entity fields
}

// Version history
const VERSIONS = {
  '1.0.0': 'Initial release with 6 core entities',
  '1.1.0': 'Added optional `tags` field to requirements',
  '1.2.0': 'Added `created_at` timestamp to all entities',
  '2.0.0': 'BREAKING: Changed complexity from number to enum',
};

// Breaking vs non-breaking changes
type ChangeType = 'patch' | 'minor' | 'major';

const classifyChange = (oldSchema: any, newSchema: any): ChangeType => {
  // Patch: docs only
  // Minor: new optional fields, new enum values
  // Major: removed fields, type changes, removed enum values
  return 'minor'; // example
};
```

### 6.2 Backward Compatibility: Support Current + Previous Version

```typescript
// Support v1.0 and v1.1 (drop support when v1.2 released)
export const RequirementsFileSchemaV1_0 = z.object({
  metadata: z.object({
    total_requirements: z.number().int(),
    // ... v1.0 fields
  }).strict(),
  requirements: z.array(z.object({
    id: z.string(),
    // ... v1.0 fields - NO tags field
    // ... rest of v1.0 schema
  })).strict(),
}).strict();

export const RequirementsFileSchemaV1_1 = z.object({
  metadata: z.object({
    total_requirements: z.number().int(),
    // ... v1.0 fields
  }).strict(),
  requirements: z.array(z.object({
    id: z.string(),
    tags: z.array(z.string()).optional(), // NEW optional field
    // ... v1.0 fields
    // ... rest of v1.1 schema
  })).strict(),
}).strict();

// Auto-detect and parse
const loadRequirementsVersionAgnostic = async (filePath: string) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const raw = YAML.parse(content);

  // Try newest first
  const schemas = [
    { version: '1.1.0', schema: RequirementsFileSchemaV1_1 },
    { version: '1.0.0', schema: RequirementsFileSchemaV1_0 },
  ];

  for (const { version, schema } of schemas) {
    const result = schema.safeParse(raw);
    if (result.success) {
      // Migrate to current version if needed
      if (version !== SCHEMA_VERSION) {
        return migrateRequirements(result.data, version, SCHEMA_VERSION);
      }
      return result.data;
    }
  }

  throw new Error('Could not parse requirements file with any supported schema version');
};
```

### 6.3 Migration Functions for Major Versions

```typescript
// Migration from v1.x to v2.0: number complexity → enum
const migrateComplexityToEnum = (complexityNumber: number): string => {
  if (complexityNumber <= 2) return 'trivial';
  if (complexityNumber <= 4) return 'low';
  if (complexityNumber <= 6) return 'medium';
  if (complexityNumber <= 8) return 'high';
  return 'critical';
};

const migrateRequirementsV1_xToV2_0 = (data: any): RequirementsFile => {
  return {
    ...data,
    requirements: data.requirements.map((req: any) => ({
      ...req,
      complexity: migrateComplexityToEnum(req.complexity),
    })),
    metadata: {
      ...data.metadata,
      // Add migration timestamp
      migrated_from_version: '1.1.0',
      migrated_at: new Date().toISOString(),
    },
  };
};

const migrateRequirements = (
  data: any,
  fromVersion: SchemaVersion,
  toVersion: SchemaVersion
): any => {
  if (fromVersion === toVersion) return data;

  const migrations = [
    { from: '1.0', to: '1.1', fn: (d) => d }, // No-op for additive change
    { from: '1.1', to: '2.0', fn: migrateRequirementsV1_xToV2_0 },
  ];

  let current = data;

  for (const migration of migrations) {
    if (fromVersion.startsWith(migration.from) && toVersion.startsWith(migration.to)) {
      current = migration.fn(current);
    }
  }

  return current;
};
```

### 6.4 Deprecation Warnings

```typescript
const deprecationWarnings = new Map<string, string>([
  ['requirements[].complexity_number', 'Use `complexity` enum instead (deprecated in v2.0)'],
  ['metadata.analyzer_tool', 'Use `analyzer_version` instead (deprecated in v2.0)'],
]);

const checkDeprecations = (data: RequirementsFile, version: SchemaVersion): string[] => {
  const warnings: string[] = [];

  if (version.startsWith('1.')) {
    // Warn about upcoming v2.0 changes
    warnings.push(
      'Your schema uses v1.x format. Complexity field will change from number to enum in v2.0. ' +
      'See migration guide: docs/SCHEMA_VERSIONING.md'
    );
  }

  return warnings;
};
```

---

## 7. Best Practices and Key Recommendations

### 7.1 Schema Design Principles

1. **Single Source of Truth**: Define schemas once, derive both runtime validation and TypeScript types
2. **Composition Over Inheritance**: Build complex schemas from simpler, reusable parts
3. **Explicit Over Implicit**: Use `.strict()`, `.describe()`, and error maps extensively
4. **Validation Layers**: Validate primitives → objects → relationships → invariants
5. **Error Messages**: Invest in custom error maps for excellent developer/stakeholder experience

### 7.2 Error Handling Patterns

1. **Never ignore validation errors**: Always handle ZodError with specific messages
2. **Provide auto-fixes**: When possible, suggest or automatically fix common issues
3. **Aggregate errors**: Report all errors at once, not stopping at first
4. **Context matters**: Include field paths, current values, and examples in error messages
5. **Graceful degradation**: Use defaults for optional fields, but log warnings

### 7.3 Testing Validation Logic

```typescript
import { describe, it, expect } from 'vitest';

describe('Requirements Validation', () => {
  // Test valid case
  it('should parse valid requirement', () => {
    const valid = {
      id: 'REQ-FUNC-001',
      type: 'functional',
      category: 'feature',
      priority: 'critical',
      complexity: 5,
      title: 'User Authentication',
      description: 'Users can log in',
      acceptance_criteria: ['Form displays'],
      user_stories: [],
      dependencies: [],
      source_location: 'Section 3',
      confidence: 0.95,
      status: 'draft',
      issues: [],
    };

    expect(() => RequirementSchema.parse(valid)).not.toThrow();
  });

  // Test invalid cases
  it('should reject invalid requirement ID', () => {
    const invalid = { ...valid, id: 'INVALID-001' };
    expect(() => RequirementSchema.parse(invalid)).toThrow();
  });

  it('should reject complexity outside 1-10', () => {
    const invalid = { ...valid, complexity: 15 };
    expect(() => RequirementSchema.parse(invalid)).toThrow();
  });

  // Test batch validation
  it('should validate requirements file with metadata', () => {
    const file = {
      metadata: {
        prd_source: 'test.md',
        analyzed_at: new Date().toISOString(),
        analyzer_version: '1.0.0',
        total_requirements: 1,
      },
      requirements: [valid],
    };

    expect(() => RequirementsFileSchema.parse(file)).not.toThrow();
  });

  // Test relationship validation
  it('should reject if total_requirements mismatch', () => {
    const file = {
      metadata: {
        prd_source: 'test.md',
        analyzed_at: new Date().toISOString(),
        analyzer_version: '1.0.0',
        total_requirements: 5, // Mismatch!
      },
      requirements: [valid],
    };

    expect(() => RequirementsFileSchema.parse(file)).toThrow();
  });

  // Test dependency validation
  it('should reject undefined dependencies', () => {
    const invalid = {
      ...valid,
      dependencies: ['REQ-FUNC-999'], // Doesn't exist
    };

    const file = {
      metadata: { /* ... */ },
      requirements: [invalid],
    };

    expect(() => RequirementsFileSchema.parse(file)).toThrow();
  });
});
```

### 7.4 Performance Considerations

1. **Lazy validation**: Only validate when needed, not on every property access
2. **Cached schemas**: Don't recreate Zod schemas repeatedly - store as module constants
3. **Streaming for large files**: Consider splitting validation for 1000+ item arrays
4. **Batch operations**: Validate collections once, not per item
5. **Type checking is free**: TypeScript compile-time checks cost nothing at runtime

### 7.5 Documentation and Maintenance

1. **Schema versioning file**: Keep `SCHEMA_VERSIONS.md` documenting all versions
2. **Example YAML files**: Provide valid examples for each schema in `/contracts/examples/`
3. **Migration guides**: Document how to upgrade schemas between major versions
4. **Error catalog**: Maintain documentation of all possible validation errors
5. **Changelog**: Track all schema changes with breaking/non-breaking indicators

---

## 8. Recommended Project Structure

```
src/
├── schemas/
│   ├── index.ts              # Export all schemas and types
│   ├── primitives.ts         # Base types (IDs, enums, etc.)
│   ├── entities/
│   │   ├── requirement.ts    # Requirement entity + types
│   │   ├── component.ts      # Component entity + types
│   │   ├── gap.ts            # Gap entity + types
│   │   ├── question.ts       # Question entity + types
│   │   ├── session.ts        # Session entity + types
│   │   └── tdd.ts            # TDD entity + types
│   ├── files/
│   │   ├── requirements.yaml.ts  # Requirements file schema
│   │   ├── components.yaml.ts    # Components file schema
│   │   └── ...
│   ├── versioning.ts         # Version handling and migrations
│   └── error-map.ts          # Custom error messages
│
├── validation/
│   ├── loader.ts             # YAML loading + validation
│   ├── error-formatter.ts    # Format validation errors
│   └── batch-validator.ts    # Validate multiple files
│
├── types/
│   └── index.ts              # Re-export types from schemas
│
└── tests/
    ├── schemas/
    │   ├── requirement.test.ts
    │   ├── component.test.ts
    │   └── ...
    └── validation/
        ├── loader.test.ts
        └── error-formatter.test.ts
```

---

## 9. Integration with MT-PRISM Skills

### 9.1 PRD Analyzer Output

```typescript
// PRD Analyzer uses Requirement schema to output requirements.yaml
async function analyzePRD(prdContent: string): Promise<RequirementsFile> {
  // 1. Parse PRD (text → structured)
  const extracted = await llm.extract(prdContent);

  // 2. Transform to Zod-compatible format
  const toBeParsed = {
    metadata: {
      prd_source: 'inline',
      analyzed_at: new Date().toISOString(),
      analyzer_version: '1.0.0',
      total_requirements: extracted.requirements.length,
    },
    requirements: extracted.requirements,
  };

  // 3. Validate with Zod
  const validated = RequirementsFileSchema.parse(toBeParsed);

  // 4. Return validated data (guaranteed type-safe)
  return validated;
}
```

### 9.2 Validator Skill Input Validation

```typescript
// Validator receives requirements.yaml and components.yaml
async function validateRequirementsVsComponents(
  requirementsPath: string,
  componentsPath: string
): Promise<GapsFile> {
  // Load and validate inputs
  const [reqResult, compResult] = await Promise.all([
    loadAndValidateRequirements(requirementsPath),
    loadAndValidateComponents(componentsPath),
  ]);

  if (!reqResult.success || !compResult.success) {
    throw new ValidationError('Input validation failed');
  }

  const { data: requirements } = reqResult;
  const { data: components } = compResult;

  // Now we can safely use requirements and components
  // TypeScript knows exact structure, no runtime type checks needed

  // Generate gaps...
  const gaps = detectGaps(requirements, components);

  // Return validated gaps
  return GapsFileSchema.parse({
    gaps,
  });
}
```

### 9.3 TDD Generator Using Validated Data

```typescript
// TDD Generator uses validated requirements + components
async function generateTDD(
  requirements: RequirementsFile,
  components: ComponentsFile,
  sessionId: SessionId
): Promise<TDD> {
  // Inputs are already validated, so we know:
  // - All requirement IDs exist and are unique
  // - All component IDs exist and are unique
  // - All dependencies resolve
  // - No circular dependencies
  // - All enums are valid

  const tdd: PartialTDD = {
    session_id: sessionId,
    generated_at: new Date().toISOString(),
    version: '1.0.0',

    // Build from validated data
    requirements_coverage: {
      total: requirements.requirements.length,
      covered: 0, // compute
      uncovered: [],
    },

    // No null checks needed - structure is guaranteed
    api_spec: {
      format: 'openapi-3.1',
      endpoints: requirements.requirements
        .filter(r => r.type === 'functional')
        .map(r => ({
          method: 'POST', // determine from content
          path: `/api/${r.id.toLowerCase()}`,
          summary: r.title,
          requirement_ids: [r.id],
        })),
    },

    // ... rest of TDD generation
  };

  // Final validation before returning
  return TDDSchema.parse(tdd);
}
```

---

## 10. Tools and Ecosystem

### 10.1 Recommended Libraries

```json
{
  "dependencies": {
    "zod": "^3.22.0",
    "yaml": "^2.3.0",
    "@types/node": "^20.0.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@types/vitest": "^1.0.0",
    "typescript": "^5.3.0"
  }
}
```

### 10.2 VS Code Extensions for YAML Development

1. **YAML (Red Hat)**: Schema validation, autocompletion
2. **Even Better TOML**: Schema support for configuration
3. **Prettier - Code formatter**: Format YAML consistently
4. **Error Lens**: Display validation errors inline

### 10.3 CLI Tools for Schema Management

```bash
# Generate TypeScript types from schema
npx zod-to-ts src/schemas/requirement.ts

# Validate YAML files
npx zod-validate requirements.yaml --schema RequirementsFileSchema

# Generate migration scripts
npx zod-migrate --from 1.0.0 --to 2.0.0
```

---

## Conclusion

YAML schema validation with Zod provides:

1. **Type Safety**: Single source of truth for runtime validation and TypeScript types
2. **Error Handling**: Excellent error messages with custom error maps
3. **Composability**: Build complex schemas from simple, reusable parts
4. **Maintainability**: Easy to test, version, and migrate schemas
5. **Developer Experience**: Full IDE autocompletion and type checking
6. **Scalability**: Handles complex nested structures with relationships

For MT-PRISM, implementing validation at the skill boundaries ensures:
- Clean contracts between skills
- Early error detection with clear feedback
- Type-safe data flow through the workflow
- Easy integration with AI provider outputs
- Reliable artifact generation

The recommended approach is to define schemas in layers (primitives → entities → files), use discriminated unions for polymorphic types, implement custom error maps for user-friendly messages, and maintain backward compatibility through versioning strategies.
