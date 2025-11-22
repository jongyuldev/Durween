import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { GreedyScheduler } from './scheduler';
import { Task, WorkHours, FixedEvent, ScheduleInput } from './types';

describe('Scheduler Property-Based Tests', () => {
  // Feature: clippy-task-scheduler, Property 5: Scheduled blocks respect work hours
  // Validates: Requirements 2.2
  it('Property 5: all scheduled blocks respect work hours boundaries', () => {
    fc.assert(
      fc.property(
        // Generate random tasks with unique IDs
        fc
          .array(
            fc.record({
              name: fc.string({ minLength: 1 }),
              durationMinutes: fc.integer({ min: 1, max: 240 }), // 1-240 minutes
              createdAt: fc.date(),
              completed: fc.boolean(),
            }),
            { minLength: 0, maxLength: 10 }
          )
          .map((tasks, index) =>
            tasks.map((task, i) => ({ ...task, id: `task_${index}_${i}` }))
          ),
        // Generate random work hours
        fc
          .record({
            startHour: fc.integer({ min: 0, max: 22 }),
            startMinute: fc.integer({ min: 0, max: 59 }),
          })
          .chain((start) =>
            fc.record({
              startHour: fc.constant(start.startHour),
              startMinute: fc.constant(start.startMinute),
              endHour: fc.integer({ min: start.startHour + 1, max: 23 }),
              endMinute: fc.integer({ min: 0, max: 59 }),
            })
          ),
        // Generate schedule date
        fc.date(),
        (tasks: Task[], workHours: WorkHours, scheduleDate: Date) => {
          const scheduler = new GreedyScheduler();
          const input: ScheduleInput = {
            tasks,
            workHours,
            fixedEvents: [],
            scheduleDate,
          };

          const result = scheduler.generateSchedule(input);

          // Create work hours boundaries for comparison
          const workStart = new Date(scheduleDate);
          workStart.setHours(workHours.startHour, workHours.startMinute, 0, 0);

          const workEnd = new Date(scheduleDate);
          workEnd.setHours(workHours.endHour, workHours.endMinute, 0, 0);

          // Property: All scheduled blocks must fall within work hours
          for (const block of result.scheduledBlocks) {
            expect(block.startTime.getTime()).toBeGreaterThanOrEqual(
              workStart.getTime()
            );
            expect(block.endTime.getTime()).toBeLessThanOrEqual(
              workEnd.getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: clippy-task-scheduler, Property 6: Scheduled blocks avoid fixed events
// Validates: Requirements 2.3
it('Property 6: scheduled blocks do not overlap with fixed events', () => {
  fc.assert(
    fc.property(
      // Generate random tasks with unique IDs
      fc
        .array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            durationMinutes: fc.integer({ min: 1, max: 120 }),
            createdAt: fc.date(),
            completed: fc.boolean(),
          }),
          { minLength: 0, maxLength: 10 }
        )
        .map((tasks, index) =>
          tasks.map((task, i) => ({ ...task, id: `task_${index}_${i}` }))
        ),
      // Generate work hours (9 AM to 5 PM for simplicity)
      fc.constant({
        startHour: 9,
        startMinute: 0,
        endHour: 17,
        endMinute: 0,
      }),
      // Generate schedule date
      fc.date(),
      // Generate fixed events within work hours
      fc.array(
        fc.record({
          id: fc.string({ minLength: 1 }),
          title: fc.string({ minLength: 1 }),
          startHour: fc.integer({ min: 9, max: 16 }),
          durationMinutes: fc.integer({ min: 15, max: 120 }),
        }),
        { minLength: 0, maxLength: 5 }
      ),
      (
        tasks: Task[],
        workHours: WorkHours,
        scheduleDate: Date,
        fixedEventSpecs: Array<{
          id: string;
          title: string;
          startHour: number;
          durationMinutes: number;
        }>
      ) => {
        // Convert fixed event specs to actual FixedEvent objects
        const fixedEvents: FixedEvent[] = fixedEventSpecs.map((spec) => {
          const start = new Date(scheduleDate);
          start.setHours(spec.startHour, 0, 0, 0);
          const end = new Date(
            start.getTime() + spec.durationMinutes * 60 * 1000
          );
          return {
            id: spec.id,
            title: spec.title,
            startTime: start,
            endTime: end,
          };
        });

        const scheduler = new GreedyScheduler();
        const input: ScheduleInput = {
          tasks,
          workHours,
          fixedEvents,
          scheduleDate,
        };

        const result = scheduler.generateSchedule(input);

        // Property: No scheduled block should overlap with any fixed event
        for (const block of result.scheduledBlocks) {
          for (const event of fixedEvents) {
            const hasOverlap =
              block.startTime < event.endTime &&
              block.endTime > event.startTime;
            expect(hasOverlap).toBe(false);
          }
        }
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: clippy-task-scheduler, Property 7: Unscheduled tasks are tracked
// Validates: Requirements 2.4
it('Property 7: tasks that do not fit are tracked as unscheduled', () => {
  fc.assert(
    fc.property(
      // Generate random tasks with unique IDs
      fc
        .array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            durationMinutes: fc.integer({ min: 1, max: 240 }),
            createdAt: fc.date(),
            completed: fc.boolean(),
          }),
          { minLength: 1, maxLength: 20 }
        )
        .map((tasks, index) =>
          tasks.map((task, i) => ({ ...task, id: `task_${index}_${i}` }))
        ),
      // Generate work hours
      fc
        .record({
          startHour: fc.integer({ min: 0, max: 22 }),
          startMinute: fc.integer({ min: 0, max: 59 }),
        })
        .chain((start) =>
          fc.record({
            startHour: fc.constant(start.startHour),
            startMinute: fc.constant(start.startMinute),
            endHour: fc.integer({ min: start.startHour + 1, max: 23 }),
            endMinute: fc.integer({ min: 0, max: 59 }),
          })
        ),
      // Generate schedule date
      fc.date(),
      (tasks: Task[], workHours: WorkHours, scheduleDate: Date) => {
        const scheduler = new GreedyScheduler();
        const input: ScheduleInput = {
          tasks,
          workHours,
          fixedEvents: [],
          scheduleDate,
        };

        const result = scheduler.generateSchedule(input);

        // Property: All tasks should be either scheduled or unscheduled
        const scheduledTaskIds = new Set(
          result.scheduledBlocks.map((block) => block.taskId)
        );
        const unscheduledTaskIds = new Set(
          result.unscheduledTasks.map((task) => task.id)
        );

        // Every task should appear in exactly one list
        for (const task of tasks) {
          const isScheduled = scheduledTaskIds.has(task.id);
          const isUnscheduled = unscheduledTaskIds.has(task.id);
          expect(isScheduled !== isUnscheduled).toBe(true); // XOR: exactly one should be true
        }

        // Total count should match
        expect(
          result.scheduledBlocks.length + result.unscheduledTasks.length
        ).toBe(tasks.length);
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: clippy-task-scheduler, Property 8: Schedule blocks are chronologically ordered
// Validates: Requirements 2.5, 5.1
it('Property 8: schedule blocks are returned in chronological order', () => {
  fc.assert(
    fc.property(
      // Generate random tasks with unique IDs
      fc
        .array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            durationMinutes: fc.integer({ min: 1, max: 120 }),
            createdAt: fc.date(),
            completed: fc.boolean(),
          }),
          { minLength: 0, maxLength: 15 }
        )
        .map((tasks, index) =>
          tasks.map((task, i) => ({ ...task, id: `task_${index}_${i}` }))
        ),
      // Generate work hours
      fc
        .record({
          startHour: fc.integer({ min: 0, max: 22 }),
          startMinute: fc.integer({ min: 0, max: 59 }),
        })
        .chain((start) =>
          fc.record({
            startHour: fc.constant(start.startHour),
            startMinute: fc.constant(start.startMinute),
            endHour: fc.integer({ min: start.startHour + 1, max: 23 }),
            endMinute: fc.integer({ min: 0, max: 59 }),
          })
        ),
      // Generate schedule date
      fc.date(),
      (tasks: Task[], workHours: WorkHours, scheduleDate: Date) => {
        const scheduler = new GreedyScheduler();
        const input: ScheduleInput = {
          tasks,
          workHours,
          fixedEvents: [],
          scheduleDate,
        };

        const result = scheduler.generateSchedule(input);

        // Property: Schedule blocks should be in chronological order
        for (let i = 1; i < result.scheduledBlocks.length; i++) {
          const prevBlock = result.scheduledBlocks[i - 1];
          const currentBlock = result.scheduledBlocks[i];
          expect(currentBlock.startTime.getTime()).toBeGreaterThanOrEqual(
            prevBlock.startTime.getTime()
          );
        }
      }
    ),
    { numRuns: 100 }
  );
});
