/**
 * Clarification Manager Skill
 *
 * Manages clarification questions and stakeholder responses to resolve gaps
 * between requirements and designs.
 *
 * @module skills/clarification-manager
 */

import { join } from 'path';
import type { GapsOutput } from '../types/gap.js';
import type {
  ClarificationQuestion,
  QuestionsOutput,
  ClarificationSession,
  ClarificationResponse,
} from '../types/question.js';
import { QuestionsOutputSchema, ClarificationSessionSchema } from '../schemas/question.js';
import { writeYAMLWithSchema } from '../utils/files.js';
import { WorkflowError } from '../utils/errors.js';

/**
 * Options for clarification generation
 */
export interface GenerateClarificationsOptions {
  saveOutput?: boolean;
  mode?: 'interactive' | 'jira' | 'slack' | 'file';
}

/**
 * Generates clarification questions from detected gaps
 *
 * @param gaps - Detected gaps from Requirements Validator
 * @param sessionId - Session identifier for output organization
 * @param options - Clarification options
 * @returns Questions output with generated clarification questions
 * @throws {WorkflowError} If generation fails
 */
export async function generateClarifications(
  gaps: GapsOutput,
  sessionId: string,
  options?: GenerateClarificationsOptions
): Promise<QuestionsOutput> {
  const startTime = Date.now();

  try {
    // 1. Validate inputs
    if (!gaps || !gaps.gaps) {
      throw new WorkflowError('Gaps data is invalid', 'clarification-generation');
    }

    if (!sessionId || sessionId.trim().length === 0) {
      throw new WorkflowError('Session ID cannot be empty', 'clarification-generation');
    }

    console.log('❓ Generating clarification questions...');
    console.log(`   Session: ${sessionId}`);
    console.log(`   Total gaps: ${gaps.gaps.length}`);
    console.log(`   Mode: ${options?.mode || 'interactive'}`);

    // 2. Generate questions from gaps
    const questions: ClarificationQuestion[] = [];
    let questionCounter = 1;

    for (const gap of gaps.gaps) {
      const question = generateQuestionForGap(gap, questionCounter++);
      questions.push(question);
    }

    // 3. Sort by priority (critical > high > medium > low)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    questions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // 4. Calculate statistics
    const criticalCount = questions.filter(q => q.priority === 'critical').length;
    const highCount = questions.filter(q => q.priority === 'high').length;
    const mediumCount = questions.filter(q => q.priority === 'medium').length;
    const lowCount = questions.filter(q => q.priority === 'low').length;

    const questionsOutput: QuestionsOutput = {
      metadata: {
        generated_at: new Date().toISOString(),
        total_questions: questions.length,
        critical_count: criticalCount,
        high_count: highCount,
        medium_count: mediumCount,
        low_count: lowCount,
      },
      questions,
    };

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Generated ${questions.length} clarification questions (${duration}s)`);
    console.log(`   Critical: ${criticalCount}, High: ${highCount}, Medium: ${mediumCount}, Low: ${lowCount}`);

    // 5. Save output if requested
    if (options?.saveOutput !== false) {
      const outputDir = join(
        process.cwd(),
        '.prism',
        'sessions',
        sessionId,
        '04-clarification'
      );
      const outputPath = join(outputDir, 'questions.yaml');

      console.log(`💾 Saving to ${outputPath}...`);
      await writeYAMLWithSchema(outputPath, questionsOutput, QuestionsOutputSchema);
    }

    return questionsOutput;
  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error(`❌ Clarification generation failed after ${duration}s`);

    if (error instanceof WorkflowError) {
      throw error;
    }

    throw new WorkflowError(
      `Clarification generation failed: ${error instanceof Error ? error.message : String(error)}`,
      'clarification-generation'
    );
  }
}

/**
 * Collects responses for clarification questions
 *
 * @param questions - Questions to collect responses for
 * @param sessionId - Session identifier
 * @param responses - Collected responses
 * @returns Clarification session with responses
 */
export async function collectResponses(
  questions: QuestionsOutput,
  sessionId: string,
  responses: ClarificationResponse[]
): Promise<ClarificationSession> {
  const session: ClarificationSession = {
    session_id: sessionId,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    mode: 'interactive',
    questions_asked: questions.questions.length,
    questions_answered: responses.length,
    responses,
  };

  // Save session
  const outputDir = join(
    process.cwd(),
    '.prism',
    'sessions',
    sessionId,
    '04-clarification'
  );
  const sessionPath = join(outputDir, 'session.yaml');

  await writeYAMLWithSchema(sessionPath, session, ClarificationSessionSchema);

  return session;
}

/**
 * Helper: Generate a question for a specific gap
 */
function generateQuestionForGap(gap: any, counter: number): ClarificationQuestion {
  const questionId = `Q-${String(counter).padStart(3, '0')}`;

  // Generate question based on gap type
  let question: string;
  let context: string;
  let suggestions: string[];

  switch (gap.type) {
    case 'missing_ui':
      question = `What UI components are needed to implement "${gap.requirement_id || 'this requirement'}"?`;
      context = gap.description;
      suggestions = [
        'Add specific screen mockups to Figma',
        'Define the UI component types needed',
        'List the user interactions required',
      ];
      break;

    case 'no_requirement':
      question = `What is the purpose of the "${gap.component_id || 'component'}" in the design?`;
      context = gap.description;
      suggestions = [
        'Add a functional requirement for this component',
        'Remove the component if not needed',
        'Link to existing requirement that covers this',
      ];
      break;

    case 'missing_acceptance_criteria':
      question = `What are the acceptance criteria for "${gap.requirement_id || 'this requirement'}"?`;
      context = gap.description;
      suggestions = [
        'Define measurable success criteria',
        'Specify edge cases to handle',
        'List required validations',
      ];
      break;

    case 'inconsistency':
      question = `How should we resolve the inconsistency: ${gap.description}?`;
      context = gap.description;
      suggestions = [
        'Update the requirement to match the design',
        'Update the design to match the requirement',
        'Clarify which is correct',
      ];
      break;

    case 'incomplete_mapping':
      question = `What is the complete mapping between requirement and design for "${gap.requirement_id || 'this item'}"?`;
      context = gap.description;
      suggestions = [
        'Define explicit component-to-requirement mapping',
        'Add missing design elements',
        'Update requirement scope',
      ];
      break;

    default:
      question = `Please clarify: ${gap.description}?`;
      context = gap.description;
      suggestions = ['Provide more details', 'Update documentation'];
  }

  return {
    id: questionId,
    priority: gap.severity,
    stakeholder_type: gap.stakeholder[0] || 'product',
    question,
    context,
    suggestions,
    gap_id: gap.id,
  };
}
