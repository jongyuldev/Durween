import { describe, it, expect, beforeEach } from 'vitest';
import { render, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import { TaskInput } from './TaskInput';
import { database } from '../lib/database';

describe('TaskInput - Property-Based Tests', () => {
  beforeEach(async () => {
    // Clear all tasks before each test
    const tasks = await database.getTasks();
    for (const task of tasks) {
      await database.deleteTask(task.id);
    }
  });

  // Feature: clippy-task-scheduler, Property 4: Successful parse adds task and clears input
  it('Property 4: Successful parse adds task and clears input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => /^[a-zA-Z0-9_]+$/.test(s)),
        fc.integer({ min: 1, max: 1440 }),
        async (taskName, duration) => {
          // Render the component in a container
          const { container, unmount } = render(<TaskInput />);
          const input = within(container).getByLabelText(
            'Task input'
          ) as HTMLInputElement;
          const submitButton = within(container).getByRole('button', {
            name: /add/i,
          });

          // Create valid input in short notation format
          const taskInput = `${taskName}(${duration})`;

          // Type the input
          await userEvent.type(input, taskInput);

          // Verify input field contains the text
          expect(input.value).toBe(taskInput);

          // Submit the form
          await userEvent.click(submitButton);

          // Wait for async operations to complete
          await waitFor(async () => {
            // Verify input field is cleared
            expect(input.value).toBe('');

            // Verify task was added to storage
            const tasks = await database.getTasks();
            const addedTask = tasks.find(
              (t) => t.name === taskName && t.durationMinutes === duration
            );
            expect(addedTask).toBeDefined();
            expect(addedTask?.name).toBe(taskName);
            expect(addedTask?.durationMinutes).toBe(duration);
          });

          // Clean up - delete the task and unmount component
          const tasks = await database.getTasks();
          for (const task of tasks) {
            await database.deleteTask(task.id);
          }
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  }, 60000); // Increase timeout for property-based test

  // Feature: clippy-task-scheduler, Property 4: Multiple tasks are added and input is cleared
  it('Property 4: Multiple tasks in one input are added and input is cleared', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc
              .string({ minLength: 1, maxLength: 20 })
              .filter((s) => /^[a-zA-Z0-9_]+$/.test(s)),
            duration: fc.integer({ min: 1, max: 1440 }),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (taskSpecs) => {
          // Render the component in a container
          const { container, unmount } = render(<TaskInput />);
          const input = within(container).getByLabelText(
            'Task input'
          ) as HTMLInputElement;
          const submitButton = within(container).getByRole('button', {
            name: /add/i,
          });

          // Create input with multiple tasks
          const taskInput = taskSpecs
            .map((t) => `${t.name}(${t.duration})`)
            .join(', ');

          // Type the input
          await userEvent.type(input, taskInput);

          // Submit the form
          await userEvent.click(submitButton);

          // Wait for async operations to complete
          await waitFor(async () => {
            // Verify input field is cleared
            expect(input.value).toBe('');

            // Verify all tasks were added to storage
            const tasks = await database.getTasks();
            expect(tasks.length).toBeGreaterThanOrEqual(taskSpecs.length);

            // Verify each task was added correctly
            for (const spec of taskSpecs) {
              const addedTask = tasks.find(
                (t) =>
                  t.name === spec.name && t.durationMinutes === spec.duration
              );
              expect(addedTask).toBeDefined();
            }
          });

          // Clean up
          const tasks = await database.getTasks();
          for (const task of tasks) {
            await database.deleteTask(task.id);
          }
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  }, 60000); // Increase timeout for property-based test
});
