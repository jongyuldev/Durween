import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultTimerManager } from './timerManager';

describe('Timer Manager Unit Tests', () => {
  let timerManager: DeltTimerManager;

  beforeEach(() => {
    timerManager = new DefaultTimerManager();
  });

  describe('Invalid state transitions', () => {
    it('should throw error when starting a session while another is active', () => {
      timerManager.startSession('task1', 'block1');

      expect(() => timerManager.startSession('task2', 'block2')).toThrow(
        'Cannot start session: another session is already active'
      );
    });

    it('should throw error when pausing a session that is not active', () => {
      const session = timerManager.startSession('task1', 'block1');
      timerManager.pauseSession(session.id);

      expect(() => timerManager.pauseSession(session.id)).toThrow(
        'Cannot pause session in paused state'
      );
    });

    it('should throw error when pausing a completed session', () => {
      const session = timerManager.startSession('task1', 'block1');
      timerManager.finishSession(session.id);

      expect(() => timerManager.pauseSession(session.id)).toThrow(
        'Cannot pause session in completed state'
      );
    });

    it('should throw error when resuming a session that is not paused', () => {
      const session = timerManager.startSession('task1', 'block1');

      expect(() => timerManager.resumeSession(session.id)).toThrow(
        'Cannot resume session in active state'
      );
    });

    it('should throw error when resuming a completed session', () => {
      const session = timerManager.startSession('task1', 'block1');
      timerManager.finishSession(session.id);

      expect(() => timerManager.resumeSession(session.id)).toThrow(
        'Cannot resume session in completed state'
      );
    });

    it('should throw error when resuming while another session is active', () => {
      const session1 = timerManager.startSession('task1', 'block1');
      timerManager.pauseSession(session1.id);

      const session2 = timerManager.startSession('task2', 'block2');

      expect(() => timerManager.resumeSession(session1.id)).toThrow(
        'Cannot resume session: another session is already active'
      );
    });

    it('should throw error when finishing an already completed session', () => {
      const session = timerManager.startSession('task1', 'block1');
      timerManager.finishSession(session.id);

      expect(() => timerManager.finishSession(session.id)).toThrow(
        'Cannot finish session in completed state'
      );
    });
  });

  describe('Session not found errors', () => {
    it('should throw error when pausing non-existent session', () => {
      expect(() => timerManager.pauseSession('non-existent-id')).toThrow(
        'Session not found'
      );
    });

    it('should throw error when resuming non-existent session', () => {
      expect(() => timerManager.resumeSession('non-existent-id')).toThrow(
        'Session not found'
      );
    });

    it('should throw error when finishing non-existent session', () => {
      expect(() => timerManager.finishSession('non-existent-id')).toThrow(
        'Session not found'
      );
    });

    it('should throw error when getting elapsed minutes for non-existent session', () => {
      expect(() => timerManager.getElapsedMinutes('non-existent-id')).toThrow(
        'Session not found'
      );
    });
  });

  describe('Time accumulation across pause/resume cycles', () => {
    it('should accumulate time correctly across single pause/resume cycle', async () => {
      const session = timerManager.startSession('task1', 'block1');

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const pausedSession = timerManager.pauseSession(session.id);
      const accumulatedAfterPause = pausedSession.accumulatedMinutes;

      // Accumulated time should be greater than 0
      expect(accumulatedAfterPause).toBeGreaterThan(0);

      // Wait a bit while paused (time should not accumulate)
      await new Promise((resolve) => setTimeout(resolve, 50));

      const resumedSession = timerManager.resumeSession(session.id);

      // Accumulated time should remain the same after resume
      expect(resumedSession.accumulatedMinutes).toBe(accumulatedAfterPause);

      // Wait a bit more
      await new Promise((resolve) => setTimeout(resolve, 100));

      const finishedSession = timerManager.finishSession(session.id);

      // Final accumulated time should be greater than after pause
      expect(finishedSession.accumulatedMinutes).toBeGreaterThan(
        accumulatedAfterPause
      );
    });

    it('should accumulate time correctly across multiple pause/resume cycles', async () => {
      const session = timerManager.startSession('task1', 'block1');
      let previousAccumulated = 0;

      // Cycle 1
      await new Promise((resolve) => setTimeout(resolve, 50));
      let pausedSession = timerManager.pauseSession(session.id);
      expect(pausedSession.accumulatedMinutes).toBeGreaterThan(
        previousAccumulated
      );
      previousAccumulated = pausedSession.accumulatedMinutes;

      // Cycle 2
      timerManager.resumeSession(session.id);
      await new Promise((resolve) => setTimeout(resolve, 50));
      pausedSession = timerManager.pauseSession(session.id);
      expect(pausedSession.accumulatedMinutes).toBeGreaterThan(
        previousAccumulated
      );
      previousAccumulated = pausedSession.accumulatedMinutes;

      // Cycle 3
      timerManager.resumeSession(session.id);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const finishedSession = timerManager.finishSession(session.id);
      expect(finishedSession.accumulatedMinutes).toBeGreaterThan(
        previousAccumulated
      );
    });

    it('should not accumulate time while paused', async () => {
      const session = timerManager.startSession('task1', 'block1');

      await new Promise((resolve) => setTimeout(resolve, 50));
      const pausedSession = timerManager.pauseSession(session.id);
      const accumulatedAfterPause = pausedSession.accumulatedMinutes;

      // Wait while paused
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get elapsed time while paused
      const elapsedWhilePaused = timerManager.getElapsedMinutes(session.id);

      // Should be the same as accumulated time (no additional time)
      expect(Math.abs(elapsedWhilePaused - accumulatedAfterPause)).toBeLessThan(
        0.001
      );
    });

    it('should finish from paused state without adding time', async () => {
      const session = timerManager.startSession('task1', 'block1');

      await new Promise((resolve) => setTimeout(resolve, 50));
      const pausedSession = timerManager.pauseSession(session.id);
      const accumulatedAfterPause = pausedSession.accumulatedMinutes;

      // Wait while paused
      await new Promise((resolve) => setTimeout(resolve, 50));

      const finishedSession = timerManager.finishSession(session.id);

      // Accumulated time should be the same as when paused
      expect(finishedSession.accumulatedMinutes).toBe(accumulatedAfterPause);
    });
  });

  describe('getActiveSession', () => {
    it('should return null when no session is active', () => {
      expect(timerManager.getActiveSession()).toBeNull();
    });

    it('should return the active session', () => {
      const session = timerManager.startSession('task1', 'block1');
      const activeSession = timerManager.getActiveSession();

      expect(activeSession).not.toBeNull();
      expect(activeSession?.id).toBe(session.id);
      expect(activeSession?.status).toBe('active');
    });

    it('should return paused session after pausing', () => {
      const session = timerManager.startSession('task1', 'block1');
      timerManager.pauseSession(session.id);

      const pausedSession = timerManager.getActiveSession();
      expect(pausedSession).not.toBeNull();
      expect(pausedSession?.id).toBe(session.id);
      expect(pausedSession?.status).toBe('paused');
    });

    it('should return the session after resuming', () => {
      const session = timerManager.startSession('task1', 'block1');
      timerManager.pauseSession(session.id);
      timerManager.resumeSession(session.id);

      const activeSession = timerManager.getActiveSession();
      expect(activeSession).not.toBeNull();
      expect(activeSession?.id).toBe(session.id);
    });

    it('should return null after finishing', () => {
      const session = timerManager.startSession('task1', 'block1');
      timerManager.finishSession(session.id);

      expect(timerManager.getActiveSession()).toBeNull();
    });
  });

  describe('getElapsedMinutes', () => {
    it('should return 0 for newly started session', () => {
      const session = timerManager.startSession('task1', 'block1');
      const elapsed = timerManager.getElapsedMinutes(session.id);

      // Should be very close to 0 (allowing for tiny execution time)
      expect(elapsed).toBeLessThan(0.01);
    });

    it('should return accumulated time for paused session', async () => {
      const session = timerManager.startSession('task1', 'block1');

      await new Promise((resolve) => setTimeout(resolve, 50));
      const pausedSession = timerManager.pauseSession(session.id);

      const elapsed = timerManager.getElapsedMinutes(session.id);

      // Should match accumulated time
      expect(Math.abs(elapsed - pausedSession.accumulatedMinutes)).toBeLessThan(
        0.001
      );
    });

    it('should return accumulated time for completed session', async () => {
      const session = timerManager.startSession('task1', 'block1');

      await new Promise((resolve) => setTimeout(resolve, 50));
      const finishedSession = timerManager.finishSession(session.id);

      const elapsed = timerManager.getElapsedMinutes(session.id);

      // Should match accumulated time
      expect(
        Math.abs(elapsed - finishedSession.accumulatedMinutes)
      ).toBeLessThan(0.001);
    });

    it('should include current active time for active session', async () => {
      const session = timerManager.startSession('task1', 'block1');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const elapsed = timerManager.getElapsedMinutes(session.id);

      // Should be greater than 0
      expect(elapsed).toBeGreaterThan(0);
    });
  });

  describe('Session data integrity', () => {
    it('should preserve taskId and scheduleBlockId throughout lifecycle', () => {
      const taskId = 'test-task-123';
      const scheduleBlockId = 'test-block-456';

      const session = timerManager.startSession(taskId, scheduleBlockId);
      expect(session.taskId).toBe(taskId);
      expect(session.scheduleBlockId).toBe(scheduleBlockId);

      const pausedSession = timerManager.pauseSession(session.id);
      expect(pausedSession.taskId).toBe(taskId);
      expect(pausedSession.scheduleBlockId).toBe(scheduleBlockId);

      const resumedSession = timerManager.resumeSession(session.id);
      expect(resumedSession.taskId).toBe(taskId);
      expect(resumedSession.scheduleBlockId).toBe(scheduleBlockId);

      const finishedSession = timerManager.finishSession(session.id);
      expect(finishedSession.taskId).toBe(taskId);
      expect(finishedSession.scheduleBlockId).toBe(scheduleBlockId);
    });

    it('should set timestamps correctly', async () => {
      const beforeStart = new Date();
      const session = timerManager.startSession('task1', 'block1');
      const afterStart = new Date();

      expect(session.startTime.getTime()).toBeGreaterThanOrEqual(
        beforeStart.getTime()
      );
      expect(session.startTime.getTime()).toBeLessThanOrEqual(
        afterStart.getTime()
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const beforePause = new Date();
      const pausedSession = timerManager.pauseSession(session.id);
      const afterPause = new Date();

      expect(pausedSession.pausedAt).toBeDefined();
      expect(pausedSession.pausedAt!.getTime()).toBeGreaterThanOrEqual(
        beforePause.getTime()
      );
      expect(pausedSession.pausedAt!.getTime()).toBeLessThanOrEqual(
        afterPause.getTime()
      );

      const beforeResume = new Date();
      const resumedSession = timerManager.resumeSession(session.id);
      const afterResume = new Date();

      expect(resumedSession.resumedAt).toBeDefined();
      expect(resumedSession.resumedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeResume.getTime()
      );
      expect(resumedSession.resumedAt!.getTime()).toBeLessThanOrEqual(
        afterResume.getTime()
      );

      const beforeFinish = new Date();
      const finishedSession = timerManager.finishSession(session.id);
      const afterFinish = new Date();

      expect(finishedSession.completedAt).toBeDefined();
      expect(finishedSession.completedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeFinish.getTime()
      );
      expect(finishedSession.completedAt!.getTime()).toBeLessThanOrEqual(
        afterFinish.getTime()
      );
    });
  });
});
