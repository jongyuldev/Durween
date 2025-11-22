import { describe, it, beforeEach, expect } from 'vitest';
import * as fc from 'fast-check';
import { database } from './database';
import type { Task, ScheduleBlock, Session } from './types';

// Helper to clear all data before each test
async function clearDatabase() {
  const tasks = await database.getTasks();
  for (const task of tasks) {
    await database.deleteTask(task.id);
  }

  const today = new Date();
  await database.clearScheduleBlocks(today);

  const sessions = await database.getActiveSessions();
  for (const session of sessions) {
    await database.updateSession({ ...session, status: 'completed' });
  }
}

// Custom arbitraries for domain objects
const taskArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  durationMinutes: fc.integer({ min: 1, max: 480 }),
  createdAt: fc.date(),
  completed: fc.boolean(),
});

const scheduleBlockArbitrary = fc.record({
  id: fc.uuid(),
  taskId: fc.uuid(),
  startTime: fc.date(),
  endTime: fc.date(),
  status: fc.constantFrom(
    'scheduled',
    'in-progress',
    'completed'
  ) as fc.Arbitrary<'scheduled' | 'in-progress' | 'completed'>,
});

const sessionArbitrary = fc.record({
  id: fc.uuid(),
  taskId: fc.uuid(),
  scheduleBlockId: fc.uuid(),
  startTime: fc.date(),
  pausedAt: fc.option(fc.date(), { nil: undefined }),
  resumedAt: fc.option(fc.date(), { nil: undefined }),
  completedAt: fc.option(fc.date(), { nil: undefined }),
  accumulatedMinutes: fc.integer({ min: 0, max: 480 }),
  status: fc.constantFrom('active', 'paused', 'completed') as fc.Arbitrary<
    'active' | 'paused' | 'completed'
  >,
});

describe('Database Property Tests', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  // Feature: clippy-task-scheduler, Property 10: Task persistence round-trip
  // Validates: Requirements 4.1
  it('Property 10: Task persistence round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(taskArbitrary, async (task: Task) => {
        // Add task to database
        await database.addTask(task);

        // Retrieve all tasks
        const tasks = await database.getTasks();

        // Find the task we just added
        const retrievedTask = tasks.find((t) => t.id === task.id);

        // Verify the task exists and matches
        expect(retrievedTask).toBeDefined();
        expect(retrievedTask?.id).toBe(task.id);
        expect(retrievedTask?.name).toBe(task.name);
        expect(retrievedTask?.durationMinutes).toBe(task.durationMinutes);
        expect(retrievedTask?.completed).toBe(task.completed);

        // Clean up
        await database.deleteTask(task.id);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: clippy-task-scheduler, Property 11: Schedule persistence round-trip
  // Validates: Requirements 4.2
  it('Property 11: Schedule persistence round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(scheduleBlockArbitrary, { minLength: 1, maxLength: 10 }),
        async (blocks: ScheduleBlock[]) => {
          // Ensure all blocks have the same date for retrieval
          const testDate = new Date('2024-01-15T10:00:00Z');
          const normalizedBlocks = blocks.map((block) => ({
            ...block,
            startTime: new Date(
              testDate.toISOString().split('T')[0] + 'T10:00:00Z'
            ),
            endTime: new Date(
              testDate.toISOString().split('T')[0] + 'T11:00:00Z'
            ),
          }));

          // Add all blocks to database
          for (const block of normalizedBlocks) {
            await database.addScheduleBlock(block);
          }

          // Retrieve blocks for the test date
          const retrievedBlocks = await database.getScheduleBlocks(testDate);

          // Verify all blocks were stored and retrieved
          for (const block of normalizedBlocks) {
            const retrieved = retrievedBlocks.find((b) => b.id === block.id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(block.id);
            expect(retrieved?.taskId).toBe(block.taskId);
            expect(retrieved?.status).toBe(block.status);
          }

          // Clean up
          await database.clearScheduleBlocks(testDate);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: clippy-task-scheduler, Property 12: Session state persists across changes
  // Validates: Requirements 4.3, 4.5
  it('Property 12: Session state persists across changes', async () => {
    await fc.assert(
      fc.asyncProperty(sessionArbitrary, async (session: Session) => {
        // Add session to database
        await database.addSession(session);

        // Retrieve the session
        const retrieved1 = await database.getSession(session.id);
        expect(retrieved1).toBeDefined();
        expect(retrieved1?.id).toBe(session.id);
        expect(retrieved1?.status).toBe(session.status);
        expect(retrieved1?.accumulatedMinutes).toBe(session.accumulatedMinutes);

        // Update the session (simulate state change)
        const updatedSession: Session = {
          ...session,
          accumulatedMinutes: session.accumulatedMinutes + 10,
          status: 'paused',
        };
        await database.updateSession(updatedSession);

        // Retrieve again and verify the update persisted
        const retrieved2 = await database.getSession(session.id);
        expect(retrieved2).toBeDefined();
        expect(retrieved2?.accumulatedMinutes).toBe(
          updatedSession.accumulatedMinutes
        );
        expect(retrieved2?.status).toBe('paused');

        // Clean up
        await database.updateSession({
          ...updatedSession,
          status: 'completed',
        });
      }),
      { numRuns: 100 }
    );
  });

  // Feature: clippy-task-scheduler, Property 13: Application state restoration
  // Validates: Requirements 4.4
  it('Property 13: Application state restoration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tasks: fc.array(taskArbitrary, { minLength: 1, maxLength: 5 }),
          scheduleBlocks: fc.array(scheduleBlockArbitrary, {
            minLength: 1,
            maxLength: 5,
          }),
          sessions: fc.array(sessionArbitrary, { minLength: 1, maxLength: 3 }),
        }),
        async ({ tasks, scheduleBlocks, sessions }) => {
          // Store all application state
          for (const task of tasks) {
            await database.addTask(task);
          }

          const testDate = new Date('2024-01-15T10:00:00Z');
          const normalizedBlocks = scheduleBlocks.map((block) => ({
            ...block,
            startTime: new Date(
              testDate.toISOString().split('T')[0] + 'T10:00:00Z'
            ),
            endTime: new Date(
              testDate.toISOString().split('T')[0] + 'T11:00:00Z'
            ),
          }));

          for (const block of normalizedBlocks) {
            await database.addScheduleBlock(block);
          }

          for (const session of sessions) {
            await database.addSession(session);
          }

          // Simulate reload by retrieving all data
          const retrievedTasks = await database.getTasks();
          const retrievedBlocks = await database.getScheduleBlocks(testDate);
          const retrievedSessions = await database.getActiveSessions();

          // Verify all tasks were restored
          for (const task of tasks) {
            const found = retrievedTasks.find((t) => t.id === task.id);
            expect(found).toBeDefined();
            expect(found?.name).toBe(task.name);
          }

          // Verify all schedule blocks were restored
          for (const block of normalizedBlocks) {
            const found = retrievedBlocks.find((b) => b.id === block.id);
            expect(found).toBeDefined();
            expect(found?.taskId).toBe(block.taskId);
          }

          // Verify active/paused sessions were restored
          const activeSessions = sessions.filter(
            (s) => s.status === 'active' || s.status === 'paused'
          );
          for (const session of activeSessions) {
            const found = retrievedSessions.find((s) => s.id === session.id);
            expect(found).toBeDefined();
            expect(found?.status).toBe(session.status);
          }

          // Clean up
          for (const task of tasks) {
            await database.deleteTask(task.id);
          }
          await database.clearScheduleBlocks(testDate);
          for (const session of sessions) {
            await database.updateSession({ ...session, status: 'completed' });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
