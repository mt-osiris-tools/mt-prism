#!/usr/bin/env node
/**
 * MT-PRISM CLI
 *
 * Command-line interface for the MT-PRISM discovery workflow
 */

import { executeDiscoveryWorkflow } from './workflows/discovery.js';

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      MT-PRISM                             ║');
  console.log('║          PRD-to-TDD Discovery Automation                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // Parse options
  const prdSource = args.find(arg => arg.startsWith('--prd='))?.split('=')[1];
  const figmaSource = args.find(arg => arg.startsWith('--figma='))?.split('=')[1];
  const projectName = args.find(arg => arg.startsWith('--project='))?.split('=')[1];
  const resumeSession = args.find(arg => arg.startsWith('--resume='))?.split('=')[1];

  if (!prdSource && !resumeSession) {
    console.error('❌ Error: --prd or --resume is required');
    console.error('');
    printHelp();
    process.exit(1);
  }

  try {
    const result = await executeDiscoveryWorkflow({
      prdSource: prdSource || '',
      figmaSource,
      projectName,
      resumeSessionId: resumeSession,
    });

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
  console.log('  --help, -h            Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  prism --prd=./docs/requirements.md --project="My App"');
  console.log('  prism --prd=https://confluence.com/123 --figma=abc123xyz');
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
