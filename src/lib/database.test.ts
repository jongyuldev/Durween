import { describe, it, expect, beforeEach } from 'vitest';
import { database } from './database';
import type { Task, ScheduleBlock, Session } from './types';

describe('Database Error Handling', () => {
  beforeEach(async () => {
    // Clear database before each test
    const tasks = await database.getTasks();
    for (const task of tasks) {
      await database.deleteTask(task.id);
    }
  });

  it('should successfully add and retrieve a task', async () => {
    const task: Task = {
      id: 'test-1',
      name: 'Test Task',
      durationMinutes: 30,
      createdAt: new Date(),
      completed: false,
    };

    await database.addTask(task);
    const tasks = await database.getTasks();
    const found = tasks.find((t) => t.id === task.id);

    expect(found).toBeDefined();
    expect(found?.name).toBe(task.name);

    await database.deleteTask(task.id);
  });

  it('should successfully update a task', async () => {
    const task: Task = {
      id: 'test-2',
      name: 'Test Task',
      durationMinutes: 30,
      createdAt: new Date(),
      completed: false,
    };

    await database.addTask(task);

    const updatedTask = { ...task, completed: true };
    await database.updateTask(updatedTask);

    const tasks = await database.getTasks();
    const found = tasks.find((t) => t.id === task.id);

    expect(found?.completed).toBe(true);

    await database.deleteTask(task.id);
  });

  it('should successfully add and retrieve schedule blocks', async () => {
    const block: ScheduleBlock = {
      id: 'block-1',
      taskId: 'task-1',
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T11:00:00Z'),
      status: 'scheduled',
    };

    await database.addScheduleBlock(block);
    const blocks = await database.getScheduleBlocks(new Date('2024-01-15'));
    const found = blocks.find((b) => b.id === block.id);

    expect(found).toBeDefined();
    expect(found?.taskId).toBe(block.taskId);

    await database.clearScheduleBlocks(new Date('2024-01-15'));
  });

  it('should successfully add and retrieve a session', async () => {
    const session: Session = {
      id: 'session-1',
      taskId: 'task-1',
      scheduleBlockId: 'block-1',
      startTime: new Date(),
      accumulatedMinutes: 0,
      status: 'active',
    };

    await database.addSession(session);
    const retrieved = await database.getSession(session.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(session.id);
    expect(retrieved?.status).toBe('active');

    await database.updateSession({ ...session, status: 'completed' });
  });

  it('should return null for non-existent session', async () => {
    const session = await database.getSession('non-existent-id');
    expect(session).toBeNull();
  });

  it('should filter active sessions correctly', async () => {
    const activeSession: Session = {
      id: 'active-1',
      taskId: 'task-1',
      scheduleBlockId: 'block-1',
      startTime: new Date(),
      accumulatedMinutes: 0,
      status: 'active',
    };

    const completedSession: Session = {
      id: 'completed-1',
      taskId: 'task-2',
      scheduleBlockId: 'block-2',
      startTime: new Date(),
      accumulatedMinutes: 30,
      status: 'completed',
    };

    await database.addSession(activeSession);
    await database.addSession(completedSession);

    const activeSessions = await database.getActiveSessions();
    const foundActive = activeSessions.find((s) => s.id === activeSession.id);
    const foundCompleted = activeSessions.find(
      (s) => s.id === completedSession.id
    );

    expect(foundActive).toBeDefined();
    expect(foundCompleted).toBeUndefined();

    await database.updateSession({ ...activeSession, status: 'completed' });
  });

  it('should handle date filtering for schedule blocks', async () => {
    const block1: ScheduleBlock = {
      id: 'block-1',
      taskId: 'task-1',
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T11:00:00Z'),
      status: 'scheduled',
    };

    const block2: ScheduleBlock = {
      id: 'block-2',
      taskId: 'task-2',
      startTime: new Date('2024-01-16T10:00:00Z'),
      endTime: new Date('2024-01-16T11:00:00Z'),
      status: 'scheduled',
    };

    await database.addScheduleBlock(block1);
    await database.addScheduleBlock(block2);

    const blocks15 = await database.getScheduleBlocks(new Date('2024-01-15'));
    const blocks16 = await database.getScheduleBlocks(new Date('2024-01-16'));

    expect(blocks15.find((b) => b.id === 'block-1')).toBeDefined();
    expect(blocks15.find((b) => b.id === 'block-2')).toBeUndefined();
    expect(blocks16.find((b) => b.id === 'block-2')).toBeDefined();

    await database.clearScheduleBlocks(new Date('2024-01-15'));
    await database.clearScheduleBlocks(new Date('2024-01-16'));
  });
});
