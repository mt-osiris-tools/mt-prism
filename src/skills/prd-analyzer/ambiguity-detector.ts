/**
 * Ambiguity Detection Module
 *
 * Detects ambiguities, missing information, and quality issues in requirements.
 *
 * @module skills/prd-analyzer/ambiguity-detector
 */

import type { RequirementIssue } from '../../types/requirement.js';
import type { GapSeverity } from '../../types/gap.js';

/**
 * Detects ambiguities and issues in a requirement
 *
 * @param text - Requirement description
 * @param acceptanceCriteria - List of acceptance criteria
 * @returns List of detected issues
 */
export function detectAmbiguities(
  text: string,
  acceptanceCriteria: string[]
): RequirementIssue[] {
  const issues: RequirementIssue[] = [];

  if (!text || text.trim().length === 0) {
    issues.push({
      type: 'incomplete',
      severity: 'critical',
      description: 'Requirement text is empty',
    });
    return issues;
  }

  const lowerText = text.toLowerCase();

  // 1. Detect vague performance terms
  const vaguePerformanceTerms = [
    { term: 'fast', replacement: 'specific latency (e.g., "within 2 seconds")' },
    { term: 'quick', replacement: 'specific latency (e.g., "under 500ms")' },
    { term: 'rapidly', replacement: 'measurable speed metric' },
    { term: 'slow', replacement: 'maximum acceptable time' },
    { term: 'efficient', replacement: 'specific efficiency metric (e.g., "< 100ms CPU time")' },
    { term: 'good performance', replacement: 'quantifiable performance target' },
    { term: 'high load', replacement: 'specific user count or requests per second' },
  ];

  vaguePerformanceTerms.forEach(({ term, replacement }) => {
    if (lowerText.includes(term)) {
      issues.push({
        type: 'ambiguity',
        severity: 'high',
        description: `Vague performance term "${term}" - should specify ${replacement}`,
      });
    }
  });

  // 2. Detect vague quality terms
  const vagueQualityTerms = [
    'intuitive', 'smooth', 'good', 'well', 'nice', 'clean',
    'user-friendly', 'reliable', 'professional', 'modern',
  ];

  vagueQualityTerms.forEach((term) => {
    if (lowerText.includes(term)) {
      issues.push({
        type: 'ambiguity',
        severity: 'medium',
        description: `Subjective term "${term}" - should define specific, measurable criteria`,
      });
    }
  });

  // 3. Detect vague quantity terms
  const vagueQuantityTerms = [
    { term: 'many', replacement: 'specific number' },
    { term: 'several', replacement: 'exact count or range' },
    { term: 'multiple', replacement: 'specific quantity' },
    { term: 'large amount', replacement: 'specific size (e.g., "up to 100GB")' },
    { term: 'various', replacement: 'complete list of options' },
    { term: 'some', replacement: 'specific number or list' },
  ];

  vagueQuantityTerms.forEach(({ term, replacement }) => {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(lowerText)) {
      issues.push({
        type: 'ambiguity',
        severity: 'medium',
        description: `Vague quantity "${term}" - should specify ${replacement}`,
      });
    }
  });

  // 4. Detect TBD/incomplete markers
  const incompleteMarkers = [
    { marker: 'tbd', severity: 'high' as GapSeverity },
    { marker: 'to be determined', severity: 'high' as GapSeverity },
    { marker: 'unclear', severity: 'high' as GapSeverity },
    { marker: 'undefined', severity: 'high' as GapSeverity },
    { marker: 'not specified', severity: 'high' as GapSeverity },
    { marker: 'uncertain', severity: 'medium' as GapSeverity },
    { marker: 'pending', severity: 'medium' as GapSeverity },
  ];

  incompleteMarkers.forEach(({ marker, severity }) => {
    if (lowerText.includes(marker)) {
      issues.push({
        type: 'incomplete',
        severity,
        description: `Incomplete specification: contains "${marker}"`,
      });
    }
  });

  // 5. Detect conditional/uncertain language
  const uncertainLanguage = [
    'might', 'maybe', 'probably', 'potentially', 'consider',
    'should probably', 'may require', 'could need',
  ];

  uncertainLanguage.forEach((term) => {
    if (lowerText.includes(term)) {
      issues.push({
        type: 'ambiguity',
        severity: 'medium',
        description: `Uncertain language: "${term}" - requirement should be definitive`,
      });
    }
  });

  // 6. Detect open questions
  if (text.includes('?')) {
    const questionCount = (text.match(/\?/g) || []).length;
    issues.push({
      type: 'incomplete',
      severity: 'high',
      description: `Contains ${questionCount} unanswered question(s) - needs clarification`,
    });
  }

  // 7. Missing acceptance criteria
  if (acceptanceCriteria.length === 0) {
    issues.push({
      type: 'incomplete',
      severity: 'high',
      description: 'No acceptance criteria defined - how will this be verified?',
    });
  } else if (acceptanceCriteria.length === 1 && text.length > 200) {
    // Complex requirement with too few criteria
    issues.push({
      type: 'incomplete',
      severity: 'medium',
      description: 'Complex requirement has insufficient acceptance criteria',
    });
  }

  // 8. Detect contradictions
  const contradictionPatterns = [
    { pattern: /(must|required|mandatory).*\b(optional|if|maybe|consider)\b/i, desc: 'Contradictory: marked as both required and optional' },
    { pattern: /\b(all|every|always)\b.*\b(some|sometimes|maybe)\b/i, desc: 'Contradictory: absolute and conditional statements conflict' },
  ];

  contradictionPatterns.forEach(({ pattern, desc }) => {
    if (pattern.test(text)) {
      issues.push({
        type: 'ambiguity',
        severity: 'high',
        description: desc,
      });
    }
  });

  // 9. Detect placeholders
  const placeholderPattern = /\[([A-Z_]+)\]/g;
  const placeholders = text.match(placeholderPattern);
  if (placeholders) {
    placeholders.forEach((placeholder) => {
      issues.push({
        type: 'incomplete',
        severity: 'high',
        description: `Contains placeholder ${placeholder} - needs actual value`,
      });
    });
  }

  // 10. Detect deferred features
  const deferredKeywords = [
    'future', 'phase 2', 'later release', 'future consideration',
    'deferred', 'next iteration', 'v2', 'future version',
  ];

  deferredKeywords.forEach((keyword) => {
    if (lowerText.includes(keyword)) {
      issues.push({
        type: 'incomplete',
        severity: 'low', // Intentionally deferred, so low severity
        description: `Feature deferred: mentions "${keyword}" - clarify if in current scope`,
      });
    }
  });

  // 11. Detect stakeholder disagreements
  const disagreementKeywords = [
    'debate', 'disagree', 'conflicting', 'unresolved', 'versus',
    'wants.*but.*prefers', 'marketing.*engineering',
  ];

  disagreementKeywords.forEach((keyword) => {
    const pattern = new RegExp(keyword, 'i');
    if (pattern.test(text)) {
      issues.push({
        type: 'ambiguity',
        severity: 'high',
        description: 'Stakeholder disagreement detected - requires resolution before implementation',
      });
    }
  });

  // 12. Detect pending approvals
  const approvalKeywords = [
    'pending approval', 'awaiting', 'requires sign-off', 'subject to review',
    'legal review', 'security review', 'compliance review',
  ];

  approvalKeywords.forEach((keyword) => {
    if (lowerText.includes(keyword)) {
      issues.push({
        type: 'incomplete',
        severity: 'high',
        description: `Blocked: ${keyword} - cannot proceed until approved`,
      });
    }
  });

  // 13. Detect security ambiguities (higher severity)
  const securityKeywords = ['encrypt', 'security', 'auth', 'password'];
  const hasSecurityContext = securityKeywords.some((kw) => lowerText.includes(kw));

  if (hasSecurityContext) {
    // Upgrade severity of ambiguities in security context
    issues.forEach((issue) => {
      if (issue.type === 'ambiguity' && issue.severity !== 'critical') {
        issue.severity = issue.severity === 'low' ? 'medium' : 'high';
        issue.description += ' (elevated due to security context)';
      }
    });
  }

  return issues;
}

/**
 * Analyzes overall confidence in a requirement
 *
 * @param text - Requirement description
 * @param acceptanceCriteria - List of acceptance criteria
 * @returns Confidence score (0.0-1.0)
 */
export function analyzeConfidence(
  text: string,
  acceptanceCriteria: string[]
): number {
  if (!text || text.trim().length === 0) {
    return 0.1; // Very low confidence for empty requirements
  }

  let confidence = 0.9; // Start with high confidence

  // Detect issues
  const issues = detectAmbiguities(text, acceptanceCriteria);

  // Reduce confidence based on issue severity
  issues.forEach((issue) => {
    switch (issue.severity) {
      case 'critical':
        confidence -= 0.3;
        break;
      case 'high':
        confidence -= 0.2;
        break;
      case 'medium':
        confidence -= 0.1;
        break;
      case 'low':
        confidence -= 0.05;
        break;
    }
  });

  // Factor in acceptance criteria quality
  const criteriaCount = acceptanceCriteria.length;
  if (criteriaCount === 0) {
    confidence -= 0.2;
  } else if (criteriaCount === 1) {
    confidence -= 0.1;
  } else if (criteriaCount >= 5) {
    confidence += 0.05; // Bonus for well-defined criteria
  }

  // Check for specific, measurable language
  const hasNumericMetrics = /\d+\s*(ms|second|minute|hour|day|MB|GB|%)/i.test(text);
  if (hasNumericMetrics) {
    confidence += 0.05; // Bonus for quantifiable requirements
  }

  // Clamp to 0.0-1.0 range
  return Math.max(0.0, Math.min(1.0, confidence));
}
