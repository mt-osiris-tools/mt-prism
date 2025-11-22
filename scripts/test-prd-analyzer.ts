#!/usr/bin/env tsx

/**
 * Production Test: PRD Analyzer
 *
 * Tests the PRD Analyzer skill with a real LLM provider.
 * Requires API key configuration in .env file.
 */

import { analyzePRD } from '../src/skills/prd-analyzer.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
};

async function main() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║       PRD Analyzer - Production Test                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Check for API key
  const provider = process.env.AI_PROVIDER || 'anthropic';
  const apiKey = process.env.ANTHROPIC_API_KEY ||
                 process.env.OPENAI_API_KEY ||
                 process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.log(`${colors.red}❌ No API key found!${colors.reset}\n`);
    console.log('Please set one of the following in your .env file:');
    console.log('  - ANTHROPIC_API_KEY (for Claude)');
    console.log('  - OPENAI_API_KEY (for GPT-4)');
    console.log('  - GOOGLE_API_KEY (for Gemini)\n');
    console.log('And optionally set AI_PROVIDER to choose which one to use.');
    console.log('Example: AI_PROVIDER=anthropic\n');
    process.exit(1);
  }

  console.log(`${colors.green}✓ API Provider: ${provider}${colors.reset}\n`);

  // Ensure .prism directory exists
  try {
    await mkdir('.prism', { recursive: true });
    await mkdir('.prism/sessions', { recursive: true });
  } catch (error) {
    // Ignore if already exists
  }

  // Use test fixture PRD
  const prdPath = join(process.cwd(), 'tests/fixtures/prds/simple-prd.md');
  console.log(`📄 Loading PRD from: ${prdPath}\n`);

  try {
    const prdContent = await readFile(prdPath, 'utf-8');
    console.log(`${colors.blue}PRD Preview (first 200 chars):${colors.reset}`);
    console.log(prdContent.substring(0, 200) + '...\n');
    console.log('━'.repeat(70) + '\n');

    // Generate session ID
    const sessionId = `test-${Date.now()}`;
    console.log(`🔧 Session ID: ${sessionId}\n`);

    // Run PRD analysis
    console.log(`${colors.bright}Starting PRD Analysis...${colors.reset}\n`);
    const startTime = Date.now();

    const result = await analyzePRD(prdContent, sessionId);

    const duration = Math.round((Date.now() - startTime) / 1000);

    // Display results
    console.log('\n' + '━'.repeat(70));
    console.log(`${colors.bright}${colors.green}✅ Analysis Complete!${colors.reset}\n`);

    console.log(`${colors.bright}Metadata:${colors.reset}`);
    console.log(`  Source: ${result.metadata.prd_source}`);
    console.log(`  Total Requirements: ${result.metadata.total_requirements}`);
    console.log(`  Avg Complexity: ${result.metadata.complexity_average.toFixed(1)}/10`);
    console.log(`  Avg Confidence: ${(result.metadata.confidence_average * 100).toFixed(1)}%`);
    console.log(`  Duration: ${duration}s`);
    console.log();

    // Show requirement breakdown
    const byType = result.requirements.reduce((acc, req) => {
      acc[req.type] = (acc[req.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`${colors.bright}Requirements by Type:${colors.reset}`);
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    console.log();

    // Show first 3 requirements
    console.log(`${colors.bright}Sample Requirements:${colors.reset}`);
    result.requirements.slice(0, 3).forEach((req, i) => {
      console.log(`\n${i + 1}. ${colors.bright}${req.id}${colors.reset}: ${req.title}`);
      console.log(`   Type: ${req.type} | Priority: ${req.priority} | Complexity: ${req.complexity}/10`);
      console.log(`   Confidence: ${(req.confidence * 100).toFixed(0)}%`);

      if (req.issues.length > 0) {
        console.log(`   ${colors.yellow}⚠ Issues: ${req.issues.length}${colors.reset}`);
        req.issues.forEach(issue => {
          console.log(`     - [${issue.severity}] ${issue.description}`);
        });
      }
    });

    if (result.requirements.length > 3) {
      console.log(`\n   ... and ${result.requirements.length - 3} more requirements`);
    }

    console.log('\n' + '━'.repeat(70));
    console.log(`${colors.bright}Output saved to:${colors.reset}`);
    console.log(`  .prism/sessions/${sessionId}/01-prd-analysis/requirements.yaml`);
    console.log();

    // Performance check
    if (duration < 120) {
      console.log(`${colors.green}✓ Performance: Within 2-minute target (${duration}s)${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ Performance: Exceeded 2-minute target (${duration}s)${colors.reset}`);
    }

    // Quality check
    const lowConfidence = result.requirements.filter(r => r.confidence < 0.7).length;
    if (lowConfidence > 0) {
      console.log(`${colors.yellow}⚠ Quality: ${lowConfidence} requirements with low confidence (<70%)${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Quality: All requirements have high confidence${colors.reset}`);
    }

    console.log();
    console.log(`${colors.bright}${colors.green}🎉 Production test completed successfully!${colors.reset}\n`);

  } catch (error) {
    console.log(`\n${colors.red}❌ Error during analysis:${colors.reset}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);
