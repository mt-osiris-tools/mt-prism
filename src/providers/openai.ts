import OpenAI from 'openai';
import type { ZodSchema } from 'zod';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type {
  LLMProvider,
  GenerateOptions,
  ProviderInfo,
} from './types.js';

/**
 * OpenAI GPT-4 provider adapter
 *
 * Implements the unified LLM interface for OpenAI's GPT-4 models.
 * Default model: GPT-4 Turbo
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({ apiKey });
    this.defaultModel = model || 'gpt-4-turbo-preview';
  }

  async generateText(
    prompt: string,
    options?: GenerateOptions
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || 8000,
      temperature: options?.temperature ?? 0,
      messages: [{ role: 'user', content: prompt }],
      stop: options?.stopSequences,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    return content;
  }

  async *streamText(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || 8000,
      temperature: options?.temperature ?? 0,
      messages: [{ role: 'user', content: prompt }],
      stop: options?.stopSequences,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  async generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T> {
    // Use JSON mode for structured output
    const response = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || 8000,
      temperature: options?.temperature ?? 0,
      messages: [
        {
          role: 'system',
          content:
            'You must respond with valid JSON matching the requested schema.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse JSON and validate with Zod schema
    const parsed = JSON.parse(content);
    const result = schema.parse(parsed);
    return result;
  }

  getInfo(): ProviderInfo {
    return {
      name: 'OpenAI GPT-4',
      model: this.defaultModel,
      inputCostPer1K: 0.01, // $10 per million tokens = $0.01 per 1K
      outputCostPer1K: 0.03, // $30 per million tokens = $0.03 per 1K
    };
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    const info = this.getInfo();
    const inputCost = (inputTokens / 1000) * info.inputCostPer1K;
    const outputCost = (outputTokens / 1000) * info.outputCostPer1K;
    return inputCost + outputCost;
  }
}
