import { useState, useEffect } from 'react';
import type { Session, Task, TimerManager } from '../lib/types';
import { strings } from '../lib/strings';

/**
 * Props for the TimerPanel component.
 */
interface TimerPanelProps {
  /** Timer manager instance for session control */
  timerManager: TimerManager;
  /** Array of tasks for looking up task details */
  tasks: Task[];
  /** Optional callback invoked when session state changes */
  onSessionUpdate?: () => Promise<void>;
}

/**
 * Timer panel component for active timebox sessions.
 *
 * Displays the current task name, elapsed time (updating every second), and
 * control buttons for pause/resume and finish. Shows an empty state when no
 * session is active.
 *
 * @example
 * ```tsx
 * <TimerPanel
 *   timerManager={timerManager}
 *   tasks={tasks}
 *   onSessionUpdate={async () => await saveState()}
 * />
 * ```
 */
export function TimerPanel({
  timerManager,
  tasks,
  onSessionUpdate,
}: TimerPanelProps) {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);

  // Create a map of task IDs to tasks for quick lookup
  const taskMap = new Map(tasks.map((task) => [task.id, task]));

  // Update current session and elapsed time
  useEffect(() => {
    const updateSession = () => {
      const session = timerManager.getActiveSession();

      // If there's an active session, use it
      if (session) {
        setCurrentSession(session);
        const elapsed = timerManager.getElapsedMinutes(session.id);
        setElapsedMinutes(elapsed);
      } else {
        // No active session - check if we have a paused session stored
        setCurrentSession((prev) => {
          if (prev && prev.status === 'paused') {
            // Keep the paused session and update elapsed time
            try {
              const elapsed = timerManager.getElapsedMinutes(prev.id);
              setElapsedMinutes(elapsed);
              return prev;
            } catch {
              // Session no longer exists
              setElapsedMinutes(0);
              return null;
            }
          }
          // No session at all
          setElapsedMinutes(0);
          return null;
        });
      }
    };

    // Initial update
    updateSession();

    // Update every second
    const interval = setInterval(() => {
      updateSession();
    }, 1000);

    return () => clearInterval(interval);
  }, [timerManager]);

  // Separate effect to restore paused sessions from storage on mount
  useEffect(() => {
    // This effect runs once on mount to check for paused sessions
    // that need to be restored (since getActiveSession only returns active sessions)
    const restorePausedSession = async () => {
      const activeSession = timerManager.getActiveSession();
      if (!activeSession) {
        // Check if there's a paused session we need to restore
        // This will be handled by the parent component passing the session
        // through the timerManager's restoreSession method
      }
    };

    restorePausedSession();
  }, [timerManager]);

  // Format elapsed time as MM:SS
  const formatTime = (minutes: number): string => {
    const totalSeconds = Math.floor(minutes * 60);
    const displayMinutes = Math.floor(totalSeconds / 60);
    const displaySeconds = totalSeconds % 60;
    return `${displayMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
  };

  const handlePauseResume = async () => {
    if (!currentSession) return;

    try {
      if (currentSession.status === 'active') {
        const pausedSession = timerManager.pauseSession(currentSession.id);
        setCurrentSession(pausedSession);
      } else if (currentSession.status === 'paused') {
        timerManager.resumeSession(currentSession.id);
        // After resume, get the active session
        const resumedSession = timerManager.getActiveSession();
        setCurrentSession(resumedSession);
      }

      // Notify parent component
      if (onSessionUpdate) {
        await onSessionUpdate();
      }
    } catch (error) {
      console.error('Error pausing/resuming session:', error);
    }
  };

  const handleFinish = async () => {
    if (!currentSession) return;

    try {
      timerManager.finishSession(currentSession.id);

      // Clear the session state
      setCurrentSession(null);
      setElapsedMinutes(0);

      // Notify parent component
      if (onSessionUpdate) {
        await onSessionUpdate();
      }
    } catch (error) {
      console.error('Error finishing session:', error);
    }
  };

  // If no current session, show empty state
  if (!currentSession) {
    return (
      <div className="w-full max-w-2xl p-8 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center text-gray-500">
          {strings.timerPanel.emptyState}
        </div>
      </div>
    );
  }

  const task = taskMap.get(currentSession.taskId);
  const taskName = task?.name || 'Unknown Task';
  const isPaused = currentSession.status === 'paused';

  return (
    <div className="w-full max-w-2xl p-6 bg-white rounded-lg border border-gray-300 shadow-sm">
      <div className="space-y-4">
        {/* Task name */}
        <div>
          <div className="text-sm text-gray-600 mb-1">
            {strings.timerPanel.currentTaskLabel}
          </div>
          <div
            className="text-2xl font-semibold text-gray-900"
            data-testid="task-name"
          >
            {taskName}
          </div>
        </div>

        {/* Elapsed time */}
        <div>
          <div className="text-sm text-gray-600 mb-1">
            {strings.timerPanel.elapsedTimeLabel}
          </div>
          <div
            className="text-4xl font-mono font-bold text-blue-600"
            data-testid="elapsed-time"
          >
            {formatTime(elapsedMinutes)}
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handlePauseResume}
            className={`flex-1 px-6 py-3 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${
              isPaused
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 text-white'
            }`}
            data-testid="pause-resume-button"
            aria-label={
              isPaused
                ? strings.timerPanel.ariaResume
                : strings.timerPanel.ariaPause
            }
          >
            {isPaused
              ? strings.timerPanel.buttonResume
              : strings.timerPanel.buttonPause}
          </button>
          <button
            onClick={handleFinish}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
            data-testid="finish-button"
            aria-label={strings.timerPanel.ariaFinish}
          >
            {strings.timerPanel.buttonFinish}
          </button>
        </div>

        {/* Status indicator */}
        {isPaused && (
          <div className="text-center text-sm text-yellow-700 bg-yellow-50 py-2 px-4 rounded">
            {strings.timerPanel.statusPaused}
          </div>
        )}
      </div>
    </div>
  );
}
