/**
 * Configuration Manager
 *
 * Manages user configuration persistence and retrieval
 * Stores configuration in .prism/config.yaml
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYAML, stringify as stringifyYAML } from 'yaml';
import type { ConfigurationProfile } from '../types/config.js';
import { ConfigurationProfileSchema } from '../types/config.js';

const CONFIG_PATH = join(process.cwd(), '.prism', 'config.yaml');

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ConfigurationProfile = {
  version: '1.0',
  llm: {
    provider: 'anthropic',
    temperature: 0,
  },
  retention: {
    sessionDays: 30,
  },
};

/**
 * Configuration manager for MT-PRISM settings
 */
export class ConfigManager {
  private cache: ConfigurationProfile | null = null;

  /**
   * Load configuration from disk
   *
   * @returns Configuration profile
   */
  async load(): Promise<ConfigurationProfile> {
    if (this.cache) {
      return this.cache;
    }

    try {
      if (!existsSync(CONFIG_PATH)) {
        // Create default config
        await this.save(DEFAULT_CONFIG);
        this.cache = DEFAULT_CONFIG;
        return DEFAULT_CONFIG;
      }

      const content = await readFile(CONFIG_PATH, 'utf-8');
      const config = parseYAML(content) as ConfigurationProfile;

      // Validate against schema
      const validated = ConfigurationProfileSchema.parse(config);
      this.cache = validated;
      return validated;
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
      this.cache = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Save configuration to disk
   *
   * @param config - Configuration to save
   */
  async save(config: ConfigurationProfile): Promise<void> {
    // Validate before saving
    const validated = ConfigurationProfileSchema.parse(config);

    // Ensure .prism directory exists
    const prismDir = join(process.cwd(), '.prism');
    if (!existsSync(prismDir)) {
      await mkdir(prismDir, { recursive: true, mode: 0o755 });
    }

    // Write config file with restricted permissions (0600)
    const content = stringifyYAML(validated);
    await writeFile(CONFIG_PATH, content, { mode: 0o600 });

    // Update cache
    this.cache = validated;
  }

  /**
   * Get configuration value by key path
   *
   * @param key - Dot-separated key path (e.g., "llm.provider")
   * @returns Value at key path or undefined
   */
  async get<T>(key: string): Promise<T | undefined> {
    const config = await this.load();
    const parts = key.split('.');
    let value: any = config;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) {
        return undefined;
      }
    }

    return value as T;
  }

  /**
   * Set configuration value by key path
   *
   * @param key - Dot-separated key path (e.g., "llm.provider")
   * @param value - Value to set
   */
  async set(key: string, value: any): Promise<void> {
    const config = await this.load();
    const parts = key.split('.');
    const lastKey = parts.pop();

    if (!lastKey) {
      throw new Error('Invalid key path');
    }

    let target: any = config;
    for (const part of parts) {
      if (!target[part]) {
        target[part] = {};
      }
      target = target[part];
    }

    target[lastKey] = value;
    await this.save(config);
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<void> {
    await this.save(DEFAULT_CONFIG);
    this.cache = DEFAULT_CONFIG;
  }

  /**
   * Get human-readable configuration display
   *
   * @returns Formatted configuration string
   */
  async show(): Promise<string> {
    const config = await this.load();
    return stringifyYAML(config);
  }
}
