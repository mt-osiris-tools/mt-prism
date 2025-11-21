/**
 * Requirements Quality Validator
 *
 * Validates requirement quality and completeness before technical design.
 * Detects missing information, vague language, and dependency issues.
 *
 * @module skills/quality-validator
 */

import type { Requirement, RequirementsOutput } from '../types/requirement.js';

/**
 * Quality issue detected in requirements
 */
export interface QualityIssue {
  requirementId: string;
  type:
    | 'missing-criteria'
    | 'vague-language'
    | 'circular-dependency'
    | 'missing-dependency'
    | 'orphaned-requirement'
    | 'low-confidence'
    | 'empty-field';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

/**
 * Quality validation result
 */
export interface QualityValidationResult {
  overallScore: number; // 0.0-1.0
  issues: QualityIssue[];
  passedChecks: number;
  failedChecks: number;
  scores: {
    completeness: number; // 0.0-1.0
    clarity: number; // 0.0-1.0
    consistency: number; // 0.0-1.0
    testability: number; // 0.0-1.0
  };
  report: string;
  issuesByRequirement: Record<string, QualityIssue[]>;
}

/**
 * Validates overall requirements quality
 *
 * @param requirements - Requirements output from PRD Analyzer
 * @returns Quality validation result
 */
export async function validateRequirementsQuality(
  requirements: RequirementsOutput
): Promise<QualityValidationResult> {
  const allIssues: QualityIssue[] = [];

  // Check for empty requirements
  if (requirements.requirements.length === 0) {
    allIssues.push({
      requirementId: 'GLOBAL',
      type: 'empty-field',
      severity: 'critical',
      description: 'No requirements extracted from PRD',
      recommendation: 'Review PRD content and ensure it contains actual requirements',
    });
  }

  // Run all validation checks
  const missingCriteriaIssues = detectMissingAcceptanceCriteria(requirements.requirements);
  const vagueLanguageIssues = detectVagueLanguage(requirements.requirements);
  const dependencyIssues = validateDependencies(requirements.requirements);
  const confidenceIssues = detectLowConfidence(requirements.requirements);

  allIssues.push(
    ...missingCriteriaIssues,
    ...vagueLanguageIssues,
    ...dependencyIssues,
    ...confidenceIssues
  );

  // Calculate scores
  const completenessScore = calculateCompletenessScore(requirements.requirements, missingCriteriaIssues);
  const clarityScore = calculateClarityScore(requirements.requirements, vagueLanguageIssues);
  const consistencyScore = calculateConsistencyScore(requirements.requirements, dependencyIssues);
  const testabilityScore = calculateTestabilityScore(requirements.requirements, allIssues);

  const overallScore =
    (completenessScore + clarityScore + consistencyScore + testabilityScore) / 4;

  // Count checks
  const totalChecks = requirements.requirements.length * 4; // 4 dimensions per requirement
  const failedChecks = allIssues.filter((i) => i.severity === 'critical' || i.severity === 'high').length;
  const passedChecks = totalChecks - failedChecks;

  // Group issues by requirement
  const issuesByRequirement: Record<string, QualityIssue[]> = {};
  allIssues.forEach((issue) => {
    if (!issuesByRequirement[issue.requirementId]) {
      issuesByRequirement[issue.requirementId] = [];
    }
    issuesByRequirement[issue.requirementId]!.push(issue);
  });

  // Generate report
  const report = generateQualityReport({
    overallScore,
    issues: allIssues,
    passedChecks,
    failedChecks,
    scores: { completeness: completenessScore, clarity: clarityScore, consistency: consistencyScore, testability: testabilityScore },
  });

  return {
    overallScore,
    issues: allIssues,
    passedChecks,
    failedChecks,
    scores: {
      completeness: completenessScore,
      clarity: clarityScore,
      consistency: consistencyScore,
      testability: testabilityScore,
    },
    report,
    issuesByRequirement,
  };
}

/**
 * Detects requirements with missing or insufficient acceptance criteria
 */
export function detectMissingAcceptanceCriteria(requirements: Requirement[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  requirements.forEach((req) => {
    // No criteria at all
    if (req.acceptance_criteria.length === 0) {
      issues.push({
        requirementId: req.id,
        type: 'missing-criteria',
        severity: 'high',
        description: 'No acceptance criteria defined - requirement is not testable',
        recommendation: `Add specific, testable criteria for "${req.title}". Include: what to test, expected behavior, success conditions`,
      });
      return;
    }

    // Insufficient criteria for complexity
    if (req.complexity >= 7 && req.acceptance_criteria.length < 3) {
      issues.push({
        requirementId: req.id,
        type: 'missing-criteria',
        severity: 'medium',
        description: `Complex requirement (complexity ${req.complexity}) has insufficient acceptance criteria (${req.acceptance_criteria.length})`,
        recommendation: `Add more detailed criteria to match complexity. Suggest at least ${Math.ceil(req.complexity / 2)} criteria for comprehensive testing`,
      });
    }

    // Vague criteria
    const vagueCriteria = req.acceptance_criteria.filter((criterion) =>
      /\b(works?|functions?|handles?|supports?)\b/i.test(criterion) &&
      criterion.split(' ').length < 5
    );

    if (vagueCriteria.length > 0) {
      issues.push({
        requirementId: req.id,
        type: 'missing-criteria',
        severity: 'medium',
        description: `Vague acceptance criteria: "${vagueCriteria[0]}"`,
        recommendation: 'Make criteria specific and measurable. Include expected inputs, outputs, and success conditions',
      });
    }
  });

  return issues;
}

/**
 * Detects vague language in requirements
 */
export function detectVagueLanguage(requirements: Requirement[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  const vagueTerms = [
    { term: 'fast', suggestion: 'specific latency (e.g., "under 2 seconds")' },
    { term: 'quick', suggestion: 'specific time (e.g., "within 500ms")' },
    { term: 'scalable', suggestion: 'specific capacity (e.g., "supports 10,000 concurrent users")' },
    { term: 'efficient', suggestion: 'specific metric (e.g., "< 100ms CPU time")' },
    { term: 'intuitive', suggestion: 'specific usability metric (e.g., "90% task completion on first attempt")' },
    { term: 'user-friendly', suggestion: 'specific UX metric (e.g., "average 3 clicks to complete task")' },
    { term: 'many', suggestion: 'specific number (e.g., "at least 50")' },
    { term: 'several', suggestion: 'exact count or range (e.g., "3-5")' },
    { term: 'some', suggestion: 'specific quantity' },
    { term: 'good', suggestion: 'measurable quality metric' },
    { term: 'well', suggestion: 'specific success criteria' },
    { term: 'easily', suggestion: 'specific ease-of-use metric' },
  ];

  requirements.forEach((req) => {
    const fullText = `${req.description} ${req.acceptance_criteria.join(' ')}`.toLowerCase();

    vagueTerms.forEach(({ term, suggestion }) => {
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      if (regex.test(fullText)) {
        issues.push({
          requirementId: req.id,
          type: 'vague-language',
          severity: req.type === 'performance' || req.type === 'security' ? 'high' : 'medium',
          description: `Vague term "${term}" found in requirement or criteria`,
          recommendation: `Replace "${term}" with ${suggestion}`,
        });
      }
    });
  });

  return issues;
}

/**
 * Validates requirement dependencies
 */
export function validateDependencies(requirements: Requirement[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const reqIds = new Set(requirements.map((r) => r.id));

  // Check for missing dependencies
  requirements.forEach((req) => {
    req.dependencies.forEach((depId) => {
      if (!reqIds.has(depId)) {
        issues.push({
          requirementId: req.id,
          type: 'missing-dependency',
          severity: 'high',
          description: `Depends on non-existent requirement: ${depId}`,
          recommendation: `Either add requirement ${depId} or remove from dependencies`,
        });
      }
    });
  });

  // Check for circular dependencies
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function detectCycle(reqId: string, path: string[]): string[] | null {
    if (recursionStack.has(reqId)) {
      return [...path, reqId]; // Found cycle
    }
    if (visited.has(reqId)) {
      return null; // Already processed
    }

    visited.add(reqId);
    recursionStack.add(reqId);

    const req = requirements.find((r) => r.id === reqId);
    if (req) {
      for (const depId of req.dependencies) {
        const cycle = detectCycle(depId, [...path, reqId]);
        if (cycle) {
          return cycle;
        }
      }
    }

    recursionStack.delete(reqId);
    return null;
  }

  requirements.forEach((req) => {
    if (!visited.has(req.id)) {
      const cycle = detectCycle(req.id, []);
      if (cycle) {
        issues.push({
          requirementId: req.id,
          type: 'circular-dependency',
          severity: 'high',
          description: `Circular dependency detected: ${cycle.join(' → ')}`,
          recommendation: 'Break the circular dependency by removing or reordering dependencies',
        });
      }
    }
  });

  // Check for orphaned requirements (low priority, no dependents)
  const depended = new Set(requirements.flatMap((r) => r.dependencies));
  requirements.forEach((req) => {
    if (req.priority === 'low' && !depended.has(req.id) && req.dependencies.length === 0) {
      issues.push({
        requirementId: req.id,
        type: 'orphaned-requirement',
        severity: 'low',
        description: 'Low priority requirement with no dependencies or dependents',
        recommendation: 'Review if this requirement is necessary or can be deferred',
      });
    }
  });

  return issues;
}

/**
 * Detects requirements with low confidence scores
 */
function detectLowConfidence(requirements: Requirement[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  requirements.forEach((req) => {
    if (req.confidence < 0.7) {
      issues.push({
        requirementId: req.id,
        type: 'low-confidence',
        severity: req.confidence < 0.5 ? 'high' : 'medium',
        description: `Low confidence score (${(req.confidence * 100).toFixed(0)}%) indicates ambiguity`,
        recommendation: 'Review requirement for ambiguous language, missing details, or contradictions',
      });
    }
  });

  return issues;
}

/**
 * Calculate completeness score
 */
function calculateCompletenessScore(
  requirements: Requirement[],
  missingIssues: QualityIssue[]
): number {
  if (requirements.length === 0) return 0;

  const reqsWithIssues = new Set(
    missingIssues.map((i) => i.requirementId)
  );

  const completeReqs = requirements.length - reqsWithIssues.size;
  return completeReqs / requirements.length;
}

/**
 * Calculate clarity score
 */
function calculateClarityScore(
  requirements: Requirement[],
  vagueIssues: QualityIssue[]
): number {
  if (requirements.length === 0) return 0;

  const reqsWithIssues = new Set(
    vagueIssues.map((i) => i.requirementId)
  );

  const clearReqs = requirements.length - reqsWithIssues.size;
  return clearReqs / requirements.length;
}

/**
 * Calculate consistency score
 */
function calculateConsistencyScore(
  requirements: Requirement[],
  dependencyIssues: QualityIssue[]
): number {
  if (requirements.length === 0) return 1; // No deps = consistent

  const criticalIssues = dependencyIssues.filter(
    (i) => i.type === 'circular-dependency' || i.type === 'missing-dependency'
  );

  if (criticalIssues.length === 0) return 1;

  const reqsWithIssues = new Set(criticalIssues.map((i) => i.requirementId));
  const consistentReqs = requirements.length - reqsWithIssues.size;
  return consistentReqs / requirements.length;
}

/**
 * Calculate testability score
 */
function calculateTestabilityScore(
  requirements: Requirement[],
  allIssues: QualityIssue[]
): number {
  if (requirements.length === 0) return 0;

  // Requirements are testable if they have:
  // 1. Acceptance criteria
  // 2. Clear language (no vague terms)
  // 3. High confidence

  const untestableReqs = new Set<string>();

  allIssues.forEach((issue) => {
    if (
      issue.type === 'missing-criteria' ||
      (issue.type === 'vague-language' && issue.severity === 'high') ||
      (issue.type === 'low-confidence' && issue.severity === 'high')
    ) {
      untestableReqs.add(issue.requirementId);
    }
  });

  const testableReqs = requirements.length - untestableReqs.size;
  return testableReqs / requirements.length;
}

/**
 * Generate human-readable quality report
 */
function generateQualityReport(result: {
  overallScore: number;
  issues: QualityIssue[];
  passedChecks: number;
  failedChecks: number;
  scores: Record<string, number>;
}): string {
  const lines: string[] = [];

  lines.push('# Requirements Quality Report\n');
  lines.push(`**Overall Quality Score**: ${(result.overallScore * 100).toFixed(1)}%\n`);

  // Score breakdown
  lines.push('## Quality Dimensions\n');
  lines.push(`- **Completeness**: ${(result.scores.completeness * 100).toFixed(1)}%`);
  lines.push(`- **Clarity**: ${(result.scores.clarity * 100).toFixed(1)}%`);
  lines.push(`- **Consistency**: ${(result.scores.consistency * 100).toFixed(1)}%`);
  lines.push(`- **Testability**: ${(result.scores.testability * 100).toFixed(1)}%\n`);

  // Checks summary
  lines.push('## Validation Summary\n');
  lines.push(`- ✅ Passed Checks: ${result.passedChecks}`);
  lines.push(`- ❌ Failed Checks: ${result.failedChecks}\n`);

  // Issues Found
  if (result.issues.length > 0) {
    lines.push(`## Issues Found (${result.issues.length})\n`);

    const bySeverity = {
      critical: result.issues.filter((i) => i.severity === 'critical'),
      high: result.issues.filter((i) => i.severity === 'high'),
      medium: result.issues.filter((i) => i.severity === 'medium'),
      low: result.issues.filter((i) => i.severity === 'low'),
    };

    (['critical', 'high', 'medium', 'low'] as const).forEach((severity) => {
      if (bySeverity[severity].length > 0) {
        lines.push(`### ${severity.toUpperCase()} (${bySeverity[severity].length})\n`);
        bySeverity[severity].forEach((issue, idx) => {
          lines.push(`${idx + 1}. **${issue.requirementId}**: ${issue.description}`);
          lines.push(`   💡 *${issue.recommendation}*\n`);
        });
      }
    });
  } else {
    lines.push('## ✅ No Issues Found\n');
    lines.push('All requirements meet quality standards.\n');
  }

  return lines.join('\n');
}
