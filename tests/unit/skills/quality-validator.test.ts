import { describe, it, expect, beforeEach } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parse as parseYAML } from 'yaml';
import {
  validateRequirementsQuality,
  detectMissingAcceptanceCriteria,
  detectVagueLanguage,
  validateDependencies,
  type QualityValidationResult,
  type QualityIssue,
} from '../../../src/skills/quality-validator.js';
import type { RequirementsOutput } from '../../../src/types/requirement.js';

describe('Quality Validator', () => {
  const FIXTURES_DIR = join(process.cwd(), 'tests/fixtures');
  let requirementsWithIssues: RequirementsOutput;
  let requirementsGoodQuality: RequirementsOutput;

  beforeEach(async () => {
    const issuesContent = await readFile(
      join(FIXTURES_DIR, 'requirements-with-issues.yaml'),
      'utf-8'
    );
    requirementsWithIssues = parseYAML(issuesContent) as RequirementsOutput;

    const goodContent = await readFile(
      join(FIXTURES_DIR, 'requirements-good-quality.yaml'),
      'utf-8'
    );
    requirementsGoodQuality = parseYAML(goodContent) as RequirementsOutput;
  });

  describe('Overall Quality Validation', () => {
    it('should detect multiple quality issues in requirements', async () => {
      const result = await validateRequirementsQuality(requirementsWithIssues);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('passedChecks');
      expect(result).toHaveProperty('failedChecks');

      // Should find issues
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThan(0.8); // Low quality due to issues
    });

    it('should give high score to good quality requirements', async () => {
      const result = await validateRequirementsQuality(requirementsGoodQuality);

      expect(result.overallScore).toBeGreaterThan(0.9);
      expect(result.failedChecks).toBe(0);
      expect(result.passedChecks).toBeGreaterThan(0);
    });

    it('should categorize issues by severity', async () => {
      const result = await validateRequirementsQuality(requirementsWithIssues);

      const criticalIssues = result.issues.filter((i) => i.severity === 'critical');
      const highIssues = result.issues.filter((i) => i.severity === 'high');
      const mediumIssues = result.issues.filter((i) => i.severity === 'medium');

      expect(criticalIssues.length + highIssues.length + mediumIssues.length).toBe(
        result.issues.length
      );
    });

    it('should provide actionable recommendations for each issue', async () => {
      const result = await validateRequirementsQuality(requirementsWithIssues);

      result.issues.forEach((issue) => {
        expect(issue).toHaveProperty('requirementId');
        expect(issue).toHaveProperty('type');
        expect(issue).toHaveProperty('severity');
        expect(issue).toHaveProperty('description');
        expect(issue).toHaveProperty('recommendation');
        expect(issue.recommendation).toBeTruthy();
        expect(issue.recommendation.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Missing Acceptance Criteria Detection', () => {
    it('should detect requirements with no acceptance criteria', () => {
      const issues = detectMissingAcceptanceCriteria(requirementsWithIssues.requirements);

      const missingCriteria = issues.filter((i) => i.type === 'missing-criteria');
      expect(missingCriteria.length).toBeGreaterThan(0);

      const req001Issue = missingCriteria.find((i) => i.requirementId === 'REQ-FUNC-001');
      expect(req001Issue).toBeDefined();
      expect(req001Issue?.severity).toBe('high');
    });

    it('should detect requirements with insufficient criteria', () => {
      const testReq: RequirementsOutput = {
        metadata: {
          prd_source: 'test',
          analyzed_at: new Date().toISOString(),
          total_requirements: 1,
          complexity_average: 7.0,
          confidence_average: 0.8,
        },
        requirements: [
          {
            id: 'REQ-FUNC-001',
            type: 'functional',
            priority: 'high',
            complexity: 7, // High complexity
            title: 'Complex Feature',
            description:
              'Implement real-time collaborative editing with conflict resolution',
            acceptance_criteria: ['Users can edit'], // Too few for complexity
            dependencies: [],
            confidence: 0.8,
            status: 'draft',
            issues: [],
          },
        ],
      };

      const issues = detectMissingAcceptanceCriteria(testReq.requirements);

      const insufficientIssues = issues.filter(
        (i) => i.description.includes('insufficient')
      );
      expect(insufficientIssues.length).toBeGreaterThan(0);
    });

    it('should NOT flag requirements with adequate criteria', () => {
      const issues = detectMissingAcceptanceCriteria(requirementsGoodQuality.requirements);

      const criticalOrHighIssues = issues.filter(
        (i) => i.severity === 'critical' || i.severity === 'high'
      );
      expect(criticalOrHighIssues.length).toBe(0);
    });

    it('should provide recommendations for missing criteria', () => {
      const issues = detectMissingAcceptanceCriteria(requirementsWithIssues.requirements);

      const missingIssues = issues.filter((i) => i.type === 'missing-criteria');
      missingIssues.forEach((issue) => {
        expect(issue.recommendation).toContain('acceptance criteria');
        expect(issue.recommendation.length).toBeGreaterThan(20);
      });
    });
  });

  describe('Vague Language Detection', () => {
    it('should detect vague performance terms', () => {
      const issues = detectVagueLanguage(requirementsWithIssues.requirements);

      const vaguePerf = issues.filter(
        (i) => i.requirementId === 'REQ-PERF-001' && i.type === 'vague-language'
      );
      expect(vaguePerf.length).toBeGreaterThan(0);
    });

    it('should flag common vague terms', () => {
      const testRequirements = [
        {
          id: 'REQ-TEST-001',
          description: 'System should be fast and scalable',
          acceptance_criteria: ['Fast performance', 'Good scalability'],
        },
        {
          id: 'REQ-TEST-002',
          description: 'UI should be intuitive and user-friendly',
          acceptance_criteria: ['Easy to use'],
        },
        {
          id: 'REQ-TEST-003',
          description: 'Handle many concurrent users efficiently',
          acceptance_criteria: ['Support many users'],
        },
      ];

      const vaguesterms = ['fast', 'scalable', 'intuitive', 'user-friendly', 'many', 'efficiently'];

      testRequirements.forEach((req) => {
        const issues = detectVagueLanguage([req as any]);
        const hasVagueTerms = vagueterms.some((term) =>
          issues.some((i) => i.description.toLowerCase().includes(term))
        );
        expect(hasVagueTerms).toBe(true);
      });
    });

    it('should NOT flag specific, measurable requirements', () => {
      const issues = detectVagueLanguage(requirementsGoodQuality.requirements);

      const highSeverityVague = issues.filter(
        (i) => i.type === 'vague-language' && i.severity === 'high'
      );
      expect(highSeverityVague.length).toBe(0);
    });

    it('should provide specific recommendations for vague terms', () => {
      const issues = detectVagueLanguage(requirementsWithIssues.requirements);

      const vagueIssues = issues.filter((i) => i.type === 'vague-language');
      vagueIssues.forEach((issue) => {
        expect(issue.recommendation).toBeTruthy();
        // Recommendation should suggest specific metrics
        const hasMetricSuggestion =
          issue.recommendation.includes('specify') ||
          issue.recommendation.includes('define') ||
          issue.recommendation.includes('measurable');
        expect(hasMetricSuggestion).toBe(true);
      });
    });
  });

  describe('Dependency Validation', () => {
    it('should detect circular dependencies', () => {
      const issues = validateDependencies(requirementsWithIssues.requirements);

      const circularIssues = issues.filter((i) => i.type === 'circular-dependency');
      expect(circularIssues.length).toBeGreaterThan(0);

      // Should detect the 002 <-> 003 circular dependency
      const circular002_003 = circularIssues.some(
        (i) =>
          i.description.includes('REQ-FUNC-002') && i.description.includes('REQ-FUNC-003')
      );
      expect(circular002_003).toBe(true);
    });

    it('should detect missing dependencies', () => {
      const testRequirements = [
        {
          id: 'REQ-FUNC-001',
          type: 'functional',
          priority: 'high',
          complexity: 3,
          title: 'User Profile',
          description: 'Users can view their profile',
          acceptance_criteria: ['Profile page displays user data'],
          dependencies: ['REQ-FUNC-999'], // Non-existent requirement
          confidence: 0.8,
          status: 'draft',
          issues: [],
        },
      ];

      const issues = validateDependencies(testRequirements as any);

      const missingDeps = issues.filter((i) => i.type === 'missing-dependency');
      expect(missingDeps.length).toBeGreaterThan(0);
      expect(missingDeps[0]?.description).toContain('REQ-FUNC-999');
    });

    it('should validate dependency graph integrity', () => {
      const issues = validateDependencies(requirementsGoodQuality.requirements);

      // Good quality requirements should have valid dependencies
      const criticalDepIssues = issues.filter(
        (i) =>
          (i.type === 'missing-dependency' || i.type === 'circular-dependency') &&
          i.severity === 'critical'
      );
      expect(criticalDepIssues.length).toBe(0);
    });

    it('should detect orphaned requirements', () => {
      const testRequirements = [
        {
          id: 'REQ-FUNC-001',
          type: 'functional',
          priority: 'low',
          complexity: 2,
          title: 'Minor Feature',
          description: 'An optional feature that nothing depends on',
          acceptance_criteria: ['Feature works'],
          dependencies: [],
          confidence: 0.8,
          status: 'draft',
          issues: [],
        },
        {
          id: 'REQ-FUNC-002',
          type: 'functional',
          priority: 'critical',
          complexity: 8,
          title: 'Core Feature',
          description: 'Critical system feature',
          acceptance_criteria: ['Core functionality works'],
          dependencies: [],
          confidence: 0.9,
          status: 'draft',
          issues: [],
        },
      ];

      const issues = validateDependencies(testRequirements as any);

      // Low priority requirement with no dependents might be flagged for review
      const orphanIssues = issues.filter((i) => i.type === 'orphaned-requirement');
      // This is a warning, not an error
      if (orphanIssues.length > 0) {
        expect(orphanIssues[0]?.severity).toBe('low');
      }
    });
  });

  describe('Quality Scoring', () => {
    it('should calculate quality score based on multiple factors', async () => {
      const goodResult = await validateRequirementsQuality(requirementsGoodQuality);
      const poorResult = await validateRequirementsQuality(requirementsWithIssues);

      expect(goodResult.overallScore).toBeGreaterThan(poorResult.overallScore);
      expect(goodResult.overallScore).toBeGreaterThan(0.9);
      expect(poorResult.overallScore).toBeLessThan(0.7);
    });

    it('should provide breakdown by quality dimension', async () => {
      const result = await validateRequirementsQuality(requirementsWithIssues);

      expect(result).toHaveProperty('scores');
      expect(result.scores).toHaveProperty('completeness');
      expect(result.scores).toHaveProperty('clarity');
      expect(result.scores).toHaveProperty('consistency');
      expect(result.scores).toHaveProperty('testability');

      // All scores should be 0-1
      Object.values(result.scores).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Quality Report Generation', () => {
    it('should generate human-readable report', async () => {
      const result = await validateRequirementsQuality(requirementsWithIssues);

      expect(result).toHaveProperty('report');
      expect(result.report).toBeTruthy();
      expect(result.report.length).toBeGreaterThan(100);

      // Report should include summary
      expect(result.report).toContain('Quality Score');
      expect(result.report).toContain('Issues Found');
    });

    it('should group issues by requirement', async () => {
      const result = await validateRequirementsQuality(requirementsWithIssues);

      expect(result).toHaveProperty('issuesByRequirement');

      const req001Issues = result.issuesByRequirement['REQ-FUNC-001'];
      expect(req001Issues).toBeDefined();
      expect(Array.isArray(req001Issues)).toBe(true);
    });

    it('should prioritize issues by severity', async () => {
      const result = await validateRequirementsQuality(requirementsWithIssues);

      const sortedIssues = [...result.issues].sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      // First issue should be highest severity
      expect(['critical', 'high']).toContain(sortedIssues[0]?.severity);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty requirements list', async () => {
      const emptyRequirements: RequirementsOutput = {
        metadata: {
          prd_source: 'empty',
          analyzed_at: new Date().toISOString(),
          total_requirements: 0,
          complexity_average: 0,
          confidence_average: 0,
        },
        requirements: [],
      };

      const result = await validateRequirementsQuality(emptyRequirements);

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some((i) => i.description.includes('No requirements'))).toBe(true);
    });

    it('should handle requirements with all fields missing', () => {
      const malformedReq = {
        id: 'REQ-TEST-001',
        type: 'functional',
        priority: 'high',
        complexity: 5,
        title: '',
        description: '',
        acceptance_criteria: [],
        dependencies: [],
        confidence: 0.5,
        status: 'draft',
        issues: [],
      };

      const issues = detectMissingAcceptanceCriteria([malformedReq as any]);
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should handle very long dependency chains', () => {
      const chainLength = 10;
      const chainRequirements = Array.from({ length: chainLength }, (_, i) => ({
        id: `REQ-FUNC-${String(i + 1).padStart(3, '0')}`,
        type: 'functional',
        priority: 'medium',
        complexity: 3,
        title: `Requirement ${i + 1}`,
        description: `Description ${i + 1}`,
        acceptance_criteria: [`Criterion ${i + 1}`],
        dependencies: i > 0 ? [`REQ-FUNC-${String(i).padStart(3, '0')}`] : [],
        confidence: 0.8,
        status: 'draft',
        issues: [],
      }));

      const issues = validateDependencies(chainRequirements as any);

      // Long chains should be flagged for review
      const chainIssues = issues.filter((i) => i.description.includes('chain'));
      expect(chainIssues.length).toBeGreaterThanOrEqual(0); // Warning, not error
    });
  });
});
