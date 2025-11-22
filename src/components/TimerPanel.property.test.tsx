import { describe, it, expect, beforeEach } from 'vitest';
import { render, within, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { TimerPanel } from './TimerPanel';
import { DefaultTimerManager } from '../lib/timerManager';
import type { Task, TimerManager } from '../lib/types';

describe('TimerPanel - Property-Based Tests', () => {
  // Feature: clippy-task-scheduler, Property 15: Timer panel displays session information
  it('Property 15: Timer panel displays session information', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random task data
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => /^[a-zA-Z0-9_ ]+$/.test(s)),
        fc.integer({ min: 1, max: 1440 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (taskName, duration, scheduleBlockId) => {
          // Create a timer manager and task
          const timerManager: TimerManager = new DefaultTimerManager();
          const taskId = `task-${Date.now()}-${Math.random()}`;

          const task: Task = {
            id: taskId,
            name: taskName,
            durationMinutes: duration,
            createdAt: new Date(),
            completed: false,
          };

          const tasks = [task];

          // Start a session
          timerManager.startSession(taskId, scheduleBlockId);

          // Render the component
          const { container, unmount } = render(
            <TimerPanel timerManager={timerManager} tasks={tasks} />
          );

          // Wait for the component to update
          await waitFor(() => {
            // Verify task name is displayed
            const taskNameElement = within(container).getByTestId('task-name');
            expect(taskNameElement).toBeInTheDocument();
            expect(taskNameElement.textContent).toBe(taskName);

            // Verify elapsed time is displayed
            const elapsedTimeElement =
              within(container).getByTestId('elapsed-time');
            expect(elapsedTimeElement).toBeInTheDocument();
            expect(elapsedTimeElement.textContent).toMatch(/^\d{2}:\d{2}$/);

            // Verify pause button is displayed
            const pauseButton = within(container).getByTestId(
              'pause-resume-button'
            );
            expect(pauseButton).toBeInTheDocument();
            expect(pauseButton.textContent).toBe('Pause');

            // Verify finish button is displayed
            const finishButton = within(container).getByTestId('finish-button');
            expect(finishButton).toBeInTheDocument();
            expect(finishButton.textContent).toBe('Finish');
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  }, 60000); // Increase timeout for property-based test
});
