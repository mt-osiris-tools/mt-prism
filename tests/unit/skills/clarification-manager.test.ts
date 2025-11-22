import { describe, it, expect } from 'vitest';
import { generateClarifications, collectResponses } from '../../../src/skills/clarification-manager.js';
import type { GapsOutput } from '../../../src/types/gap.js';
import type { ClarificationResponse } from '../../../src/types/question.js';

describe('Clarification Manager', () => {
  describe('Question Generation', () => {
    it('should generate questions from gaps', async () => {
      const gaps: GapsOutput = {
        metadata: {
          validated_at: new Date().toISOString(),
          total_gaps: 2,
          critical_count: 0,
          high_count: 1,
          medium_count: 1,
          low_count: 0,
        },
        gaps: [
          {
            id: 'GAP-001',
            type: 'missing_ui',
            severity: 'high',
            requirement_id: 'REQ-FUNC-001',
            description: 'Login feature has no UI',
            stakeholder: ['design'],
          },
          {
            id: 'GAP-002',
            type: 'missing_acceptance_criteria',
            severity: 'medium',
            requirement_id: 'REQ-FUNC-002',
            description: 'Profile requirement lacks criteria',
            stakeholder: ['product'],
          },
        ],
      };

      const result = await generateClarifications(gaps, 'test-session', { saveOutput: false });

      expect(result.questions.length).toBe(2);
      expect(result.metadata.total_questions).toBe(2);
      expect(result.metadata.high_count).toBe(1);
      expect(result.metadata.medium_count).toBe(1);
    });

    it('should sort questions by priority', async () => {
      const gaps: GapsOutput = {
        metadata: {
          validated_at: new Date().toISOString(),
          total_gaps: 3,
          critical_count: 1,
          high_count: 1,
          medium_count: 1,
          low_count: 0,
        },
        gaps: [
          {
            id: 'GAP-001',
            type: 'missing_ui',
            severity: 'medium',
            requirement_id: 'REQ-001',
            description: 'Medium priority gap',
            stakeholder: ['design'],
          },
          {
            id: 'GAP-002',
            type: 'missing_ui',
            severity: 'critical',
            requirement_id: 'REQ-002',
            description: 'Critical gap',
            stakeholder: ['design'],
          },
          {
            id: 'GAP-003',
            type: 'missing_ui',
            severity: 'high',
            requirement_id: 'REQ-003',
            description: 'High priority gap',
            stakeholder: ['design'],
          },
        ],
      };

      const result = await generateClarifications(gaps, 'test-session', { saveOutput: false });

      expect(result.questions[0]?.priority).toBe('critical');
      expect(result.questions[1]?.priority).toBe('high');
      expect(result.questions[2]?.priority).toBe('medium');
    });

    it('should generate appropriate questions for different gap types', async () => {
      const gaps: GapsOutput = {
        metadata: {
          validated_at: new Date().toISOString(),
          total_gaps: 3,
          critical_count: 0,
          high_count: 0,
          medium_count: 3,
          low_count: 0,
        },
        gaps: [
          {
            id: 'GAP-001',
            type: 'missing_ui',
            severity: 'medium',
            requirement_id: 'REQ-001',
            description: 'Missing UI',
            stakeholder: ['design'],
          },
          {
            id: 'GAP-002',
            type: 'no_requirement',
            severity: 'medium',
            component_id: 'COMP-001',
            description: 'Orphaned component',
            stakeholder: ['product'],
          },
          {
            id: 'GAP-003',
            type: 'missing_acceptance_criteria',
            severity: 'medium',
            requirement_id: 'REQ-003',
            description: 'No acceptance criteria',
            stakeholder: ['product'],
          },
        ],
      };

      const result = await generateClarifications(gaps, 'test-session', { saveOutput: false });

      expect(result.questions[0]?.question).toContain('UI components');
      expect(result.questions[1]?.question).toContain('purpose');
      expect(result.questions[2]?.question).toContain('acceptance criteria');
    });

    it('should include context and suggestions for each question', async () => {
      const gaps: GapsOutput = {
        metadata: {
          validated_at: new Date().toISOString(),
          total_gaps: 1,
          critical_count: 0,
          high_count: 1,
          medium_count: 0,
          low_count: 0,
        },
        gaps: [
          {
            id: 'GAP-001',
            type: 'missing_ui',
            severity: 'high',
            requirement_id: 'REQ-001',
            description: 'User login feature needs UI design',
            stakeholder: ['design'],
          },
        ],
      };

      const result = await generateClarifications(gaps, 'test-session', { saveOutput: false });

      const question = result.questions[0];
      expect(question?.context).toBeDefined();
      expect(question?.context.length).toBeGreaterThan(0);
      expect(question?.suggestions).toBeDefined();
      expect(question?.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Response Collection', () => {
    it('should collect and track responses', async () => {
      const questions = {
        metadata: {
          generated_at: new Date().toISOString(),
          total_questions: 2,
          critical_count: 0,
          high_count: 2,
          medium_count: 0,
          low_count: 0,
        },
        questions: [
          {
            id: 'Q-001',
            priority: 'high' as const,
            stakeholder_type: 'design' as const,
            question: 'What UI components are needed?',
            context: 'Context',
            suggestions: ['Suggestion 1'],
            gap_id: 'GAP-001',
          },
          {
            id: 'Q-002',
            priority: 'high' as const,
            stakeholder_type: 'product' as const,
            question: 'What are the acceptance criteria?',
            context: 'Context',
            suggestions: ['Suggestion 1'],
            gap_id: 'GAP-002',
          },
        ],
      };

      const responses: ClarificationResponse[] = [
        {
          question_id: 'Q-001',
          response: 'We need a login form with email and password fields',
          confidence: 0.9,
          answered_at: new Date().toISOString(),
        },
      ];

      const session = await collectResponses(questions, 'test-session', responses);

      expect(session.session_id).toBe('test-session');
      expect(session.questions_asked).toBe(2);
      expect(session.questions_answered).toBe(1);
      expect(session.responses.length).toBe(1);
      expect(session.mode).toBe('interactive');
    });
  });
});
