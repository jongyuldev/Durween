import type { Session, TimerManager } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Timer manager implementation that handles session lifecycle.
 *
 * Implements a state machine for session management:
 * - idle → active (start)
 * - active → paused (pause)
 * - paused → active (resume)
 * - active/paused → completed (finish)
 *
 * Only one session can be active at a time. Accumulated time is preserved
 * across pause/resume cycles and persists across page reloads.
 *
 * @example
 * ```typescript
 * const timerManager = new DefaultTimerManager();
 * const session = timerManager.startSession(taskId, blockId);
 * timerManager.pauseSession(session.id);
 * timerManager.resumeSession(session.id);
 * timerManager.finishSession(session.id);
 * ```
 */
export class DefaultTimerManager implements TimerManager {
  private sessions: Map<string, Session> = new Map();
  private activeSessionId: string | null = null;

  /**
   * Restores a session from storage (used on page load).
   *
   * This method is called during application initialization to restore
   * sessions that were active or paused when the page was last closed.
   *
   * @param session - The session to restore
   */
  restoreSession(session: Session): void {
    this.sessions.set(session.id, session);

    // If the session is active, set it as the active session
    if (session.status === 'active') {
      this.activeSessionId = session.id;
    }
  }

  /**
   * Starts a new timebox session for a task.
   *
   * @param taskId - ID of the task to track
   * @param scheduleBlockId - ID of the schedule block being worked on
   * @returns The newly created session
   * @throws Error if another session is already active
   *
   * @remarks
   * Only one session can be active at a time. Pause or finish the current
   * session before starting a new one.
   */
  startSession(taskId: string, scheduleBlockId: string): Session {
    // Only one session can be active at a time
    if (this.activeSessionId !== null) {
      throw new Error(
        'Cannot start session: another session is already active'
      );
    }

    const session: Session = {
      id: uuidv4(),
      taskId,
      scheduleBlockId,
      startTime: new Date(),
      accumulatedMinutes: 0,
      status: 'active',
    };

    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;

    return session;
  }

  /**
   * Pauses an active session, preserving accumulated time.
   *
   * @param sessionId - ID of the session to pause
   * @returns The updated session with paused status
   * @throws Error if session not found or not in active state
   *
   * @remarks
   * Calculates elapsed time since start or last resume and adds it to
   * accumulated time. The session can be resumed later to continue tracking.
   */
  pauseSession(sessionId: string): Session {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error(`Cannot pause session in ${session.status} state`);
    }

    // Calculate elapsed time since start or last resume
    const now = new Date();
    const referenceTime = session.resumedAt || session.startTime;
    const elapsedMinutes =
      (now.getTime() - referenceTime.getTime()) / (1000 * 60);

    // Update session
    session.pausedAt = now;
    session.accumulatedMinutes += elapsedMinutes;
    session.status = 'paused';

    this.sessions.set(sessionId, session);
    this.activeSessionId = null;

    return session;
  }

  /**
   * Resumes a paused session, continuing time tracking.
   *
   * @param sessionId - ID of the session to resume
   * @returns The updated session with active status
   * @throws Error if session not found, not in paused state, or another session is active
   *
   * @remarks
   * Sets a new resume timestamp and continues tracking from the previously
   * accumulated time. Only one session can be active at a time.
   */
  resumeSession(sessionId: string): Session {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'paused') {
      throw new Error(`Cannot resume session in ${session.status} state`);
    }

    // Only one session can be active at a time
    if (this.activeSessionId !== null) {
      throw new Error(
        'Cannot resume session: another session is already active'
      );
    }

    // Update session
    session.resumedAt = new Date();
    session.status = 'active';

    this.sessions.set(sessionId, session);
    this.activeSessionId = sessionId;

    return session;
  }

  /**
   * Finishes a session, marking the task as complete.
   *
   * @param sessionId - ID of the session to finish
   * @returns The updated session with completed status
   * @throws Error if session not found or already completed
   *
   * @remarks
   * If the session is active, calculates final elapsed time and adds it to
   * accumulated time. Sets completion timestamp and clears active session.
   */
  finishSession(sessionId: string): Session {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'completed') {
      throw new Error('Cannot finish session in completed state');
    }

    const now = new Date();

    // If session is active, calculate final elapsed time
    if (session.status === 'active') {
      const referenceTime = session.resumedAt || session.startTime;
      const elapsedMinutes =
        (now.getTime() - referenceTime.getTime()) / (1000 * 60);
      session.accumulatedMinutes += elapsedMinutes;
    }

    // Update session
    session.completedAt = now;
    session.status = 'completed';

    this.sessions.set(sessionId, session);

    // Clear active session if this was it
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }

    return session;
  }

  /**
   * Gets the currently active or paused session.
   *
   * @returns The active session, or a paused session if no active session exists, or null
   *
   * @remarks
   * Prioritizes active sessions over paused sessions. Returns null if no
   * sessions are in progress.
   */
  getActiveSession(): Session | null {
    if (this.activeSessionId === null) {
      // Check if there's a paused session
      for (const session of this.sessions.values()) {
        if (session.status === 'paused') {
          return session;
        }
      }
      return null;
    }

    return this.sessions.get(this.activeSessionId) || null;
  }

  /**
   * Calculates the total elapsed time for a session.
   *
   * @param sessionId - ID of the session
   * @returns Total elapsed time in minutes (including accumulated time)
   * @throws Error if session not found
   *
   * @remarks
   * For active sessions, includes time since last start/resume.
   * For paused/completed sessions, returns accumulated time only.
   */
  getElapsedMinutes(sessionId: string): number {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    let totalMinutes = session.accumulatedMinutes;

    // If session is currently active, add time since last start/resume
    if (session.status === 'active') {
      const now = new Date();
      const referenceTime = session.resumedAt || session.startTime;
      const currentElapsed =
        (now.getTime() - referenceTime.getTime()) / (1000 * 60);
      totalMinutes += currentElapsed;
    }

    return totalMinutes;
  }
}

/**
 * Factory function to create a timer manager instance.
 *
 * @returns A new DefaultTimerManager instance
 *
 * @example
 * ```typescript
 * import { createTimerManager } from './lib/timerManager';
 * const timerManager = createTimerManager();
 * ```
 */
export function createTimerManager(): TimerManager {
  return new DefaultTimerManager();
}
