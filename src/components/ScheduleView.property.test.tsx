import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import * as fc from 'fast-check';
import { ScheduleView } from './ScheduleView';
import type { ScheduleBlock, Task } from '../lib/types';

describe('ScheduleView - Property-Based Tests', () => {
  // Generator for valid task names
  const taskNameArb = fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length > 0);

  // Generator for task IDs
  const taskIdArb = fc.uuid();

  // Generator for schedule block status
  const statusArb = fc.constantFrom(
    'scheduled',
    'in-progress',
    'completed'
  ) as fc.Arbitrary<'scheduled' | 'in-progress' | 'completed'>;

  // Generator for tasks
  const taskArb = fc.record({
    id: taskIdArb,
    name: taskNameArb,
    durationMinutes: fc.integer({ min: 1, max: 480 }),
    createdAt: fc.date(),
    completed: fc.boolean(),
  }) as fc.Arbitrary<Task>;

  // Generator for schedule blocks with unique IDs
  const scheduleBlockArb = (taskId: string) =>
    fc
      .record({
        id: fc.uuid(),
        taskId: fc.constant(taskId),
        startTime: fc.date({
          min: new Date('2024-01-01T00:00:00Z'),
          max: new Date('2024-12-31T23:59:59Z'),
        }),
        status: statusArb,
      })
      .chain((partial) => {
        // Ensure endTime is after startTime and dates are valid
        const durationMs = fc
          .integer({ min: 1, max: 480 })
          .map((mins) => mins * 60 * 1000);
        return durationMs.map((duration) => {
          const endTime = new Date(partial.startTime.getTime() + duration);
          return {
            ...partial,
            endTime,
          };
        });
      })
      .filter((block) => {
        // Filter out any blocks with invalid dates
        return (
          !isNaN(block.startTime.getTime()) && !isNaN(block.endTime.getTime())
        );
      }) as fc.Arbitrary<ScheduleBlock>;

  // Feature: clippy-task-scheduler, Property 14: Schedule blocks contain required display information
  it('Property 14: Schedule blocks contain required display information', () => {
    fc.assert(
      fc.property(
        fc.array(taskArb, { minLength: 1, maxLength: 10 }).chain((tasks) => {
          // Generate schedule blocks that reference the generated tasks
          return fc
            .array(
              fc
                .integer({ min: 0, max: tasks.length - 1 })
                .chain((taskIndex) => scheduleBlockArb(tasks[taskIndex].id)),
              { minLength: 1, maxLength: tasks.length }
            )
            .map((blocks) => ({ tasks, blocks }));
        }),
        ({ tasks, blocks }) => {
          // Render the component
          const { container } = render(
            <ScheduleView scheduleBlocks={blocks} tasks={tasks} />
          );

          // For each schedule block, verify it contains required display information
          blocks.forEach((block) => {
            const blockElement = within(container).getByTestId(
              `schedule-block-${block.id}`
            );
            expect(blockElement).toBeInTheDocument();

            // Get the task for this block
            const task = tasks.find((t) => t.id === block.taskId);
            expect(task).toBeDefined();

            // Verify task name is displayed
            const taskNameElement =
              within(blockElement).getByTestId('task-name');
            expect(taskNameElement.textContent).toBe(task!.name);

            // Verify start time is displayed (should be in format like "9:00 AM")
            const startTimeElement =
              within(blockElement).getByTestId('start-time');
            expect(startTimeElement.textContent).toMatch(
              /\d{1,2}:\d{2} (AM|PM)/
            );

            // Verify duration is displayed
            const durationElement =
              within(blockElement).getByTestId('duration');
            const expectedDuration = Math.round(
              (block.endTime.getTime() - block.startTime.getTime()) /
                (1000 * 60)
            );
            expect(durationElement.textContent).toContain(
              `${expectedDuration} min`
            );

            // Verify start button is present
            const startButton =
              within(blockElement).getByTestId('start-button');
            expect(startButton).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: clippy-task-scheduler, Property 16: Block status affects visual rendering
  it('Property 16: Block status affects visual rendering', () => {
    fc.assert(
      fc.property(
        taskArb,
        scheduleBlockArb('task-id').chain((block1) =>
          scheduleBlockArb('task-id').chain((block2) =>
            scheduleBlockArb('task-id').map((block3) => ({
              block1: { ...block1, status: 'scheduled' as const },
              block2: { ...block2, status: 'in-progress' as const },
              block3: { ...block3, status: 'completed' as const },
            }))
          )
        ),
        (task, { block1, block2, block3 }) => {
          // Update all blocks to reference the same task
          const blocks = [
            { ...block1, taskId: task.id },
            { ...block2, taskId: task.id },
            { ...block3, taskId: task.id },
          ];

          // Render the component
          const { container } = render(
            <ScheduleView scheduleBlocks={blocks} tasks={[task]} />
          );

          // Get the rendered blocks
          const scheduledBlock = within(container).getByTestId(
            `schedule-block-${blocks[0].id}`
          );
          const inProgressBlock = within(container).getByTestId(
            `schedule-block-${blocks[1].id}`
          );
          const completedBlock = within(container).getByTestId(
            `schedule-block-${blocks[2].id}`
          );

          // Verify each block has different styling based on status
          const scheduledClasses = scheduledBlock.className;
          const inProgressClasses = inProgressBlock.className;
          const completedClasses = completedBlock.className;

          // All three should have different class combinations
          expect(scheduledClasses).not.toBe(inProgressClasses);
          expect(scheduledClasses).not.toBe(completedClasses);
          expect(inProgressClasses).not.toBe(completedClasses);

          // Verify specific status indicators
          expect(scheduledBlock).toHaveAttribute('data-status', 'scheduled');
          expect(inProgressBlock).toHaveAttribute('data-status', 'in-progress');
          expect(completedBlock).toHaveAttribute('data-status', 'completed');

          // Verify in-progress has distinctive styling (blue background)
          expect(inProgressClasses).toContain('bg-blue-50');
          expect(inProgressClasses).toContain('border-blue-500');

          // Verify completed has distinctive styling (green background)
          expect(completedClasses).toContain('bg-green-50');
          expect(completedClasses).toContain('border-green-500');

          // Verify scheduled has default styling (white background)
          expect(scheduledClasses).toContain('bg-white');

          // Verify button states differ
          const scheduledButton =
            within(scheduledBlock).getByTestId('start-button');
          const inProgressButton =
            within(inProgressBlock).getByTestId('start-button');
          const completedButton =
            within(completedBlock).getByTestId('start-button');

          expect(scheduledButton.textContent).toBe('Start');
          expect(inProgressButton.textContent).toBe('In Progress');
          expect(completedButton.textContent).toBe('Completed');

          // Completed button should be disabled
          expect(completedButton).toBeDisabled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
