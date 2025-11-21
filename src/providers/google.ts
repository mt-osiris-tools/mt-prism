import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ZodSchema } from 'zod';
import type {
  LLMProvider,
  GenerateOptions,
  ProviderInfo,
} from './types.js';

/**
 * Google Gemini provider adapter
 *
 * Implements the unified LLM interface for Google's Gemini models.
 * Default model: Gemini Pro
 */
export class GoogleProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private defaultModel: string;

  constructor(apiKey: string, model?: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.defaultModel = model || 'gemini-pro';
  }

  async generateText(
    prompt: string,
    options?: GenerateOptions
  ): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: options?.model || this.defaultModel,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0,
        maxOutputTokens: options?.maxTokens || 8000,
        stopSequences: options?.stopSequences,
      },
    });

    const text = result.response.text();
    if (!text) {
      throw new Error('No text in Google Gemini response');
    }

    return text;
  }

  async *streamText(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const model = this.client.getGenerativeModel({
      model: options?.model || this.defaultModel,
    });

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0,
        maxOutputTokens: options?.maxTokens || 8000,
        stopSequences: options?.stopSequences,
      },
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }

  async generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T> {
    const model = this.client.getGenerativeModel({
      model: options?.model || this.defaultModel,
    });

    // Request JSON output in prompt
    const jsonPrompt = `${prompt}\n\nYou must respond with valid JSON only, no additional text.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: jsonPrompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0,
        maxOutputTokens: options?.maxTokens || 8000,
      },
    });

    const text = result.response.text();
    if (!text) {
      throw new Error('No text in Google Gemini response');
    }

    // Parse JSON and validate with Zod schema
    const parsed = JSON.parse(text);
    const validated = schema.parse(parsed);
    return validated;
  }

  getInfo(): ProviderInfo {
    return {
      name: 'Google Gemini',
      model: this.defaultModel,
      inputCostPer1K: 0.00025, // $0.25 per million tokens = $0.00025 per 1K
      outputCostPer1K: 0.00050, // $0.50 per million tokens = $0.00050 per 1K
    };
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    const info = this.getInfo();
    const inputCost = (inputTokens / 1000) * info.inputCostPer1K;
    const outputCost = (outputTokens / 1000) * info.outputCostPer1K;
    return inputCost + outputCost;
  }
}
