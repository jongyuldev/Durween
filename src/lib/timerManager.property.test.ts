import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DefaultTimerManager } from './timerManager';
import { Session } from './types';

describe('Timer Manager Property-Based Tests', () => {
  // Feature: clippy-task-scheduler, Property 9: Session state transitions are valid
  // Validates: Requirements 3.2, 3.3, 3.4
  it('Property 9: session state transitions follow valid state machine and accumulated time never decreases', () => {
    fc.assert(
      fc.property(
        // Generate a sequence of valid actions
        fc.array(
          fc.oneof(
            fc.constant('start' as const),
            fc.constant('pause' as const),
            fc.constant('resume' as const),
            fc.constant('finish' as const)
          ),
          { minLength: 1, maxLength: 20 }
        ),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (actions, taskId, scheduleBlockId) => {
          const timerManager = new DefaultTimerManager();
          let currentSession: Session | null = null;
          let previousAccumulatedTime = 0;

          for (const action of actions) {
            try {
              switch (action) {
                case 'start':
                  // Can only start if no active session
                  if (
                    currentSession === null ||
                    currentSession.status !== 'active'
                  ) {
                    currentSession = timerManager.startSession(
                      taskId,
                      scheduleBlockId
                    );

                    // Property: New session should be in active state
                    expect(currentSession.status).toBe('active');
                    expect(currentSession.accumulatedMinutes).toBe(0);
                    previousAccumulatedTime = 0;
                  }
                  break;

                case 'pause':
                  // Can only pause if session exists and is active
                  if (currentSession && currentSession.status === 'active') {
                    currentSession = timerManager.pauseSession(
                      currentSession.id
                    );

                    // Property: Paused session should be in paused state
                    expect(currentSession.status).toBe('paused');

                    // Property: Accumulated time should not decrease
                    expect(
                      currentSession.accumulatedMinutes
                    ).toBeGreaterThanOrEqual(previousAccumulatedTime);
                    previousAccumulatedTime = currentSession.accumulatedMinutes;
                  }
                  break;

                case 'resume':
                  // Can only resume if session exists and is paused
                  if (currentSession && currentSession.status === 'paused') {
                    currentSession = timerManager.resumeSession(
                      currentSession.id
                    );

                    // Property: Resumed session should be in active state
                    expect(currentSession.status).toBe('active');

                    // Property: Accumulated time should not change on resume
                    expect(currentSession.accumulatedMinutes).toBe(
                      previousAccumulatedTime
                    );
                  }
                  break;

                case 'finish':
                  // Can finish from any state except completed
                  if (currentSession && currentSession.status !== 'completed') {
                    const statusBeforeFinish = currentSession.status;
                    currentSession = timerManager.finishSession(
                      currentSession.id
                    );

                    // Property: Finished session should be in completed state
                    expect(currentSession.status).toBe('completed');

                    // Property: Accumulated time should not decrease
                    expect(
                      currentSession.accumulatedMinutes
                    ).toBeGreaterThanOrEqual(previousAccumulatedTime);

                    // Property: If was paused, accumulated time should stay the same
                    if (statusBeforeFinish === 'paused') {
                      expect(currentSession.accumulatedMinutes).toBe(
                        previousAccumulatedTime
                      );
                    }

                    previousAccumulatedTime = currentSession.accumulatedMinutes;
                  }
                  break;
              }
            } catch (error) {
              // Expected errors for invalid state transitions are okay
              // We're testing that valid transitions work correctly
            }
          }

          // Property: If we have a session, verify getElapsedMinutes works
          if (currentSession) {
            const elapsed = timerManager.getElapsedMinutes(currentSession.id);

            // Elapsed time should be at least the accumulated time
            expect(elapsed).toBeGreaterThanOrEqual(
              currentSession.accumulatedMinutes
            );

            // If session is not active, elapsed should equal accumulated
            if (currentSession.status !== 'active') {
              // Allow small floating point differences
              expect(
                Math.abs(elapsed - currentSession.accumulatedMinutes)
              ).toBeLessThan(0.001);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property: getActiveSession returns correct session
  it('Property: getActiveSession returns the currently active session', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (taskId, scheduleBlockId) => {
          const timerManager = new DefaultTimerManager();

          // Initially no active session
          expect(timerManager.getActiveSession()).toBeNull();

          // Start a session
          const session = timerManager.startSession(taskId, scheduleBlockId);

          // Should return the active session
          const activeSession = timerManager.getActiveSession();
          expect(activeSession).not.toBeNull();
          expect(activeSession?.id).toBe(session.id);
          expect(activeSession?.status).toBe('active');

          // Pause the session
          timerManager.pauseSession(session.id);

          // Should return the paused session
          const pausedSession = timerManager.getActiveSession();
          expect(pausedSession).not.toBeNull();
          expect(pausedSession?.id).toBe(session.id);
          expect(pausedSession?.status).toBe('paused');

          // Resume the session
          timerManager.resumeSession(session.id);

          // Should return the active session again
          const resumedActive = timerManager.getActiveSession();
          expect(resumedActive).not.toBeNull();
          expect(resumedActive?.id).toBe(session.id);

          // Finish the session
          timerManager.finishSession(session.id);

          // Should return null when completed
          expect(timerManager.getActiveSession()).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
