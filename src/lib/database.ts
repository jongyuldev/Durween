import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Task,
  ScheduleBlock,
  Session,
  AnalyticsEvent,
  Database,
} from './types';
import { strings } from './strings';

/**
 * Database schema definition for Clippy's IndexedDB storage.
 *
 * Defines five object stores:
 * - tasks: User-created tasks with completion status
 * - scheduleBlocks: Time slots assigned to tasks
 * - sessions: Timebox session tracking with state
 * - analyticsEvents: User actions and system events
 * - appState: Application configuration and preferences
 */
interface ClippyDBSchema extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: { createdAt: Date; completed: boolean };
  };
  scheduleBlocks: {
    key: string;
    value: ScheduleBlock;
    indexes: { startTime: Date; taskId: string; status: string };
  };
  sessions: {
    key: string;
    value: Session;
    indexes: { taskId: string; status: string; startTime: Date };
  };
  analyticsEvents: {
    key: string;
    value: AnalyticsEvent;
    indexes: { type: string; timestamp: Date };
  };
  appState: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'clippy-db';
const DB_VERSION = 1;

/**
 * Initializes the IndexedDB database with the required schema.
 *
 * Creates object stores and indexes on first run or when version changes.
 * Handles schema upgrades automatically.
 *
 * @returns Promise resolving to the database instance
 */
async function initDB(): Promise<IDBPDatabase<ClippyDBSchema>> {
  return openDB<ClippyDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create tasks store
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('createdAt', 'createdAt');
        taskStore.createIndex('completed', 'completed');
      }

      // Create scheduleBlocks store
      if (!db.objectStoreNames.contains('scheduleBlocks')) {
        const scheduleStore = db.createObjectStore('scheduleBlocks', {
          keyPath: 'id',
        });
        scheduleStore.createIndex('startTime', 'startTime');
        scheduleStore.createIndex('taskId', 'taskId');
        scheduleStore.createIndex('status', 'status');
      }

      // Create sessions store
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', {
          keyPath: 'id',
        });
        sessionStore.createIndex('taskId', 'taskId');
        sessionStore.createIndex('status', 'status');
        sessionStore.createIndex('startTime', 'startTime');
      }

      // Create analyticsEvents store
      if (!db.objectStoreNames.contains('analyticsEvents')) {
        const analyticsStore = db.createObjectStore('analyticsEvents', {
          keyPath: 'id',
        });
        analyticsStore.createIndex('type', 'type');
        analyticsStore.createIndex('timestamp', 'timestamp');
      }

      // Create appState store
      if (!db.objectStoreNames.contains('appState')) {
        db.createObjectStore('appState', { keyPath: 'key' });
      }
    },
  });
}

/**
 * Helper function to normalize dates for comparison.
 *
 * Converts a Date to YYYY-MM-DD format for consistent date-based filtering.
 *
 * @param date - The date to normalize
 * @returns Date string in YYYY-MM-DD format
 */
function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * IndexedDB implementation of the Database interface.
 *
 * Provides async CRUD operations for all data types with error handling
 * for quota exceeded and database unavailable scenarios.
 *
 * All operations are asynchronous and return Promises.
 *
 * @example
 * ```typescript
 * const db = new IndexedDBDatabase();
 * await db.addTask({ id: '1', name: 'Test', durationMinutes: 30, ... });
 * const tasks = await db.getTasks();
 * ```
 */
class IndexedDBDatabase implements Database {
  private dbPromise: Promise<IDBPDatabase<ClippyDBSchema>>;

  constructor() {
    this.dbPromise = initDB();
  }

  /**
   * Adds a new task to the database.
   *
   * @param task - The task to add
   * @throws Error if storage quota is exceeded
   */
  async addTask(task: Task): Promise<void> {
    try {
      const db = await this.dbPromise;
      await db.add('tasks', task);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error(strings.errors.storageQuotaExceeded);
      }
      throw error;
    }
  }

  /**
   * Retrieves all tasks from the database.
   *
   * @returns Array of all tasks, or empty array on error
   */
  async getTasks(): Promise<Task[]> {
    try {
      const db = await this.dbPromise;
      return await db.getAll('tasks');
    } catch (error) {
      console.error('Failed to get tasks:', error);
      return [];
    }
  }

  /**
   * Updates an existing task in the database.
   *
   * @param task - The task with updated values
   * @throws Error if storage quota is exceeded
   */
  async updateTask(task: Task): Promise<void> {
    try {
      const db = await this.dbPromise;
      await db.put('tasks', task);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error(strings.errors.storageQuotaExceeded);
      }
      throw error;
    }
  }

  /**
   * Deletes a task from the database.
   *
   * @param taskId - ID of the task to delete
   * @throws Error on deletion failure
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      const db = await this.dbPromise;
      await db.delete('tasks', taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }

  /**
   * Adds a new schedule block to the database.
   *
   * @param block - The schedule block to add
   * @throws Error if storage quota is exceeded
   */
  async addScheduleBlock(block: ScheduleBlock): Promise<void> {
    try {
      const db = await this.dbPromise;
      await db.add('scheduleBlocks', block);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error(strings.errors.storageQuotaExceeded);
      }
      throw error;
    }
  }

  /**
   * Retrieves all schedule blocks for a specific date.
   *
   * @param date - The date to filter by
   * @returns Array of schedule blocks for the date, or empty array on error
   */
  async getScheduleBlocks(date: Date): Promise<ScheduleBlock[]> {
    try {
      const db = await this.dbPromise;
      const allBlocks = await db.getAll('scheduleBlocks');
      const dateKey = getDateKey(date);

      // Filter blocks for the specified date
      return allBlocks.filter((block) => {
        const blockDateKey = getDateKey(new Date(block.startTime));
        return blockDateKey === dateKey;
      });
    } catch (error) {
      console.error('Failed to get schedule blocks:', error);
      return [];
    }
  }

  /**
   * Updates an existing schedule block in the database.
   *
   * @param block - The schedule block with updated values
   * @throws Error if storage quota is exceeded
   */
  async updateScheduleBlock(block: ScheduleBlock): Promise<void> {
    try {
      const db = await this.dbPromise;
      await db.put('scheduleBlocks', block);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error(strings.errors.storageQuotaExceeded);
      }
      throw error;
    }
  }

  /**
   * Clears all schedule blocks for a specific date.
   *
   * @param date - The date to clear blocks for
   * @throws Error on deletion failure
   */
  async clearScheduleBlocks(date: Date): Promise<void> {
    try {
      const db = await this.dbPromise;
      const blocksToDelete = await this.getScheduleBlocks(date);

      for (const block of blocksToDelete) {
        await db.delete('scheduleBlocks', block.id);
      }
    } catch (error) {
      console.error('Failed to clear schedule blocks:', error);
      throw error;
    }
  }

  /**
   * Adds a new session to the database.
   *
   * @param session - The session to add
   * @throws Error if storage quota is exceeded
   */
  async addSession(session: Session): Promise<void> {
    try {
      const db = await this.dbPromise;
      await db.add('sessions', session);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error(strings.errors.storageQuotaExceeded);
      }
      throw error;
    }
  }

  /**
   * Retrieves a specific session by ID.
   *
   * @param sessionId - ID of the session to retrieve
   * @returns The session, or null if not found or on error
   */
  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const db = await this.dbPromise;
      const session = await db.get('sessions', sessionId);
      return session || null;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Updates an existing session in the database.
   *
   * @param session - The session with updated values
   * @throws Error if storage quota is exceeded
   */
  async updateSession(session: Session): Promise<void> {
    try {
      const db = await this.dbPromise;
      await db.put('sessions', session);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error(strings.errors.storageQuotaExceeded);
      }
      throw error;
    }
  }

  /**
   * Retrieves all active or paused sessions.
   *
   * @returns Array of sessions with status 'active' or 'paused', or empty array on error
   */
  async getActiveSessions(): Promise<Session[]> {
    try {
      const db = await this.dbPromise;
      const allSessions = await db.getAll('sessions');
      return allSessions.filter(
        (session) => session.status === 'active' || session.status === 'paused'
      );
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      return [];
    }
  }

  /**
   * Adds a new analytics event to the database.
   *
   * @param event - The analytics event to add
   * @throws Error if storage quota is exceeded
   */
  async addAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const db = await this.dbPromise;
      await db.add('analyticsEvents', event);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error(strings.errors.storageQuotaExceeded);
      }
      throw error;
    }
  }

  /**
   * Retrieves analytics events within a date range.
   *
   * @param startDate - Start of the date range (inclusive)
   * @param endDate - End of the date range (inclusive)
   * @returns Array of analytics events in the range, or empty array on error
   */
  async getAnalyticsEvents(
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsEvent[]> {
    try {
      const db = await this.dbPromise;
      const allEvents = await db.getAll('analyticsEvents');

      // Filter events within the date range
      return allEvents.filter((event) => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= startDate && eventDate <= endDate;
      });
    } catch (error) {
      console.error('Failed to get analytics events:', error);
      return [];
    }
  }
}

/**
 * Singleton instance of the IndexedDB database.
 *
 * Use this for all database operations throughout the application.
 *
 * @example
 * ```typescript
 * import { database } from './lib/database';
 * await database.addTask(task);
 * const tasks = await database.getTasks();
 * ```
 */
export const database = new IndexedDBDatabase();
