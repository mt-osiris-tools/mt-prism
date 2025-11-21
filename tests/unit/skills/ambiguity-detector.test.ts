import { describe, it, expect } from 'vitest';
import { detectAmbiguities, analyzeConfidence } from '../../../src/skills/prd-analyzer/ambiguity-detector.js';
import type { RequirementIssue } from '../../../src/types/requirement.js';

describe('Ambiguity Detection', () => {
  describe('Vague Language Detection', () => {
    it('should detect vague performance terms', () => {
      const testCases = [
        'The system should be fast',
        'Response time must be quick',
        'The application should load rapidly',
        'Performance should be good',
        'System must handle high load efficiently',
      ];

      testCases.forEach((text) => {
        const issues = detectAmbiguities(text, []);
        const vag ueIssues = issues.filter((i) => i.type === 'ambiguous');
        expect(vagueIssues.length).toBeGreaterThan(0);
        expect(vagueIssues.some((i) => i.severity === 'high' || i.severity === 'medium')).toBe(true);
      });
    });

    it('should detect vague quality terms', () => {
      const testCases = [
        'The UI should be intuitive',
        'User experience must be smooth',
        'The design should look good',
        'Interface should be user-friendly',
        'System should be reliable',
      ];

      testCases.forEach((text) => {
        const issues = detectAmbiguities(text, []);
        expect(issues.some((i) => i.type === 'ambiguous')).toBe(true);
      });
    });

    it('should detect vague quantity terms', () => {
      const testCases = [
        'Support many concurrent users',
        'Handle several requests simultaneously',
        'Store a large amount of data',
        'Process multiple transactions',
        'Support various file formats',
      ];

      testCases.forEach((text) => {
        const issues = detectAmbiguities(text, []);
        expect(issues.some((i) => i.type === 'ambiguous')).toBe(true);
      });
    });

    it('should NOT flag specific, measurable requirements', () => {
      const testCases = [
        'The system must load within 2 seconds',
        'Support up to 10,000 concurrent users',
        'Store up to 100GB of data',
        'Process 1000 transactions per second',
        'Support PNG, JPG, and GIF file formats',
      ];

      testCases.forEach((text) => {
        const issues = detectAmbiguities(text, []);
        const vagueIssues = issues.filter((i) => i.type === 'ambiguous' && i.severity === 'high');
        expect(vagueIssues.length).toBe(0);
      });
    });
  });

  describe('Missing Information Detection', () => {
    it('should detect TBD markers', () => {
      const testCases = [
        'The exact fields for registration are TBD',
        'Payment processor to be determined',
        'Integration details TBD pending legal review',
        'Specific metrics: TBD',
      ];

      testCases.forEach((text) => {
        const issues = detectAmbiguities(text, []);
        const tbd Issues = issues.filter((i) => i.type === 'incomplete');
        expect(tbdIssues.length).toBeGreaterThan(0);
        expect(tbdIssues.some((i) => i.severity === 'high' || i.severity === 'critical')).toBe(true);
      });
    });

    it('should detect unclear/undefined markers', () => {
      const testCases = [
        'The maximum number of variants is unclear',
        'Shipping calculation method is undefined',
        'User role permissions are not specified',
        'Error handling approach is uncertain',
      ];

      testCases.forEach((text) => {
        const issues = detectAmbiguities(text, []);
        expect(issues.some((i) => i.type === 'incomplete' || i.type === 'ambiguous')).toBe(true);
      });
    });

    it('should detect conditional/uncertain language', () => {
      const testCases = [
        'The system might need to handle inventory',
        'We should probably support backorders',
        'Consider adding multi-currency support',
        'Potentially integrate with shipping carriers',
        'May require real-time notifications',
      ];

      testCases.forEach((text) => {
        const issues = detectAmbiguities(text, []);
        expect(issues.some((i) => i.type === 'ambiguous')).toBe(true);
      });
    });

    it('should detect open questions in requirements', () => {
      const testCases = [
        'Should we support guest checkout?',
        'Do we need multi-currency support?',
        'What payment methods are required?',
        'Which shipping carriers should we integrate?',
      ];

      testCases.forEach((text) => {
        const issues = detectAmbiguities(text, []);
        const questionIssues = issues.filter((i) => i.type === 'incomplete');
        expect(questionIssues.length).toBeGreaterThan(0);
        expect(questionIssues.some((i) => i.severity === 'high')).toBe(true);
      });
    });
  });

  describe('Missing Acceptance Criteria', () => {
    it('should flag requirements with no acceptance criteria', () => {
      const text = 'Users should be able to manage their tasks';
      const criteria: string[] = [];

      const issues = detectAmbiguities(text, criteria);
      const missingCriteria = issues.filter((i) => i.type === 'incomplete' && i.description.includes('acceptance criteria'));
      expect(missingCriteria.length).toBeGreaterThan(0);
      expect(missingCriteria[0]?.severity).toBe('high');
    });

    it('should flag requirements with insufficient acceptance criteria', () => {
      const text = 'Implement comprehensive user authentication system with OAuth, 2FA, and session management';
      const criteria = ['Users can login']; // Too simplistic for complex requirement

      const issues = detectAmbiguities(text, criteria);
      // Should detect mismatch between complexity and criteria detail
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should NOT flag requirements with sufficient acceptance criteria', () => {
      const text = 'Users can create tasks';
      const criteria = [
        'Task form displays with title field',
        'Title is required',
        'Description is optional',
        'Priority can be selected',
        'Task is saved to database',
        'User sees confirmation message',
      ];

      const issues = detectAmbiguities(text, criteria);
      const missingCriteria = issues.filter((i) => i.type === 'incomplete' && i.description.includes('acceptance criteria'));
      expect(missingCriteria.length).toBe(0);
    });
  });

  describe('Contradictions and Inconsistencies', () => {
    it('should detect contradictory statements', () => {
      const text = 'The system must support guest checkout. User accounts are required for all purchases.';
      const issues = detectAmbiguities(text, []);

      const contradictions = issues.filter((i) => i.type === 'ambiguous' && i.description.includes('contradict'));
      expect(contradictions.length).toBeGreaterThan(0);
    });

    it('should detect conflicting requirements', () => {
      const text = 'All data must be encrypted. Encryption is optional for performance reasons.';
      const issues = detectAmbiguities(text, []);

      expect(issues.some((i) => i.type === 'ambiguous' && i.severity === 'high')).toBe(true);
    });

    it('should detect inconsistent priorities', () => {
      const text = 'This is a critical feature but can be deferred to phase 2 if needed.';
      const issues = detectAmbiguities(text, []);

      expect(issues.some((i) => i.type === 'ambiguous')).toBe(true);
    });
  });

  describe('Placeholders and Future Considerations', () => {
    it('should detect placeholder values', () => {
      const testCases = [
        'Integration with [PAYMENT_PROVIDER] required',
        'Use [DATABASE_NAME] for storage',
        'Connect to [API_ENDPOINT]',
        'Maximum of [TBD] items per page',
      ];

      testCases.forEach((text) => {
        const issues = detectAmbiguities(text, []);
        expect(issues.some((i) => i.type === 'incomplete')).toBe(true);
      });
    });

    it('should detect deferred features', () => {
      const testCases = [
        'Multi-warehouse support is marked as future consideration',
        'Mobile app planned for phase 2',
        'Advanced analytics deferred to later release',
        'This will be addressed in future iteration',
      ];

      testCases.forEach((text) => {
        const issues = detectAmbiguities(text, []);
        const deferredIssues = issues.filter((i) => i.description.includes('future') || i.description.includes('deferred'));
        expect(deferredIssues.length).toBeGreaterThan(0);
        expect(deferredIssues[0]?.severity).toBe('low'); // Deferred is intentional, low severity
      });
    });
  });

  describe('Stakeholder Disagreements', () => {
    it('should detect unresolved disagreements', () => {
      const testCases = [
        'Marketing wants guest checkout but engineering prefers mandatory accounts',
        'Debate between real-time vs batch processing',
        'Team disagrees on authentication approach',
        'Conflicting opinions on data retention policy',
      ];

      testCases.forEach((text) => {
        const issues = detectAmbiguities(text, []);
        expect(issues.some((i) => i.type === 'ambiguous' && i.severity === 'high')).toBe(true);
      });
    });

    it('should detect pending approvals', () => {
      const testCases = [
        'Pending legal team approval',
        'Awaiting security review',
        'Requires stakeholder sign-off',
        'Subject to compliance review',
      ];

      testCases.forEach((text) => {
        const issues = detectAmbiguities(text, []);
        expect(issues.some((i) => i.type === 'incomplete')).toBe(true);
      });
    });
  });

  describe('Confidence Analysis', () => {
    it('should return high confidence for specific, clear requirements', () => {
      const testCases = [
        {
          text: 'The system must load within 2 seconds',
          criteria: ['Page load measured from DOMContentLoaded event', 'Maximum 2000ms on 4G connection'],
        },
        {
          text: 'Support PNG, JPG, and GIF image uploads up to 5MB',
          criteria: ['Accept .png, .jpg, .jpeg, .gif files', 'Reject files over 5MB', 'Display error for unsupported formats'],
        },
      ];

      testCases.forEach(({ text, criteria }) => {
        const confidence = analyzeConfidence(text, criteria);
        expect(confidence).toBeGreaterThan(0.8);
      });
    });

    it('should return medium confidence for partially clear requirements', () => {
      const testCases = [
        {
          text: 'The system should respond quickly to user actions',
          criteria: ['Users see immediate feedback', 'Actions feel responsive'],
        },
        {
          text: 'Support common image formats',
          criteria: ['Accept popular image types', 'Reject uncommon formats'],
        },
      ];

      testCases.forEach(({ text, criteria }) => {
        const confidence = analyzeConfidence(text, criteria);
        expect(confidence).toBeGreaterThan(0.5);
        expect(confidence).toBeLessThan(0.8);
      });
    });

    it('should return low confidence for vague requirements', () => {
      const testCases = [
        {
          text: 'The system should be fast and reliable',
          criteria: [],
        },
        {
          text: 'Make it work well',
          criteria: ['It works'],
        },
        {
          text: 'Improve user experience',
          criteria: [],
        },
      ];

      testCases.forEach(({ text, criteria }) => {
        const confidence = analyzeConfidence(text, criteria);
        expect(confidence).toBeLessThan(0.6);
      });
    });

    it('should factor in acceptance criteria quality', () => {
      const text = 'Implement user authentication';

      const poorCriteria = ['Users can login'];
      const goodCriteria = [
        'Email and password fields with validation',
        'Invalid credentials show error message',
        'Successful login redirects to dashboard',
        'Session persists for 24 hours',
        'Logout clears session',
      ];

      const poorConfidence = analyzeConfidence(text, poorCriteria);
      const goodConfidence = analyzeConfidence(text, goodCriteria);

      expect(goodConfidence).toBeGreaterThan(poorConfidence);
    });

    it('should factor in detected ambiguities', () => {
      const clearText = 'The page must load within 2 seconds';
      const vagueText = 'The page should load quickly';

      const clearConfidence = analyzeConfidence(clearText, ['Load time < 2s']);
      const vagueConfidence = analyzeConfidence(vagueText, ['Fast loading']);

      expect(clearConfidence).toBeGreaterThan(vagueConfidence);
    });
  });

  describe('Issue Severity Assignment', () => {
    it('should assign critical severity to security ambiguities', () => {
      const text = 'Some kind of encryption should be used';
      const issues = detectAmbiguities(text, []);

      const securityIssues = issues.filter((i) => i.description.toLowerCase().includes('encrypt'));
      expect(securityIssues.some((i) => i.severity === 'critical' || i.severity === 'high')).toBe(true);
    });

    it('should assign high severity to TBD core features', () => {
      const text = 'Payment processing integration is TBD';
      const issues = detectAmbiguities(text, []);

      expect(issues.some((i) => i.severity === 'high')).toBe(true);
    });

    it('should assign medium severity to unclear non-critical features', () => {
      const text = 'Analytics dashboard design needs clarification';
      const issues = detectAmbiguities(text, []);

      const clarificationIssues = issues.filter((i) => i.description.includes('clarification'));
      if (clarificationIssues.length > 0) {
        expect(['medium', 'low']).toContain(clarificationIssues[0]?.severity);
      }
    });

    it('should assign low severity to optional feature ambiguities', () => {
      const text = 'Optional dark mode - specific colors TBD';
      const issues = detectAmbiguities(text, []);

      const optionalIssues = issues.filter((i) => i.description.includes('optional'));
      if (optionalIssues.length > 0) {
        expect(optionalIssues[0]?.severity).toBe('low');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty requirement text', () => {
      const issues = detectAmbiguities('', []);
      expect(Array.isArray(issues)).toBe(true);
      expect(issues.some((i) => i.type === 'incomplete')).toBe(true);
    });

    it('should handle requirements with only symbols', () => {
      const issues = detectAmbiguities('!@#$%^&*()', []);
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should handle very long requirements', () => {
      const longText = 'The system must ' + 'handle user authentication '.repeat(100);
      const issues = detectAmbiguities(longText, []);
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should handle requirements with special characters', () => {
      const text = 'Support UTF-8 encoding: 你好, مرحبا, Привет, ñ, é, ü';
      const issues = detectAmbiguities(text, ['UTF-8 support', 'International characters']);
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should handle requirements with code snippets', () => {
      const text = 'API must return JSON: { "status": "success", "data": {} }';
      const issues = detectAmbiguities(text, ['Return valid JSON', 'Include status field']);

      // Should not flag JSON syntax as ambiguous
      const falsePositives = issues.filter((i) => i.description.includes('JSON') || i.description.includes('{'));
      expect(falsePositives.length).toBe(0);
    });
  });

  describe('Multiple Issue Types', () => {
    it('should detect multiple issues in single requirement', () => {
      const text = 'The system should be fast (exact metrics TBD) and support many users (number unclear)';
      const issues = detectAmbiguities(text, []);

      expect(issues.length).toBeGreaterThan(1);
      expect(issues.some((i) => i.type === 'ambiguous')).toBe(true);
      expect(issues.some((i) => i.type === 'incomplete')).toBe(true);
    });

    it('should prioritize issues by severity', () => {
      const text = 'Critical security encryption (algorithm TBD) and nice-to-have theme customization (colors undefined)';
      const issues = detectAmbiguities(text, []);

      const sortedIssues = issues.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      // Security issue should be higher priority
      expect(['critical', 'high']).toContain(sortedIssues[0]?.severity);
    });

    it('should provide actionable descriptions for each issue', () => {
      const text = 'Performance should be good and TBD payment integration';
      const issues = detectAmbiguities(text, []);

      issues.forEach((issue) => {
        expect(issue.description).toBeDefined();
        expect(issue.description.length).toBeGreaterThan(10); // Not just a placeholder
      });
    });
  });
});
