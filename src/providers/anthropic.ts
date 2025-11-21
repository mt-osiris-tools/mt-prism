import Anthropic from '@anthropic-ai/sdk';
import type { ZodSchema } from 'zod';
import type {
  LLMProvider,
  GenerateOptions,
  ProviderInfo,
} from './types.js';

/**
 * Anthropic Claude provider adapter
 *
 * Implements the unified LLM interface for Anthropic's Claude models.
 * Default model: Claude Sonnet 4.5
 */
export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = model || 'claude-sonnet-4-5-20250929';
  }

  async generateText(
    prompt: string,
    options?: GenerateOptions
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || 8000,
      temperature: options?.temperature ?? 0,
      messages: [{ role: 'user', content: prompt }],
      stop_sequences: options?.stopSequences,
    });

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Anthropic response');
    }

    return textContent.text;
  }

  async *streamText(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const stream = await this.client.messages.create({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || 8000,
      temperature: options?.temperature ?? 0,
      messages: [{ role: 'user', content: prompt }],
      stop_sequences: options?.stopSequences,
      stream: true,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }

  async generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T> {
    // Use tool calling for structured output
    const response = await this.client.messages.create({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || 8000,
      temperature: options?.temperature ?? 0,
      messages: [{ role: 'user', content: prompt }],
      tools: [
        {
          name: 'provide_structured_output',
          description: 'Provide the structured output matching the schema',
          input_schema: {
            type: 'object',
            properties: {
              output: {
                type: 'object',
                description: 'The structured output',
              },
            },
            required: ['output'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'provide_structured_output' },
    });

    // Extract tool use result
    const toolUse = response.content.find((block) => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('No tool use in Anthropic response');
    }

    // Validate with Zod schema
    const result = schema.parse(toolUse.input);
    return result;
  }

  getInfo(): ProviderInfo {
    return {
      name: 'Anthropic Claude',
      model: this.defaultModel,
      inputCostPer1K: 0.003, // $3 per million tokens = $0.003 per 1K
      outputCostPer1K: 0.015, // $15 per million tokens = $0.015 per 1K
    };
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    const info = this.getInfo();
    const inputCost = (inputTokens / 1000) * info.inputCostPer1K;
    const outputCost = (outputTokens / 1000) * info.outputCostPer1K;
    return inputCost + outputCost;
  }
}
