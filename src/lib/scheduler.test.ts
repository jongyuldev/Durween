import { describe, it, expect } from 'vitest';
import { GreedyScheduler } from './scheduler';
import { Task, WorkHours, Fixedent, ScheduleInput } from './types';

describe('Scheduler Unit Tests', () => {
  const createTask = (
    id: string,
    name: string,
    durationMinutes: number
  ): Task => ({
    id,
    name,
    durationMinutes,
    createdAt: new Date(),
    completed: false,
  });

  const defaultWorkHours: WorkHours = {
    startHour: 9,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
  };

  const scheduleDate = new Date('2024-01-15T00:00:00Z');

  it('should handle empty task list', () => {
    const scheduler = new GreedyScheduler();
    const input: ScheduleInput = {
      tasks: [],
      workHours: defaultWorkHours,
      fixedEvents: [],
      scheduleDate,
    };

    const result = scheduler.generateSchedule(input);

    expect(result.scheduledBlocks).toHaveLength(0);
    expect(result.unscheduledTasks).toHaveLength(0);
  });

  it('should schedule tasks that exactly fill work hours', () => {
    const scheduler = new GreedyScheduler();
    // 8 hours = 480 minutes
    const tasks = [
      createTask('1', 'Task 1', 240), // 4 hours
      createTask('2', 'Task 2', 240), // 4 hours
    ];

    const input: ScheduleInput = {
      tasks,
      workHours: defaultWorkHours,
      fixedEvents: [],
      scheduleDate,
    };

    const result = scheduler.generateSchedule(input);

    expect(result.scheduledBlocks).toHaveLength(2);
    expect(result.unscheduledTasks).toHaveLength(0);

    // Verify blocks are back-to-back
    const block1 = result.scheduledBlocks[0];
    const block2 = result.scheduledBlocks[1];
    expect(block2.startTime.getTime()).toBe(block1.endTime.getTime());
  });

  it('should handle tasks that exceed available work hours', () => {
    const scheduler = new GreedyScheduler();
    // 8 hours = 480 minutes, but tasks total 600 minutes
    const tasks = [
      createTask('1', 'Task 1', 300), // 5 hours
      createTask('2', 'Task 2', 200), // 3.33 hours
      createTask('3', 'Task 3', 100), // 1.67 hours
    ];

    const input: ScheduleInput = {
      tasks,
      workHours: defaultWorkHours,
      fixedEvents: [],
      scheduleDate,
    };

    const result = scheduler.generateSchedule(input);

    // First two tasks should fit (500 minutes), third should not
    expect(result.scheduledBlocks.length).toBeGreaterThan(0);
    expect(result.unscheduledTasks.length).toBeGreaterThan(0);
    expect(result.scheduledBlocks.length + result.unscheduledTasks.length).toBe(
      3
    );
  });

  it('should handle overlapping fixed events', () => {
    const scheduler = new GreedyScheduler();
    const tasks = [
      createTask('1', 'Task 1', 60), // 1 hour
      createTask('2', 'Task 2', 60), // 1 hour
    ];

    // Create overlapping fixed events
    const event1Start = new Date(scheduleDate);
    event1Start.setHours(10, 0, 0, 0);
    const event1End = new Date(scheduleDate);
    event1End.setHours(11, 0, 0, 0);

    const event2Start = new Date(scheduleDate);
    event2Start.setHours(10, 30, 0, 0);
    const event2End = new Date(scheduleDate);
    event2End.setHours(12, 0, 0, 0);

    const fixedEvents: FixedEvent[] = [
      {
        id: 'event1',
        title: 'Meeting 1',
        startTime: event1Start,
        endTime: event1End,
      },
      {
        id: 'event2',
        title: 'Meeting 2',
        startTime: event2Start,
        endTime: event2End,
      },
    ];

    const input: ScheduleInput = {
      tasks,
      workHours: defaultWorkHours,
      fixedEvents,
      scheduleDate,
    };

    const result = scheduler.generateSchedule(input);

    // Tasks should be scheduled around the fixed events
    expect(result.scheduledBlocks.length).toBeGreaterThan(0);

    // Verify no overlap with fixed events
    for (const block of result.scheduledBlocks) {
      for (const event of fixedEvents) {
        const hasOverlap =
          block.startTime < event.endTime && block.endTime > event.startTime;
        expect(hasOverlap).toBe(false);
      }
    }
  });

  it('should throw error for invalid work hours', () => {
    const scheduler = new GreedyScheduler();
    const invalidWorkHours: WorkHours = {
      startHour: 17,
      startMinute: 0,
      endHour: 9,
      endMinute: 0,
    };

    const input: ScheduleInput = {
      tasks: [createTask('1', 'Task 1', 60)],
      workHours: invalidWorkHours,
      fixedEvents: [],
      scheduleDate,
    };

    expect(() => scheduler.generateSchedule(input)).toThrow(
      'Work hours must have start time before end time'
    );
  });

  it('should schedule tasks in FIFO order', () => {
    const scheduler = new GreedyScheduler();
    const tasks = [
      createTask('1', 'First Task', 60),
      createTask('2', 'Second Task', 60),
      createTask('3', 'Third Task', 60),
    ];

    const input: ScheduleInput = {
      tasks,
      workHours: defaultWorkHours,
      fixedEvents: [],
      scheduleDate,
    };

    const result = scheduler.generateSchedule(input);

    expect(result.scheduledBlocks).toHaveLength(3);
    expect(result.scheduledBlocks[0].taskId).toBe('1');
    expect(result.scheduledBlocks[1].taskId).toBe('2');
    expect(result.scheduledBlocks[2].taskId).toBe('3');
  });

  it('should schedule around a fixed event in the middle of work hours', () => {
    const scheduler = new GreedyScheduler();
    const tasks = [
      createTask('1', 'Morning Task', 120), // 2 hours
      createTask('2', 'Afternoon Task', 120), // 2 hours
    ];

    // Fixed event from 11 AM to 1 PM
    const eventStart = new Date(scheduleDate);
    eventStart.setHours(11, 0, 0, 0);
    const eventEnd = new Date(scheduleDate);
    eventEnd.setHours(13, 0, 0, 0);

    const fixedEvents: FixedEvent[] = [
      {
        id: 'lunch',
        title: 'Lunch Meeting',
        startTime: eventStart,
        endTime: eventEnd,
      },
    ];

    const input: ScheduleInput = {
      tasks,
      workHours: defaultWorkHours,
      fixedEvents,
      scheduleDate,
    };

    const result = scheduler.generateSchedule(input);

    expect(result.scheduledBlocks).toHaveLength(2);

    // First task should be before the event
    expect(result.scheduledBlocks[0].endTime.getTime()).toBeLessThanOrEqual(
      eventStart.getTime()
    );

    // Second task should be after the event
    expect(
      result.scheduledBlocks[1].startTime.getTime()
    ).toBeGreaterThanOrEqual(eventEnd.getTime());
  });
});
