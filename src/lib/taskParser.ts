import type { Task, TaskParser } from './types';
import { v4 as uuidv4 } from 'uuid';
import { strings } from './strings';

/**
 * Result of parsing user input into tasks.
 */
export interface ParseResult {
  tasks: Task[];
  errors: string[];
}

/**
 * Default implementation of the TaskParser interface.
 * Supports two input formats:
 * 1. Short notation: "taskName(duration)" - e.g., "emails(20)"
 * 2. Natural language: "do X for Y minutes" - e.g., "Do emails for 20 minutes"
 *
 * Multiple tasks can be parsed from a single input string.
 *
 * @example
 * ```typescript
 * const parser = new DefaultTaskParser();
 * const result = parser.parse('emails(20)');
 * // Returns: { tasks: [{ name: 'emails', durationMinutes: 20, ... }], errors: [] }
 * ```
 */
export class DefaultTaskParser implements TaskParser {
  /**
   * Parses user input into structured task objects.
   *
   * @param input - The user input string to parse
   * @returns ParseResult containing successfully parsed tasks and any error messages
   *
   * @remarks
   * - Empty or whitespace-only input returns an error
   * - Invalid duration values (zero, negative, non-numeric) are rejected
   * - If no valid format is detected, returns an error preserving the original input
   * - Multiple tasks can be extracted from a single input string
   */
  parse(input: string): ParseResult {
    const tasks: Task[] = [];
    const errors: string[] = [];

    if (!input || input.trim() === '') {
      errors.push(strings.errors.parseEmpty);
      return { tasks, errors };
    }

    // Try short notation first: taskName(duration)
    // Also match negative numbers to provide better error messages
    const shortNotationRegex = /(\w+)\((-?\d+)\)/g;
    let match;
    let hasMatches = false;

    while ((match = shortNotationRegex.exec(input)) !== null) {
      hasMatches = true;
      const name = match[1];
      const duration = parseInt(match[2], 10);

      if (duration <= 0) {
        errors.push(strings.errors.parseInvalidDuration);
        continue;
      }

      tasks.push({
        id: uuidv4(),
        name,
        durationMinutes: duration,
        createdAt: new Date(),
        completed: false,
      });
    }

    // Try natural language format: "do X for Y minutes"
    // Also match negative numbers to provide better error messages
    const naturalLanguageRegex = /do\s+(.+?)\s+for\s+(-?\d+)\s+minutes?/gi;
    let nlMatch;

    while ((nlMatch = naturalLanguageRegex.exec(input)) !== null) {
      hasMatches = true;
      const name = nlMatch[1].trim();
      const duration = parseInt(nlMatch[2], 10);

      if (duration <= 0) {
        errors.push(strings.errors.parseInvalidDuration);
        continue;
      }

      tasks.push({
        id: uuidv4(),
        name,
        durationMinutes: duration,
        createdAt: new Date(),
        completed: false,
      });
    }

    // If no matches found, return error
    if (!hasMatches) {
      errors.push(strings.errors.parseInvalidFormat);
    }

    return { tasks, errors };
  }
}

/**
 * Singleton instance of the default task parser.
 * Use this for consistent parsing behavior across the application.
 *
 * @example
 * ```typescript
 * import { taskParser } from './lib/taskParser';
 * const result = taskParser.parse('meeting(60), emails(30)');
 * ```
 */
export const taskParser = new DefaultTaskParser();
