import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { parse as parseYAML, stringify as stringifyYAML } from 'yaml';
import type { ZodSchema } from 'zod';

/**
 * File I/O utilities with atomic write operations
 *
 * Per FR-057: All file writes must be atomic (temp → validate → rename)
 * Per FR-058: Automatic cleanup of temp files on failure
 */

/**
 * Ensure directory exists, creating it if necessary
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Read file as string
 */
export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Read and parse YAML file
 */
export async function readYAML<T = unknown>(filePath: string): Promise<T> {
  const content = await readFile(filePath);
  return parseYAML(content) as T;
}

/**
 * Read and parse YAML file with schema validation
 */
export async function readYAMLWithSchema<T>(
  filePath: string,
  schema: ZodSchema<T>
): Promise<T> {
  const content = await readFile(filePath);
  const parsed = parseYAML(content);
  return schema.parse(parsed);
}

/**
 * Read and parse JSON file
 */
export async function readJSON<T = unknown>(filePath: string): Promise<T> {
  const content = await readFile(filePath);
  return JSON.parse(content) as T;
}

/**
 * Atomic write operation (FR-057)
 *
 * Pattern: write to temp → validate (optional) → atomic rename
 * Ensures either complete success or clean failure (no partial files)
 *
 * @param filePath - Target file path
 * @param content - Content to write
 * @param validate - Optional validation function
 */
export async function writeAtomic(
  filePath: string,
  content: string,
  validate?: (content: string) => void | Promise<void>
): Promise<void> {
  // Ensure target directory exists
  const dir = dirname(filePath);
  await ensureDir(dir);

  // Write to temporary file
  const tempPath = `${filePath}.tmp.${Date.now()}`;

  try {
    await fs.writeFile(tempPath, content, 'utf-8');

    // Validate content if validator provided (FR-059)
    if (validate) {
      await validate(content);
    }

    // Atomic rename (this is atomic on POSIX systems)
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Cleanup temp file on failure (FR-058)
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }

    throw error;
  }
}

/**
 * Write string to file atomically
 */
export async function writeFile(
  filePath: string,
  content: string
): Promise<void> {
  await writeAtomic(filePath, content);
}

/**
 * Write YAML file atomically
 */
export async function writeYAML(
  filePath: string,
  data: unknown
): Promise<void> {
  const content = stringifyYAML(data);
  await writeAtomic(filePath, content, async (content) => {
    // Validate YAML is parseable
    parseYAML(content);
  });
}

/**
 * Write YAML file with schema validation (FR-059)
 */
export async function writeYAMLWithSchema<T>(
  filePath: string,
  data: T,
  schema: ZodSchema<T>
): Promise<void> {
  // Validate against schema before writing
  const validated = schema.parse(data);

  const content = stringifyYAML(validated);
  await writeAtomic(filePath, content, async (content) => {
    // Double-check YAML is parseable after serialization
    const parsed = parseYAML(content);
    schema.parse(parsed);
  });
}

/**
 * Write JSON file atomically
 */
export async function writeJSON(
  filePath: string,
  data: unknown,
  pretty = true
): Promise<void> {
  const content = JSON.stringify(data, null, pretty ? 2 : 0);
  await writeAtomic(filePath, content, async (content) => {
    // Validate JSON is parseable
    JSON.parse(content);
  });
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete file if it exists
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * List files in directory
 */
export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch (error) {
    // Return empty array if directory doesn't exist
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Copy file
 */
export async function copyFile(
  sourcePath: string,
  targetPath: string
): Promise<void> {
  const dir = dirname(targetPath);
  await ensureDir(dir);
  await fs.copyFile(sourcePath, targetPath);
}
