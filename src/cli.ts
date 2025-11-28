#!/usr/bin/env node
/**
 * MT-PRISM CLI
 *
 * Command-line interface for the MT-PRISM discovery workflow
 */

import { executeDiscoveryWorkflow } from './workflows/discovery.js';
import { detectEnvironment } from './services/environment.js';
import { discoverCredentials, validateCredentials } from './utils/auth.js';
import { listSessions, loadSession } from './utils/session.js';

/**
 * Handle --list-sessions command (T037, FR-005)
 */
async function handleListSessions(): Promise<void> {
  console.log('');
  console.log('📋 Available Sessions');
  console.log('');

  const sessions = await listSessions();

  if (sessions.length === 0) {
    console.log('No sessions found.');
    console.log('');
    return;
  }

  console.log(`Found ${sessions.length} session(s):\n`);

  for (const sessionId of sessions) {
    try {
      const session = await loadSession(sessionId);
      const status = session.status === 'completed' ? '✅' : session.status === 'failed' ? '❌' : '⏸️ ';

      console.log(`${status} ${sessionId}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Current Step: ${session.current_step}`);
      console.log(`   Created: ${new Date(session.created_at).toLocaleString()}`);
      console.log(`   Checkpoints: ${session.checkpoints.length}/5`);

      if (session.status !== 'completed' && session.status !== 'failed') {
        console.log(`   Resume: prism --resume=${sessionId}`);
      }

      console.log('');
    } catch (error) {
      console.log(`⚠️  ${sessionId} (corrupted or invalid)`);
      console.log('');
    }
  }
}

/**
 * T042: Graceful shutdown handler for saving session state on interrupt
 */
let currentSession: any = null;

function setupGracefulShutdown(): void {
  const handleShutdown = async (signal: string) => {
    console.log(`\n📍 Received ${signal}, saving state...`);

    if (currentSession) {
      const { saveSession } = await import('./utils/session.js');
      currentSession.status = 'paused';
      currentSession.updated_at = new Date().toISOString();
      await saveSession(currentSession);
      console.log(`✅ Session ${currentSession.session_id} saved`);
      console.log(`   Resume with: prism --resume=${currentSession.session_id}`);
    }

    process.exit(signal === 'SIGTERM' ? 0 : 1);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

async function main() {
  // T042: Setup graceful shutdown handlers
  setupGracefulShutdown();
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      MT-PRISM                             ║');
  console.log('║          PRD-to-TDD Discovery Automation                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  // T019: Detect environment at startup
  const environment = await detectEnvironment();

  // T024: Log environment detection results
  console.log(`🔍 Environment: ${environment.isClaudeCode ? 'Claude Code' : 'Standalone Terminal'}`);
  if (environment.isClaudeCode) {
    console.log(`   Confidence: ${environment.confidence}`);
    console.log(`   Method: ${environment.method}`);
  }
  console.log(`   Workspace: ${environment.workspacePath}`);
  if (environment.mcpServers.length > 0) {
    console.log(`   MCP Servers: ${environment.mcpServers.join(', ')}`);
  }
  console.log('');

  // T020: Discover credentials at startup
  const credentials = await discoverCredentials();

  // T025: Log credential discovery results
  console.log(`🔑 Credentials: ${credentials.source}`);
  if (credentials.source === 'env-var') {
    const providers = [];
    if (credentials.anthropicApiKey) providers.push('Anthropic (Claude)');
    if (credentials.openaiApiKey) providers.push('OpenAI (GPT-4)');
    if (credentials.googleApiKey) providers.push('Google (Gemini)');
    console.log(`   Providers available: ${providers.join(', ')}`);
  } else if (credentials.source === 'oauth') {
    console.log(`   Provider: Anthropic (Claude) via OAuth`);
    if (credentials.expiresAt) {
      const expiresIn = Math.round((credentials.expiresAt - Date.now()) / 60000);
      console.log(`   Expires in: ${expiresIn} minutes`);
    }
  } else if (credentials.source === 'env-file') {
    console.log(`   Source: .env file`);
  }
  console.log('');

  // T021: Validate discovered credentials before workflow
  if (credentials.source !== 'not-found') {
    const isValid = await validateCredentials(credentials);
    if (!isValid) {
      console.error('❌ Error: Invalid credentials');
      console.error('');
      console.error('The discovered credentials are not valid.');
      console.error('Please check your API key configuration.');
      console.error('');
      process.exit(1);
    }
  }

  // T023: Handle missing credentials with actionable error messages
  if (credentials.source === 'not-found') {
    console.error('❌ Error: No API credentials found');
    console.error('');
    console.error('MT-PRISM requires AI provider credentials to function.');
    console.error('');
    console.error('Please choose one of the following options:');
    console.error('');
    console.error('1. If using Claude Code:');
    console.error('   Run: claude login');
    console.error('   Then restart MT-PRISM');
    console.error('');
    console.error('2. Set environment variable:');
    console.error('   export ANTHROPIC_API_KEY="sk-ant-..."');
    console.error('   export OPENAI_API_KEY="sk-..."  # or');
    console.error('   export GOOGLE_API_KEY="..."     # or');
    console.error('');
    console.error('3. Create .env file in project directory:');
    console.error('   echo "ANTHROPIC_API_KEY=sk-ant-..." > .env');
    console.error('');
    console.error('Get API keys:');
    console.error('   Anthropic: https://console.anthropic.com/account/keys');
    console.error('   OpenAI: https://platform.openai.com/api-keys');
    console.error('   Google: https://makersuite.google.com/app/apikey');
    console.error('');
    process.exit(1);
  }

  console.log('');

  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // T037: Handle --list-sessions command (FR-005)
  if (args.includes('--list-sessions')) {
    await handleListSessions();
    process.exit(0);
  }

  // Parse options
  const prdSource = args.find(arg => arg.startsWith('--prd='))?.split('=')[1];
  const figmaSource = args.find(arg => arg.startsWith('--figma='))?.split('=')[1];
  const projectName = args.find(arg => arg.startsWith('--project='))?.split('=')[1];
  const resumeSession = args.find(arg => arg.startsWith('--resume='))?.split('=')[1];

  // T040: Add error handling for invalid session ID
  if (resumeSession && !resumeSession.startsWith('sess-')) {
    console.error('❌ Error: Invalid session ID format');
    console.error('');
    console.error(`Session ID must start with 'sess-' (e.g., sess-1234567890)`);
    console.error(`Provided: ${resumeSession}`);
    console.error('');
    console.error('List available sessions with: prism --list-sessions');
    console.error('');
    process.exit(1);
  }

  if (!prdSource && !resumeSession) {
    console.error('❌ Error: --prd or --resume is required');
    console.error('');
    printHelp();
    process.exit(1);
  }

  try {
    // T036: Execute workflow with resume support (FR-004)
    const result = await executeDiscoveryWorkflow({
      prdSource: prdSource || '',
      figmaSource,
      projectName,
      resumeSessionId: resumeSession,
    });

    // T042: Track session for graceful shutdown (if it returns a session)
    if (resumeSession) {
      try {
        currentSession = await loadSession(resumeSession);
      } catch (error) {
        // Session load failed in CLI, will be handled by workflow
      }
    }

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                   WORKFLOW COMPLETE!                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`Session ID: ${result.sessionId}`);
    console.log(`Status: ${result.status}`);
    console.log(`Duration: ${Math.round(result.duration / 1000)}s`);
    console.log('');
    console.log('📁 Outputs:');
    if (result.outputs.tddPath) {
      console.log(`   TDD: ${result.outputs.tddPath}`);
    }
    if (result.outputs.apiSpecPath) {
      console.log(`   API Spec: ${result.outputs.apiSpecPath}`);
    }
    if (result.outputs.databaseSchemaPath) {
      console.log(`   Database: ${result.outputs.databaseSchemaPath}`);
    }
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Workflow failed:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    process.exit(1);
  }
}

function printHelp() {
  console.log('Usage: prism [options]');
  console.log('');
  console.log('Options:');
  console.log('  --prd=<path|url>      PRD source (local file or Confluence URL)');
  console.log('  --figma=<id|path>     Figma file ID or local JSON (optional)');
  console.log('  --project=<name>      Project name for TDD (optional)');
  console.log('  --resume=<session>    Resume from previous session (optional)');
  console.log('  --list-sessions       List all available sessions');
  console.log('  --help, -h            Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  prism --prd=./docs/requirements.md --project="My App"');
  console.log('  prism --prd=https://confluence.com/123 --figma=abc123xyz');
  console.log('  prism --list-sessions');
  console.log('  prism --resume=sess-1234567890');
  console.log('');
  console.log('Environment Variables:');
  console.log('  AI_PROVIDER          AI provider (claude|openai|google)');
  console.log('  ANTHROPIC_API_KEY    Claude API key');
  console.log('  OPENAI_API_KEY       OpenAI API key');
  console.log('  GOOGLE_API_KEY       Google AI API key');
  console.log('');
}

// Run CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
