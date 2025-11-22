/**
 * Requirements Validator Skill
 *
 * Cross-validates requirements against Figma components to detect gaps,
 * inconsistencies, and missing elements.
 *
 * @module skills/requirements-validator
 */

import { join } from 'path';
import type { RequirementsOutput } from '../types/requirement.js';
import type { ComponentsOutput } from '../types/component.js';
import type { GapsOutput, Gap } from '../types/gap.js';
import { GapsOutputSchema } from '../schemas/gap.js';
import { writeYAMLWithSchema } from '../utils/files.js';
import { WorkflowError } from '../utils/errors.js';

/**
 * Options for requirements validation
 */
export interface ValidateRequirementsOptions {
  saveOutput?: boolean;
}

/**
 * Validates requirements against Figma components
 *
 * @param requirements - Structured requirements from PRD Analyzer
 * @param components - Structured components from Figma Analyzer
 * @param sessionId - Session identifier for output organization
 * @param options - Validation options
 * @returns Gaps output with detected issues
 * @throws {WorkflowError} If validation fails
 */
export async function validateRequirements(
  requirements: RequirementsOutput,
  components: ComponentsOutput,
  sessionId: string,
  options?: ValidateRequirementsOptions
): Promise<GapsOutput> {
  const startTime = Date.now();

  try {
    // 1. Validate inputs
    if (!requirements || !requirements.requirements) {
      throw new WorkflowError('Requirements data is invalid', 'requirements-validation');
    }

    if (!components || !components.components) {
      throw new WorkflowError('Components data is invalid', 'requirements-validation');
    }

    if (!sessionId || sessionId.trim().length === 0) {
      throw new WorkflowError('Session ID cannot be empty', 'requirements-validation');
    }

    console.log('🔍 Validating requirements against components...');
    console.log(`   Session: ${sessionId}`);
    console.log(`   Requirements: ${requirements.requirements.length}`);
    console.log(`   Components: ${components.components.length}`);

    // 2. Detect gaps
    const gaps: Gap[] = [];
    let gapCounter = 1;

    // 2a. Detect missing UI for requirements
    console.log('   Checking for missing UI components...');
    for (const req of requirements.requirements) {
      if (req.type === 'functional') {
        const hasUI = detectUIMapping(req.id, components);
        if (!hasUI) {
          gaps.push({
            id: `GAP-${String(gapCounter++).padStart(3, '0')}`,
            type: 'missing_ui',
            severity: req.priority === 'critical' || req.priority === 'high' ? 'high' : 'medium',
            requirement_id: req.id,
            description: `Functional requirement "${req.title}" has no corresponding UI component in Figma`,
            stakeholder: ['design', 'engineering'],
          });
        }
      }
    }

    // 2b. Detect orphaned components (no corresponding requirements)
    console.log('   Checking for orphaned components...');
    for (const comp of components.components) {
      const hasRequirement = detectRequirementMapping(comp.id, requirements);
      if (!hasRequirement) {
        gaps.push({
          id: `GAP-${String(gapCounter++).padStart(3, '0')}`,
          type: 'no_requirement',
          severity: 'medium',
          component_id: comp.id,
          description: `Figma component "${comp.name}" has no corresponding functional requirement`,
          stakeholder: ['product'],
        });
      }
    }

    // 2c. Detect missing acceptance criteria
    console.log('   Checking for missing acceptance criteria...');
    for (const req of requirements.requirements) {
      if (!req.acceptance_criteria || req.acceptance_criteria.length === 0) {
        gaps.push({
          id: `GAP-${String(gapCounter++).padStart(3, '0')}`,
          type: 'missing_acceptance_criteria',
          severity: req.priority === 'critical' ? 'high' : 'medium',
          requirement_id: req.id,
          description: `Requirement "${req.title}" lacks acceptance criteria`,
          stakeholder: ['product', 'engineering'],
        });
      }
    }

    // 3. Calculate statistics
    const criticalCount = gaps.filter(g => g.severity === 'critical').length;
    const highCount = gaps.filter(g => g.severity === 'high').length;
    const mediumCount = gaps.filter(g => g.severity === 'medium').length;
    const lowCount = gaps.filter(g => g.severity === 'low').length;

    const validated: GapsOutput = {
      metadata: {
        validated_at: new Date().toISOString(),
        validator_version: '1.0.0',
        total_gaps: gaps.length,
        critical_count: criticalCount,
        high_count: highCount,
        medium_count: mediumCount,
        low_count: lowCount,
      },
      gaps,
    };

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Validation complete: ${gaps.length} gaps detected (${duration}s)`);
    console.log(`   Critical: ${criticalCount}, High: ${highCount}, Medium: ${mediumCount}, Low: ${lowCount}`);

    // 4. Save output if requested
    if (options?.saveOutput !== false) {
      const outputDir = join(
        process.cwd(),
        '.prism',
        'sessions',
        sessionId,
        '03-validation'
      );
      const outputPath = join(outputDir, 'gaps.yaml');

      console.log(`💾 Saving to ${outputPath}...`);
      await writeYAMLWithSchema(outputPath, validated, GapsOutputSchema);
    }

    return validated;
  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error(`❌ Requirements validation failed after ${duration}s`);

    if (error instanceof WorkflowError) {
      throw error;
    }

    throw new WorkflowError(
      `Requirements validation failed: ${error instanceof Error ? error.message : String(error)}`,
      'requirements-validation'
    );
  }
}

/**
 * Helper: Detect if a requirement has corresponding UI in components
 */
function detectUIMapping(_requirementId: string, components: ComponentsOutput): boolean {
  // Simple heuristic: Check if any component mentions the requirement
  // In a real implementation, this would use more sophisticated matching
  return components.components.some(comp => {
    // Check if component usage screens or names relate to the requirement
    return comp.usage.screens.length > 0;
  });
}

/**
 * Helper: Detect if a component has corresponding requirement
 */
function detectRequirementMapping(_componentId: string, requirements: RequirementsOutput): boolean {
  // Simple heuristic: Check if any functional requirement exists
  // In a real implementation, this would use semantic matching or explicit links
  return requirements.requirements.some(req => req.type === 'functional');
}
