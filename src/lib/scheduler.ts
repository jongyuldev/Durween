import type {
  Task,
  ScheduleBlock,
  WorkHours,
  FixedEvent,
  ScheduleInput,
  ScheduleResult,
  Scheduler,
} from './types';

/**
 * Greedy scheduler implementation that assigns tasks to earliest available time slots.
 *
 * The algorithm processes tasks in FIFO order and assigns each task to the earliest
 * available time slot that:
 * - Fits within the defined work hours
 * - Doesn't conflict with fixed events
 * - Has sufficient duration for the task
 *
 * Tasks that cannot be scheduled are tracked in the unscheduled list.
 *
 * @example
 * ```typescript
 * const scheduler = new GreedyScheduler();
 * const result = scheduler.generateSchedule({
 *   tasks: [{ name: 'emails', durationMinutes: 30, ... }],
 *   workHours: { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
 *   fixedEvents: [],
 *   scheduleDate: new Date()
 * });
 * ```
 */
export class GreedyScheduler implements Scheduler {
  /**
   * Generates a schedule by assigning tasks to available time slots.
   *
   * @param input - Scheduling configuration including tasks, work hours, fixed events, and date
   * @returns ScheduleResult containing scheduled blocks and unscheduled tasks
   * @throws Error if work hours are invalid (start time must be before end time)
   *
   * @remarks
   * - Tasks are processed in the order provided (FIFO)
   * - Schedule blocks are returned in chronological order
   * - Fixed events are respected and no tasks will overlap with them
   * - Tasks that don't fit in remaining time are added to unscheduledTasks
   */
  generateSchedule(input: ScheduleInput): ScheduleResult {
    const { tasks, workHours, fixedEvents, scheduleDate } = input;

    // Validate work hours
    if (!this.isValidWorkHours(workHours)) {
      throw new Error('Work hours must have start time before end time');
    }

    const scheduledBlocks: ScheduleBlock[] = [];
    const unscheduledTasks: Task[] = [];

    // Get work hours boundaries for the schedule date
    const workStart = this.createDateTime(
      scheduleDate,
      workHours.startHour,
      workHours.startMinute
    );
    const workEnd = this.createDateTime(
      scheduleDate,
      workHours.endHour,
      workHours.endMinute
    );

    // Sort fixed events by start time for efficient conflict checking
    const sortedFixedEvents = [...fixedEvents].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    // Current time pointer for greedy allocation
    let currentTime = new Date(workStart);

    // Process tasks in order (FIFO)
    for (const task of tasks) {
      const slot = this.findNextAvailableSlot(
        currentTime,
        task.durationMinutes,
        workEnd,
        sortedFixedEvents
      );

      if (slot) {
        // Create schedule block
        const block: ScheduleBlock = {
          id: this.generateId(),
          taskId: task.id,
          startTime: slot.start,
          endTime: slot.end,
          status: 'scheduled',
        };
        scheduledBlocks.push(block);

        // Move current time to end of this block
        currentTime = new Date(slot.end);
      } else {
        // Task doesn't fit in remaining time
        unscheduledTasks.push(task);
      }
    }

    // Ensure blocks are in chronological order
    scheduledBlocks.sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    return {
      scheduledBlocks,
      unscheduledTasks,
    };
  }

  /**
   * Finds the next available time slot that fits the task duration.
   *
   * Searches forward from startFrom, skipping over fixed events, until a valid
   * slot is found or work hours end.
   *
   * @param startFrom - The earliest time to start searching
   * @param durationMinutes - Required duration for the task
   * @param workEnd - End of work hours (hard boundary)
   * @param fixedEvents - Sorted list of fixed events to avoid
   * @returns Time slot with start and end times, or null if no slot available
   */
  private findNextAvailableSlot(
    startFrom: Date,
    durationMinutes: number,
    workEnd: Date,
    fixedEvents: FixedEvent[]
  ): { start: Date; end: Date } | null {
    let candidateStart = new Date(startFrom);

    while (candidateStart < workEnd) {
      const candidateEnd = new Date(
        candidateStart.getTime() + durationMinutes * 60 * 1000
      );

      // Check if candidate slot fits within work hours
      if (candidateEnd > workEnd) {
        return null; // No more time available today
      }

      // Check for conflicts with fixed events
      const hasConflict = fixedEvents.some((event) =>
        this.hasTimeOverlap(
          candidateStart,
          candidateEnd,
          event.startTime,
          event.endTime
        )
      );

      if (!hasConflict) {
        // Found a valid slot
        return { start: candidateStart, end: candidateEnd };
      }

      // Move past the conflicting event
      const conflictingEvent = fixedEvents.find((event) =>
        this.hasTimeOverlap(
          candidateStart,
          candidateEnd,
          event.startTime,
          event.endTime
        )
      );

      if (conflictingEvent) {
        candidateStart = new Date(conflictingEvent.endTime);
      }
    }

    return null; // No slot found
  }

  /**
   * Checks if two time ranges overlap.
   *
   * Two ranges overlap if one starts before the other ends.
   *
   * @param start1 - Start of first time range
   * @param end1 - End of first time range
   * @param start2 - Start of second time range
   * @param end2 - End of second time range
   * @returns true if the ranges overlap, false otherwise
   */
  private hasTimeOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Validates work hours configuration.
   *
   * @param workHours - Work hours configuration to validate
   * @returns true if start time is before end time, false otherwise
   */
  private isValidWorkHours(workHours: WorkHours): boolean {
    const startMinutes = workHours.startHour * 60 + workHours.startMinute;
    const endMinutes = workHours.endHour * 60 + workHours.endMinute;
    return startMinutes < endMinutes;
  }

  /**
   * Creates a Date object for a specific time on a given date.
   *
   * @param date - The base date
   * @param hour - Hour (0-23)
   * @param minute - Minute (0-59)
   * @returns New Date object with specified time
   */
  private createDateTime(date: Date, hour: number, minute: number): Date {
    const result = new Date(date);
    result.setHours(hour, minute, 0, 0);
    return result;
  }

  /**
   * Generates a unique ID for schedule blocks.
   *
   * @returns Unique identifier string
   */
  private generateId(): string {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory function to create a scheduler instance.
 *
 * @returns A new GreedyScheduler instance
 *
 * @example
 * ```typescript
 * import { createScheduler } from './lib/scheduler';
 * const scheduler = createScheduler();
 * ```
 */
export function createScheduler(): Scheduler {
  return new GreedyScheduler();
}
