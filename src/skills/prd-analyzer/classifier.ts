/**
 * Requirement Classification Module
 *
 * Classifies requirements by type, assigns priority, and calculates complexity.
 *
 * @module skills/prd-analyzer/classifier
 */

import type { RequirementType, RequirementPriority } from '../../types/requirement.js';

/**
 * Classification result with confidence score
 */
export interface ClassificationResult {
  type: RequirementType;
  confidence: number; // 0.0-1.0
}

/**
 * Classifies a requirement by analyzing its text content
 *
 * @param text - Requirement description
 * @returns Classification result with confidence
 */
export function classifyRequirement(text: string): ClassificationResult {
  if (!text || text.trim().length === 0) {
    return { type: 'functional', confidence: 0.3 };
  }

  const lowerText = text.toLowerCase();

  // Security indicators (highest priority check)
  const securityKeywords = [
    'encrypt', 'hash', 'auth', 'security', 'password', 'credential',
    'pci', 'hipaa', 'gdpr', 'compliance', 'vulnerability', 'threat',
    'ssl', 'tls', 'certificate', 'token', 'session', 'permission',
  ];

  if (securityKeywords.some((kw) => lowerText.includes(kw))) {
    const confidence = calculateKeywordConfidence(lowerText, securityKeywords);
    return { type: 'security', confidence };
  }

  // Performance indicators
  const performanceKeywords = [
    'load', 'response time', 'latency', 'throughput', 'concurrent',
    'scale', 'performance', 'speed', 'fast', 'slow', 'ms', 'second',
    'optimize', 'efficient', 'cache', 'query time', 'fps',
  ];

  const performanceMatches = performanceKeywords.filter((kw) => lowerText.includes(kw)).length;
  const hasNumericMetric = /\d+\s*(ms|second|minute|user|request|transaction)/i.test(text);

  if (performanceMatches >= 2 || (performanceMatches >= 1 && hasNumericMetric)) {
    const confidence = Math.min(0.95, 0.6 + (performanceMatches * 0.1) + (hasNumericMetric ? 0.2 : 0));
    return { type: 'performance', confidence };
  }

  // Constraint indicators
  const constraintKeywords = [
    'must use', 'must integrate', 'required to use', 'built with',
    'framework', 'platform', 'technology stack', 'database',
    'aws', 'azure', 'gcp', 'postgresql', 'mysql', 'mongodb',
    'react', 'angular', 'vue', 'oauth', 'deployment', 'hosting',
  ];

  if (constraintKeywords.some((kw) => lowerText.includes(kw))) {
    const confidence = calculateKeywordConfidence(lowerText, constraintKeywords);
    return { type: 'constraint', confidence };
  }

  // Default to functional with varying confidence
  const functionalKeywords = [
    'user', 'can', 'should', 'able to', 'feature', 'function',
    'create', 'view', 'edit', 'delete', 'manage', 'display',
    'interface', 'button', 'form', 'page', 'screen',
  ];

  const functionalConfidence = calculateKeywordConfidence(lowerText, functionalKeywords);

  // Check for ambiguous language that lowers confidence
  const ambiguousTerms = ['somehow', 'maybe', 'probably', 'something', 'well', 'good'];
  const hasAmbiguity = ambiguousTerms.some((term) => lowerText.includes(term));

  const finalConfidence = hasAmbiguity
    ? Math.max(0.3, functionalConfidence - 0.3)
    : Math.max(0.6, functionalConfidence);

  return { type: 'functional', confidence: finalConfidence };
}

/**
 * Assigns priority based on requirement text and type
 *
 * @param text - Requirement description
 * @param type - Requirement type
 * @returns Priority level
 */
export function assignPriority(
  text: string,
  type: RequirementType
): RequirementPriority {
  if (!text) {
    return 'low';
  }

  const lowerText = text.toLowerCase();

  // Critical indicators
  const criticalKeywords = [
    'critical', 'mandatory', 'must have', 'required', 'essential',
    'compliance', 'legal', 'regulation', 'breach', 'security',
  ];

  if (criticalKeywords.some((kw) => lowerText.includes(kw))) {
    return 'critical';
  }

  // Security requirements are generally high/critical priority
  if (type === 'security') {
    return lowerText.includes('optional') ? 'high' : 'critical';
  }

  // High priority indicators
  const highKeywords = [
    'core', 'primary', 'main', 'key', 'important', 'must',
    'shall', 'payment', 'authentication', 'login', 'registration',
  ];

  if (highKeywords.some((kw) => lowerText.includes(kw))) {
    return 'high';
  }

  // Low priority indicators
  const lowKeywords = [
    'optional', 'nice to have', 'future', 'phase 2', 'if time',
    'consider', 'maybe', 'could', 'might', 'later',
  ];

  if (lowKeywords.some((kw) => lowerText.includes(kw))) {
    return 'low';
  }

  // Medium priority indicators
  const mediumKeywords = [
    'should', 'enhance', 'improve', 'customize', 'preference',
    'setting', 'configuration', 'analytics', 'report',
  ];

  if (mediumKeywords.some((kw) => lowerText.includes(kw))) {
    return 'medium';
  }

  // Default based on type
  if (type === 'performance') {
    return 'high';
  }

  return 'medium'; // Default
}

/**
 * Calculates complexity score (1-10) based on multiple factors
 *
 * @param text - Requirement description
 * @param acceptanceCriteria - List of acceptance criteria
 * @param dependencies - List of dependency IDs
 * @returns Complexity score (1-10)
 */
export function calculateComplexity(
  text: string,
  acceptanceCriteria: string[],
  dependencies: string[]
): number {
  let score = 1; // Base complexity

  const lowerText = text.toLowerCase();

  // Factor 1: Acceptance criteria count (0-3 points)
  const criteriaCount = acceptanceCriteria.length;
  if (criteriaCount === 0) {
    score += 0;
  } else if (criteriaCount <= 2) {
    score += 1;
  } else if (criteriaCount <= 5) {
    score += 2;
  } else {
    score += 3;
  }

  // Factor 2: Dependencies count (0-2 points)
  const depCount = dependencies.length;
  if (depCount >= 5) {
    score += 2;
  } else if (depCount >= 2) {
    score += 1;
  }

  // Factor 3: Technical complexity keywords (0-3 points)
  const highComplexityKeywords = [
    'distributed', 'real-time', 'concurrent', 'algorithm',
    'optimization', 'machine learning', 'ai', 'blockchain',
    'websocket', 'microservice', 'kubernetes', 'transaction',
    'synchronization', 'conflict resolution', 'saga pattern',
    'two-phase commit', 'eventual consistency', 'cqrs',
  ];

  const complexityMatches = highComplexityKeywords.filter((kw) => lowerText.includes(kw)).length;
  if (complexityMatches >= 3) {
    score += 3;
  } else if (complexityMatches >= 2) {
    score += 2;
  } else if (complexityMatches >= 1) {
    score += 1;
  }

  // Factor 4: Integration complexity (0-2 points)
  const integrationKeywords = ['integrate', 'api', 'third-party', 'external', 'service'];
  const integrationMatches = integrationKeywords.filter((kw) => lowerText.includes(kw)).length;
  if (integrationMatches >= 2) {
    score += 2;
  } else if (integrationMatches >= 1) {
    score += 1;
  }

  // Factor 5: Text length indicator (0-1 points)
  // Very detailed descriptions tend to be more complex
  if (text.length > 500) {
    score += 1;
  }

  // Clamp to 1-10 range
  return Math.max(1, Math.min(10, Math.round(score)));
}

/**
 * Helper: Calculate confidence based on keyword matches
 */
function calculateKeywordConfidence(text: string, keywords: string[]): number {
  const matches = keywords.filter((kw) => text.includes(kw)).length;

  if (matches === 0) {
    return 0.4; // Low confidence, but not zero
  } else if (matches === 1) {
    return 0.7;
  } else if (matches === 2) {
    return 0.85;
  } else {
    return 0.95; // High confidence with multiple matches
  }
}
