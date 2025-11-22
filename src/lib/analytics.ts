import { v4 as uuidv4 } from 'uuid';
import type { AnalyticsEvent, AnalyticsEventType, Database } from './types';

/**
 * Analytics tracking module for Clippy
 * Records user actions and system events for measuring usage patterns
 */

/**
 * Records an analytics event with the specified type and metadata
 * @param db Database instance for persistence
 * @param type Event type
 * @param metadata Additional context data for the event
 * @returns The created analytics event
 */
export async function recordEvent(
  db: Database,
  type: AnalyticsEventType,
  metadata: Record<string, any> = {}
): Promise<AnalyticsEvent> {
  const event: AnalyticsEvent = {
    id: uuidv4(),
    type,
    timestamp: new Date(),
    metadata,
  };

  await db.addAnalyticsEvent(event);
  return event;
}

/**
 * Calculates the total number of completed tasks for a given date
 * @param db Database instance
 * @param date The date to calculate for (defaults to today)
 * @returns Number of completed tasks
 */
export async function calculateCompletedTasks(
  db: Database,
  date: Date = new Date()
): Promise<number> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const events = await db.getAnalyticsEvents(startOfDay, endOfDay);

  // Count task_completed events
  const completedEvents = events.filter(
    (event) => event.type === 'task_completed'
  );

  return completedEvents.length;
}

/**
 * Calculates the total focus minutes from completed sessions for a given date
 * @param db Database instance
 * @param date The date to calculate for (defaults to today)
 * @returns Total focus minutes
 */
export async function calculateFocusMinutes(
  db: Database,
  date: Date = new Date()
): Promise<number> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const events = await db.getAnalyticsEvents(startOfDay, endOfDay);

  // Sum up duration from task_completed events
  const completedEvents = events.filter(
    (event) => event.type === 'task_completed'
  );

  let totalMinutes = 0;
  for (const event of completedEvents) {
    if (event.metadata.durationMinutes) {
      totalMinutes += event.metadata.durationMinutes;
    }
  }

  return totalMinutes;
}
