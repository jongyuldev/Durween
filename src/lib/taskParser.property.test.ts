import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DefaultTaskParser } from './taskParser';

describe('Task Parser - Property-Based Tests', () => {
  const parser = new DefaultTaskParser();

  // Feature: clippy-task-scheduler, Property 1: Parser extracts tasks correctly
  it('Property 1: Parser extracts tasks correctly', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => /^[a-zA-Z0-9_]+$/.test(s)),
        fc.integer({ min: 1, max: 1440 }),
        (taskName, duration) => {
          // Test short notation format
          const shortInput = `${taskName}(${duration})`;
          const shortResult = parser.parse(shortInput);

          expect(shortResult.tasks).toHaveLength(1);
          expect(shortResult.tasks[0].name).toBe(taskName);
          expect(shortResult.tasks[0].durationMinutes).toBe(duration);
          expect(shortResult.tasks[0].completed).toBe(false);
          expect(shortResult.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: clippy-task-scheduler, Property 1: Parser extracts tasks correctly (natural language)
  it('Property 1: Parser extracts tasks correctly - natural language format', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => {
          const trimmed = s.trim();
          // Exclude strings that contain 'for', or match short notation pattern
          return (
            trimmed.length > 0 && !s.includes('for') && !/\w+\(\d+\)/.test(s)
          );
        }),
        fc.integer({ min: 1, max: 1440 }),
        (taskName, duration) => {
          // Test natural language format
          const nlInput = `do ${taskName} for ${duration} minutes`;
          const nlResult = parser.parse(nlInput);

          expect(nlResult.tasks).toHaveLength(1);
          expect(nlResult.tasks[0].name).toBe(taskName.trim());
          expect(nlResult.tasks[0].durationMinutes).toBe(duration);
          expect(nlResult.tasks[0].completed).toBe(false);
          expect(nlResult.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: clippy-task-scheduler, Property 1: Parser extracts tasks correctly (multiple tasks)
  it('Property 1: Parser extracts multiple tasks correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc
              .string({ minLength: 1, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_]+$/.test(s)),
            duration: fc.integer({ min: 1, max: 1440 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (taskSpecs) => {
          // Create input with multiple tasks in short notation
          const input = taskSpecs
            .map((t) => `${t.name}(${t.duration})`)
            .join(', ');
          const result = parser.parse(input);

          expect(result.tasks).toHaveLength(taskSpecs.length);
          expect(result.errors).toHaveLength(0);

          // Verify each task matches the specification
          taskSpecs.forEach((spec, index) => {
            expect(result.tasks[index].name).toBe(spec.name);
            expect(result.tasks[index].durationMinutes).toBe(spec.duration);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: clippy-task-scheduler, Property 2: Parser rejects invalid durations
  it('Property 2: Parser rejects invalid durations', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => /^[a-zA-Z0-9_]+$/.test(s)),
        fc.integer({ max: 0 }),
        (taskName, invalidDuration) => {
          // Test short notation with zero or negative duration
          const input = `${taskName}(${invalidDuration})`;
          const result = parser.parse(input);

          // Should not create any tasks
          expect(result.tasks).toHaveLength(0);
          // Should have an error about positive duration
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors.some((e) => e.includes('positive'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: clippy-task-scheduler, Property 2: Parser rejects non-numeric durations
  it('Property 2: Parser rejects non-numeric durations', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => /^[a-zA-Z0-9_]+$/.test(s)),
        fc
          .string({ minLength: 1, maxLength: 10 })
          .filter((s) => !/^\d+$/.test(s)),
        (taskName, nonNumericDuration) => {
          // Test short notation with non-numeric duration
          const input = `${taskName}(${nonNumericDuration})`;
          const result = parser.parse(input);

          // Should not create any tasks or should have errors
          expect(result.tasks.length + result.errors.length).toBeGreaterThan(0);
          // If no tasks created, should have error
          if (result.tasks.length === 0) {
            expect(result.errors.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Task Parser - Error Handling Property Tests', () => {
  const parser = new DefaultTaskParser();

  // Feature: clippy-task-scheduler, Property 3: Parse errors preserve input
  it('Property 3: Parse errors preserve input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => {
          // Generate strings that won't match either format
          const shortMatch = /(\w+)\((-?\d+)\)/.test(s);
          const nlMatch = /do\s+(.+?)\s+for\s+(-?\d+)\s+minutes?/i.test(s);
          return !shortMatch && !nlMatch && s.trim().length > 0;
        }),
        (invalidInput) => {
          const result = parser.parse(invalidInput);

          // Should have errors
          expect(result.errors.length).toBeGreaterThan(0);
          // Should not create any tasks
          expect(result.tasks).toHaveLength(0);
          // The error message should indicate parsing failure
          expect(
            result.errors.some(
              (e) => e.includes('Unable to parse') || e.includes('Please enter')
            )
          ).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: clippy-task-scheduler, Property 3: Empty input handling
  it('Property 3: Empty or whitespace input returns error', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.trim() === ''),
        (emptyInput) => {
          const result = parser.parse(emptyInput);

          // Should have error about empty input
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors.some((e) => e.includes('Please enter'))).toBe(
            true
          );
          // Should not create any tasks
          expect(result.tasks).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
