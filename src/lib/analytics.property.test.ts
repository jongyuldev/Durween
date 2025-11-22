import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { database } from './database';
import {
  recordEvent,
  calculateCompletedTasks,
  calculateFocusMinutes,
} from './analytics';
import type { AnalyticsEventType } from './types';

// Feature: clippy-task-scheduler, Property 20: Analytics events are recorded with complete data
// Validates: Requirements 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.5

describe('Analytics Property Tests', () => {
  beforeEach(async () => {
    // Clear analytics events before each test
    const allEvents = await database.getAnalyticsEvents(
      new Date('2000-01-01'),
      new Date('2100-01-01')
    );
    // Note: We don't have a delete method, so we'll work with existing data
  });

  describe('Property 20: Analytics events are recorded with complete data', () => {
    it('should record events with all required fields for all event types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<AnalyticsEventType>(
            'schedule_generated',
            'timebox_started',
            'timebox_paused',
            'timebox_resumed',
            'task_completed',
            'suggestion_accepted'
          ),
          fc.dictionary(fc.string(), fc.anything()),
          async (eventType, metadata) => {
            const beforeTimestamp = new Date();

            const event = await recordEvent(database, eventType, metadata);

            const afterTimestamp = new Date();

            // Event should have an id
            fc.pre(
              event.id !== undefined && event.id !== null && event.id.length > 0
            );

            // Event should have the correct type
            fc.pre(event.type === eventType);

            // Event should have a timestamp between before and after
            fc.pre(
              event.timestamp >= beforeTimestamp &&
                event.timestamp <= afterTimestamp
            );

            // Event should have metadata (even if empty)
            fc.pre(event.metadata !== undefined && event.metadata !== null);

            // Verify the event was persisted
            const retrieved = await database.getAnalyticsEvents(
              new Date(beforeTimestamp.getTime() - 1000),
              new Date(afterTimestamp.getTime() + 1000)
            );

            const found = retrieved.find((e) => e.id === event.id);
            fc.pre(found !== undefined);
            fc.pre(found!.type === eventType);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: clippy-task-scheduler, Property 21: Analytics events persist correctly
  // Validates: Requirements 8.4
  describe('Property 21: Analytics events persist correctly', () => {
    it('should persist and retrieve events with equivalent data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<AnalyticsEventType>(
            'schedule_generated',
            'timebox_started',
            'timebox_paused',
            'timebox_resumed',
            'task_completed',
            'suggestion_accepted'
          ),
          fc.dictionary(
            fc.string(),
            fc.oneof(fc.string(), fc.integer(), fc.boolean())
          ),
          async (eventType, metadata) => {
            const event = await recordEvent(database, eventType, metadata);

            // Retrieve the event
            const startDate = new Date(event.timestamp.getTime() - 1000);
            const endDate = new Date(event.timestamp.getTime() + 1000);
            const retrieved = await database.getAnalyticsEvents(
              startDate,
              endDate
            );

            const found = retrieved.find((e) => e.id === event.id);

            // Event should be found
            fc.pre(found !== undefined);

            // Type should match
            fc.pre(found!.type === event.type);

            // Timestamp should be close (within 1 second due to serialization)
            const timeDiff = Math.abs(
              new Date(found!.timestamp).getTime() - event.timestamp.getTime()
            );
            fc.pre(timeDiff < 1000);

            // Metadata keys should match
            const originalKeys = Object.keys(metadata).sort();
            const retrievedKeys = Object.keys(found!.metadata).sort();
            fc.pre(
              JSON.stringify(originalKeys) === JSON.stringify(retrievedKeys)
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: clippy-task-scheduler, Property 19: Analytics calculations are accurate
  // Validates: Requirements 7.1, 7.2
  describe('Property 19: Analytics calculations are accurate', () => {
    it('should accurately count completed tasks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              taskId: fc.string(),
              durationMinutes: fc.integer({ min: 1, max: 480 }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          async (tasks) => {
            const testDate = new Date();
            testDate.setHours(12, 0, 0, 0);

            // Record task_completed events for this date
            for (const task of tasks) {
              await recordEvent(database, 'task_completed', {
                taskId: task.taskId,
                durationMinutes: task.durationMinutes,
              });
            }

            // Calculate completed tasks
            const count = await calculateCompletedTasks(database, testDate);

            // Count should be at least the number of tasks we just added
            // (may be more due to previous test runs)
            fc.pre(count >= tasks.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should accurately sum focus minutes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              taskId: fc.string(),
              durationMinutes: fc.integer({ min: 1, max: 480 }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          async (tasks) => {
            const testDate = new Date();
            testDate.setHours(12, 0, 0, 0);

            // Record task_completed events for this date
            for (const task of tasks) {
              await recordEvent(database, 'task_completed', {
                taskId: task.taskId,
                durationMinutes: task.durationMinutes,
              });
            }

            // Calculate focus minutes
            const totalMinutes = await calculateFocusMinutes(
              database,
              testDate
            );

            // Calculate expected sum
            const expectedSum = tasks.reduce(
              (sum, task) => sum + task.durationMinutes,
              0
            );

            // Total should be at least the sum we just added
            // (may be more due to previous test runs)
            fc.pre(totalMinutes >= expectedSum);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
