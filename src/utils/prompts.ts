import { join } from 'path';
import { readFile } from './files.js';

/**
 * Prompt template loader utility
 *
 * Loads AI prompts from the prompts/ directory
 */

const PROMPTS_DIR = join(process.cwd(), 'prompts');

/**
 * Available prompt templates
 */
export type PromptTemplate =
  | 'prd-analyzer'
  | 'figma-analyzer'
  | 'validator'
  | 'clarification-manager'
  | 'tdd-generator';

/**
 * Load prompt template from prompts/ directory
 *
 * @param template - Prompt template name
 * @returns Prompt content as string
 * @throws Error if template file doesn't exist
 */
export async function loadPrompt(template: PromptTemplate): Promise<string> {
  const filePath = join(PROMPTS_DIR, `${template}.md`);

  try {
    return await readFile(filePath);
  } catch (error) {
    throw new Error(
      `Failed to load prompt template '${template}' from ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Replace variables in prompt template
 *
 * @param template - Prompt content
 * @param variables - Variable replacements (e.g., { prd_url: 'https://...' })
 * @returns Prompt with variables replaced
 */
export function replaceVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    // Replace {{variable}} placeholders
    const pattern = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(pattern, value);
  }

  return result;
}

/**
 * Load and prepare prompt with variable replacements
 *
 * @param template - Prompt template name
 * @param variables - Variable replacements
 * @returns Prepared prompt ready for LLM
 */
export async function preparePrompt(
  template: PromptTemplate,
  variables?: Record<string, string>
): Promise<string> {
  const content = await loadPrompt(template);

  if (!variables) {
    return content;
  }

  return replaceVariables(content, variables);
}
