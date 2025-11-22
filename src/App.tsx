import { useState, useEffect } from 'react';
import { TaskInput } from './components/TaskInput';
import { ScheduleView } from './components/ScheduleView';
import { TimerPanel } from './components/TimerPanel';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { database } from './lib/database';
import { createScheduler } from './lib/scheduler';
import { createTimerManager } from './lib/timerManager';
import { recordEvent } from './lib/analytics';
import { createNotificationService } from './lib/notifications';
import type { Task, ScheduleBlock, WorkHours } from './lib/types';
import { strings, formatString } from './lib/strings';
import './App.css';

// Default work hours: 9 AM to 5 PM
const DEFAULT_WORK_HOURS: WorkHours = {
  startHour: 9,
  startMinute: 0,
  endHour: 17,
  endMinute: 0,
};

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Create singleton instances
  const [scheduler] = useState(() => createScheduler());
  const [timerManager] = useState(() => createTimerManager());
  const [notificationService] = useState(() => createNotificationService());

  /**
   * Load initial state from storage on mount.
   *
   * This effect runs once when the app loads and:
   * 1. Loads all tasks, schedule blocks, and active sessions from IndexedDB
   * 2. Restores any active or paused sessions in the timer manager
   * 3. Checks if restored sessions have overrun their allocated time
   * 4. Sends overrun notifications if necessary
   */
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        setIsLoading(true);

        // Load tasks, schedule blocks, and active sessions from storage
        const [loadedTasks, loadedBlocks, activeSessions] = await Promise.all([
          database.getTasks(),
          database.getScheduleBlocks(new Date()),
          database.getActiveSessions(),
        ]);

        setTasks(loadedTasks);
        setScheduleBlocks(loadedBlocks);

        // Restore active or paused sessions
        if (activeSessions.length > 0) {
          // Restore the first active/paused session (should only be one)
          const sessionToRestore = activeSessions[0];

          // Restore session in timer manager so it can continue tracking time
          if (timerManager.restoreSession) {
            timerManager.restoreSession(sessionToRestore);
          }

          // Check if session has overrun its allocated time while page was closed
          const task = loadedTasks.find(
            (t) => t.id === sessionToRestore.taskId
          );
          if (task && sessionToRestore.status === 'active') {
            // Calculate total elapsed time including time since last start/resume
            const now = new Date();
            const referenceTime =
              sessionToRestore.resumedAt || sessionToRestore.startTime;
            const elapsedMinutes =
              sessionToRestore.accumulatedMinutes +
              (now.getTime() - new Date(referenceTime).getTime()) / (1000 * 60);

            // If elapsed time exceeds allocated duration, send overrun notification
            if (elapsedMinutes > task.durationMinutes) {
              await notificationService.sendNotification({
                type: 'session_overrun',
                taskName: task.name,
                duration: task.durationMinutes,
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load initial state:', err);
        setError(strings.errors.loadFailed);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialState();
  }, [timerManager, notificationService]);

  // Handle task added from TaskInput
  const handleTaskAdded = async (newTasks: Task[]) => {
    // Update local state
    setTasks((prev) => [...prev, ...newTasks]);
  };

  // Generate schedule from current tasks
  const handleGenerateSchedule = async () => {
    try {
      setError('');

      // Get incomplete tasks
      const incompleteTasks = tasks.filter((task) => !task.completed);

      if (incompleteTasks.length === 0) {
        setError(strings.errors.scheduleNoTasks);
        return;
      }

      // Clear existing schedule blocks for today
      await database.clearScheduleBlocks(new Date());

      // Generate new schedule
      const result = scheduler.generateSchedule({
        tasks: incompleteTasks,
        workHours: DEFAULT_WORK_HOURS,
        fixedEvents: [], // No fixed events for MVP
        scheduleDate: new Date(),
      });

      // Save schedule blocks to storage
      for (const block of result.scheduledBlocks) {
        await database.addScheduleBlock(block);
      }

      // Update local state
      setScheduleBlocks(result.scheduledBlocks);

      // Record analytics event
      await recordEvent(database, 'schedule_generated', {
        taskCount: incompleteTasks.length,
        scheduledCount: result.scheduledBlocks.length,
        unscheduledCount: result.unscheduledTasks.length,
      });

      // Show warning if some tasks couldn't be scheduled
      if (result.unscheduledTasks.length > 0) {
        setError(
          formatString(strings.warnings.unscheduledTasks, {
            count: result.unscheduledTasks.length,
          })
        );
      }
    } catch (err) {
      console.error('Failed to generate schedule:', err);
      setError(
        err instanceof Error
          ? err.message
          : strings.errors.scheduleGenerateFailed
      );
    }
  };

  // Handle starting a session from ScheduleView
  const handleStartSession = async (blockId: string, taskId: string) => {
    try {
      setError('');

      // Start the session
      const session = timerManager.startSession(taskId, blockId);

      // Save session to storage
      await database.addSession(session);

      // Update schedule block status to in-progress
      const block = scheduleBlocks.find((b) => b.id === blockId);
      if (block) {
        block.status = 'in-progress';
        await database.updateScheduleBlock(block);
        setScheduleBlocks([...scheduleBlocks]);
      }

      // Record analytics event
      await recordEvent(database, 'timebox_started', {
        taskId,
        sessionId: session.id,
      });
    } catch (err) {
      console.error('Failed to start session:', err);
      setError(
        err instanceof Error ? err.message : strings.errors.sessionStartFailed
      );
    }
  };

  /**
   * Handles session updates from TimerPanel (pause, resume, finish).
   *
   * This function is called whenever the session state changes and:
   * 1. Persists the updated session to storage
   * 2. Detects when a session is finished (no active sessions remain)
   * 3. Marks the corresponding schedule block and task as completed
   * 4. Records analytics events for task completion
   * 5. Reloads state to reflect changes in the UI
   */
  const handleSessionUpdate = async () => {
    try {
      // Get the current active session
      const activeSession = timerManager.getActiveSession();

      // If there's an active session, persist it
      if (activeSession) {
        await database.updateSession(activeSession);
      } else {
        // Session might have been completed, check for completed sessions
        // and update the corresponding task and schedule block
        const activeSessions = await database.getActiveSessions();

        // If no active sessions, check if we need to mark anything as completed
        if (activeSessions.length === 0) {
          // Find any schedule blocks that are still marked as in-progress
          // These need to be marked as completed since the session ended
          const blocks = await database.getScheduleBlocks(new Date());
          const completedBlocks = blocks.filter(
            (b) => b.status === 'in-progress'
          );

          // This means a session was just finished
          if (completedBlocks.length > 0) {
            for (const block of completedBlocks) {
              // Update block status to completed
              block.status = 'completed';
              await database.updateScheduleBlock(block);

              // Mark the associated task as completed
              const task = tasks.find((t) => t.id === block.taskId);
              if (task && !task.completed) {
                task.completed = true;
                await database.updateTask(task);

                // Record analytics event for task completion
                await recordEvent(database, 'task_completed', {
                  taskId: task.id,
                  durationMinutes: task.durationMinutes,
                });
              }
            }
          }
        }
      }

      // Reload schedule blocks to reflect any status changes
      const updatedBlocks = await database.getScheduleBlocks(new Date());
      setScheduleBlocks(updatedBlocks);

      // Reload tasks to reflect completion status
      const updatedTasks = await database.getTasks();
      setTasks(updatedTasks);
    } catch (err) {
      console.error('Failed to update session state:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">{strings.app.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {strings.app.title}
          </h1>
          <p className="text-gray-600">{strings.app.subtitle}</p>
        </header>

        {/* Error banner */}
        {error && (
          <div
            className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Task Input */}
        <section>
          <TaskInput onTaskAdded={handleTaskAdded} />
        </section>

        {/* Generate Schedule Button */}
        {tasks.filter((t) => !t.completed).length > 0 && (
          <section className="flex justify-center">
            <button
              onClick={handleGenerateSchedule}
              className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
            >
              {strings.generateSchedule.button}
            </button>
          </section>
        )}

        {/* Timer Panel */}
        <section>
          <TimerPanel
            timerManager={timerManager}
            tasks={tasks}
            onSessionUpdate={handleSessionUpdate}
          />
        </section>

        {/* Schedule View */}
        <section>
          <ScheduleView
            scheduleBlocks={scheduleBlocks}
            tasks={tasks}
            onStartSession={handleStartSession}
          />
        </section>

        {/* Analytics Panel */}
        <section>
          <AnalyticsPanel />
        </section>
      </div>
    </div>
  );
}

export default App;
