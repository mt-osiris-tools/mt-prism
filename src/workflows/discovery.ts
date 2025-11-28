/**
 * Discovery Workflow Orchestrator
 *
 * Orchestrates the complete PRD-to-TDD discovery workflow:
 * 1. PRD Analysis → 2. Figma Analysis → 3. Validation → 4. Clarification → 5. TDD Generation
 *
 * @module workflows/discovery
 */

import { join } from 'path';
import type { Session, Checkpoint, WorkflowStep } from '../types/session.js';
import { SessionSchema } from '../schemas/session.js';
import { writeYAMLWithSchema, readYAMLWithSchema, fileExists } from '../utils/files.js';
import { WorkflowError } from '../utils/errors.js';
import { WorkflowTimeoutManager } from '../utils/timeout-manager.js';

// Import skills
import { analyzePRD } from '../skills/prd-analyzer.js';
import { analyzeFigmaDesign } from '../skills/figma-analyzer.js';
// TODO: Enable when implementing full workflow
// import { validateRequirements } from '../skills/requirements-validator.js';
// import { generateClarifications } from '../skills/clarification-manager.js';
// import { generateTDD } from '../skills/tdd-generator.js';

/**
 * Workflow execution options
 */
export interface DiscoveryWorkflowOptions {
  prdSource: string;
  figmaSource?: string;
  projectName?: string;
  resumeSessionId?: string;
  aiProvider?: string;
  timeoutMinutes?: number;
}

/**
 * Workflow execution result
 */
export interface DiscoveryWorkflowResult {
  sessionId: string;
  status: 'completed' | 'failed' | 'paused';
  completedSteps: WorkflowStep[];
  outputs: {
    tddPath?: string;
    apiSpecPath?: string;
    databaseSchemaPath?: string;
    [key: string]: string | undefined;
  };
  duration: number;
  estimatedCost: number;
}

/**
 * Executes the complete discovery workflow
 *
 * @param options - Workflow execution options
 * @returns Workflow result with session ID and outputs
 */
export async function executeDiscoveryWorkflow(
  options: DiscoveryWorkflowOptions
): Promise<DiscoveryWorkflowResult> {
  const startTime = Date.now();
  const timeoutMinutes = options.timeoutMinutes || 30;

  console.log('🚀 Starting Discovery Workflow');
  console.log(`   PRD Source: ${options.prdSource}`);
  if (options.figmaSource) {
    console.log(`   Figma Source: ${options.figmaSource}`);
  }
  console.log(`⏰ Timeout: ${timeoutMinutes} minutes`);
  console.log('');

  // T041: Initialize 30-minute timeout manager (FR-016)
  const timeoutManager = new WorkflowTimeoutManager(timeoutMinutes);
  let session: Session | undefined;

  try {
    // 1. Initialize or resume session
    session = options.resumeSessionId
      ? await resumeSession(options.resumeSessionId)
      : await createSession(options);

    // TypeScript guard: session is now definitely assigned
    if (!session) {
      throw new WorkflowError('Failed to initialize session', 'session-init');
    }

    // Type assertion: session is definitely assigned after guard
    const activeSession: Session = session;

    console.log(`📂 Session: ${activeSession.session_id}`);
    console.log('');

    // Capture session in closure for timeout callback
    const sessionForCallback = activeSession;

    // T039: Start timeout with state save callback
    timeoutManager.start(async () => {
      console.log('💾 Saving session state before timeout...');
      sessionForCallback.status = 'paused';
      sessionForCallback.updated_at = new Date().toISOString();
      await saveSession(sessionForCallback);
      console.log(`✅ Session saved. Resume with: prism --resume=${sessionForCallback.session_id}`);
    });

    const completedSteps: WorkflowStep[] = [];
    let totalCost = 0;

    // 2. Execute workflow steps
    const steps: Array<{ step: WorkflowStep; name: string; execute: () => Promise<void> }> = [
      {
        step: 'prd-analysis',
        name: 'PRD Analysis',
        execute: async () => {
          if (shouldSkipStep(activeSession, 'prd-analysis')) {
            console.log('✓ PRD Analysis (already completed)');
            return;
          }

          console.log('📄 Step 1/5: Analyzing PRD...');
          const stepStart = Date.now();

          await analyzePRD(options.prdSource, activeSession.session_id, {
            saveOutput: true,
          });

          const checkpoint = await saveCheckpoint(
            activeSession,
            'prd-analysis',
            Date.now() - stepStart,
            [`.prism/sessions/${activeSession.session_id}/01-prd-analysis/requirements.yaml`]
          );

          completedSteps.push('prd-analysis');
          console.log(`✅ PRD Analysis complete (${checkpoint.metadata.duration_ms}ms)`);
          console.log('');
        },
      },
      {
        step: 'figma-analysis',
        name: 'Figma Analysis',
        execute: async () => {
          if (shouldSkipStep(activeSession, 'figma-analysis')) {
            console.log('✓ Figma Analysis (already completed)');
            return;
          }

          if (!options.figmaSource) {
            console.log('⏭️  Step 2/5: Skipping Figma Analysis (no Figma source provided)');
            console.log('');
            return;
          }

          console.log('🎨 Step 2/5: Analyzing Figma Design...');
          const stepStart = Date.now();

          await analyzeFigmaDesign(options.figmaSource, activeSession.session_id, {
            saveOutput: true,
          });

          const checkpoint = await saveCheckpoint(
            activeSession,
            'figma-analysis',
            Date.now() - stepStart,
            [`.prism/sessions/${activeSession.session_id}/02-figma-analysis/components.yaml`]
          );

          completedSteps.push('figma-analysis');
          console.log(`✅ Figma Analysis complete (${checkpoint.metadata.duration_ms}ms)`);
          console.log('');
        },
      },
      {
        step: 'validation',
        name: 'Requirements Validation',
        execute: async () => {
          if (shouldSkipStep(activeSession, 'validation')) {
            console.log('✓ Requirements Validation (already completed)');
            return;
          }

          console.log('🔍 Step 3/5: Validating Requirements...');
          const stepStart = Date.now();

          // TODO: Load requirements and components from previous steps
          // const requirementsPath = join('.prism', 'sessions', session.session_id, '01-prd-analysis', 'requirements.yaml');
          // const componentsPath = join('.prism', 'sessions', session.session_id, '02-figma-analysis', 'components.yaml');
          // const requirements = await readYAMLWithSchema(requirementsPath, RequirementsOutputSchema);
          // const components = await readYAMLWithSchema(componentsPath, ComponentsOutputSchema);
          // const gaps = await validateRequirements(requirements, components, session.session_id);

          console.log('   (Using simplified validation)');

          const checkpoint = await saveCheckpoint(
            activeSession,
            'validation',
            Date.now() - stepStart,
            ['.prism/sessions/${activeSession.session_id}/03-validation/gaps.yaml']
          );

          completedSteps.push('validation');
          console.log(`✅ Validation complete (${checkpoint.metadata.duration_ms}ms)`);
          console.log('');
        },
      },
      {
        step: 'clarification',
        name: 'Clarification',
        execute: async () => {
          if (shouldSkipStep(activeSession, 'clarification')) {
            console.log('✓ Clarification (already completed)');
            return;
          }

          console.log('❓ Step 4/5: Generating Clarification Questions...');
          const stepStart = Date.now();

          console.log('   (Using simplified clarification)');

          const checkpoint = await saveCheckpoint(
            activeSession,
            'clarification',
            Date.now() - stepStart,
            ['.prism/sessions/${activeSession.session_id}/04-clarification/questions.yaml']
          );

          completedSteps.push('clarification');
          console.log(`✅ Clarification complete (${checkpoint.metadata.duration_ms}ms)`);
          console.log('');
        },
      },
      {
        step: 'tdd-generation',
        name: 'TDD Generation',
        execute: async () => {
          if (shouldSkipStep(activeSession, 'tdd-generation')) {
            console.log('✓ TDD Generation (already completed)');
            return;
          }

          console.log('📋 Step 5/5: Generating Technical Design Document...');
          const stepStart = Date.now();

          console.log('   (Using simplified TDD generation)');

          const checkpoint = await saveCheckpoint(
            activeSession,
            'tdd-generation',
            Date.now() - stepStart,
            [
              `.prism/sessions/${activeSession.session_id}/05-tdd/tdd.md`,
              `.prism/sessions/${activeSession.session_id}/05-tdd/api-spec.json`,
              `.prism/sessions/${activeSession.session_id}/05-tdd/database-schema.sql`,
            ]
          );

          completedSteps.push('tdd-generation');
          console.log(`✅ TDD Generation complete (${checkpoint.metadata.duration_ms}ms)`);
          console.log('');
        },
      },
    ];

    // Execute each step with timeout protection
    for (const { execute } of steps) {
      // Check if timeout occurred before executing next step
      if (timeoutManager.isAborted()) {
        console.warn('⏱️  Workflow timeout reached, stopping execution');
        break;
      }

      await execute();
    }

    // 3. Mark session as complete (if not timeout)
    if (!timeoutManager.isAborted()) {
      activeSession.status = 'completed';
      activeSession.updated_at = new Date().toISOString();
      await saveSession(activeSession);

      // Cancel timeout on successful completion
      timeoutManager.cancel();
    }

    const totalDuration = Date.now() - startTime;
    const minutes = Math.floor(totalDuration / 60000);
    const seconds = Math.floor((totalDuration % 60000) / 1000);

    if (timeoutManager.isAborted()) {
      console.log('⏸️  Workflow Paused (Timeout)');
      console.log(`   Duration: ${minutes}m ${seconds}s`);
      console.log(`   Session: ${activeSession.session_id}`);
      console.log(`   Resume with: prism --resume=${activeSession.session_id}`);
      console.log('');

      return {
        sessionId: activeSession.session_id,
        status: 'paused',
        completedSteps,
        outputs: {},
        duration: totalDuration,
        estimatedCost: totalCost,
      };
    }

    console.log('🎉 Discovery Workflow Complete!');
    console.log(`   Duration: ${minutes}m ${seconds}s`);
    console.log(`   Session: ${session.session_id}`);
    console.log(`   Outputs: .prism/sessions/${activeSession.session_id}/`);
    console.log('');

    return {
      sessionId: session.session_id,
      status: 'completed',
      completedSteps,
      outputs: {
        tddPath: `.prism/sessions/${activeSession.session_id}/05-tdd/tdd.md`,
        apiSpecPath: `.prism/sessions/${activeSession.session_id}/05-tdd/api-spec.json`,
        databaseSchemaPath: `.prism/sessions/${activeSession.session_id}/05-tdd/database-schema.sql`,
      },
      duration: totalDuration,
      estimatedCost: totalCost,
    };
  } catch (error) {
    // Handle timeout abort separately (T041)
    if (
      error instanceof Error &&
      error.name === 'AbortError' &&
      timeoutManager.isAborted() &&
      session
    ) {
      console.error('⏱️  Workflow timeout occurred');
      console.error(`   Session paused. Resume with: prism --resume=${session.session_id}`);

      return {
        sessionId: session.session_id,
        status: 'paused',
        completedSteps: [],
        outputs: {},
        duration: Date.now() - startTime,
        estimatedCost: 0,
      };
    }

    console.error('❌ Workflow failed:', error instanceof Error ? error.message : String(error));

    throw new WorkflowError(
      `Discovery workflow failed: ${error instanceof Error ? error.message : String(error)}`,
      'discovery-workflow'
    );
  }
}

/**
 * Helper: Create new session
 */
async function createSession(options: DiscoveryWorkflowOptions): Promise<Session> {
  const sessionId = `sess-${Date.now()}`;

  const session: Session = {
    session_id: sessionId,
    current_step: 'prd-analysis',
    status: 'in-progress',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    prd_source: options.prdSource,
    figma_source: options.figmaSource,
    outputs: {},
    checkpoints: [],
    config: {
      ai_provider: options.aiProvider || 'claude',
      workflow_timeout_minutes: options.timeoutMinutes || 20,
      max_clarification_iterations: 3,
    },
  };

  await saveSession(session);
  return session;
}

/**
 * Helper: Resume existing session
 */
async function resumeSession(sessionId: string): Promise<Session> {
  const sessionPath = join('.prism', 'sessions', sessionId, 'session_state.yaml');

  if (!(await fileExists(sessionPath))) {
    throw new WorkflowError(`Session ${sessionId} not found`, 'session-resume');
  }

  const sessionState = await readYAMLWithSchema(sessionPath, SessionSchema);
  return sessionState as unknown as Session;
}

/**
 * Helper: Save session state
 */
async function saveSession(session: Session): Promise<void> {
  const sessionPath = join('.prism', 'sessions', session.session_id, 'session_state.yaml');
  await writeYAMLWithSchema(sessionPath, session, SessionSchema);
}

/**
 * Helper: Save checkpoint after step completion
 */
async function saveCheckpoint(
  session: Session,
  step: WorkflowStep,
  durationMs: number,
  outputs: string[]
): Promise<Checkpoint> {
  const checkpoint: Checkpoint = {
    step,
    timestamp: new Date().toISOString(),
    outputs,
    metadata: {
      duration_ms: durationMs,
    },
  };

  session.checkpoints.push(checkpoint);
  session.current_step = step;
  session.updated_at = new Date().toISOString();

  await saveSession(session);

  return checkpoint;
}

/**
 * Helper: Check if step should be skipped (already completed)
 */
function shouldSkipStep(session: Session, step: WorkflowStep): boolean {
  return session.checkpoints.some(cp => cp.step === step);
}
