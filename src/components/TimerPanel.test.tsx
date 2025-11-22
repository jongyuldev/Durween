import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimerPanel } from './TimerPanel';
import { DefaultTimerManager } from '../lib/timerManager';
import type { Task, TimerManager } from '../lib/types';

describe('TimerPanel - Unit Tests', () => {
  let timerManager: TimerManager;
  let tasks: Task[];

  beforeEach(() => {
    timerManager = new DefaultTimerManager();
    tasks = [
      {
        id: 'task-1',
        name: 'Test Task',
        durationMinutes: 30,
        createdAt: new Date(),
        completed: false,
      },
      {
        id: 'task-2',
        name: 'Another Task',
        durationMinutes: 45,
        createdAt: new Date(),
        completed: false,
      },
    ];
  });

  describe('Display with no active session', () => {
    it('should show empty state when no session is active', () => {
      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      expect(screen.getByText(/no active session/i)).toBeInTheDocument();
      expect(screen.queryByTestId('task-name')).not.toBeInTheDocument();
      expect(screen.queryByTestId('elapsed-time')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('pause-resume-button')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('finish-button')).not.toBeInTheDocument();
    });

    it('should have appropriate styling for empty state', () => {
      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const emptyState = screen
        .getByText(/no active session/i)
        .closest('div')?.parentElement;
      expect(emptyState?.className).toContain('bg-gray-50');
      expect(emptyState?.className).toContain('border');
    });
  });

  describe('Pause/resume button states', () => {
    it('should show "Pause" button when session is active', () => {
      timerManager.startSession('task-1', 'block-1');
      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const button = screen.getByTestId('pause-resume-button');
      expect(button).toHaveTextContent('Pause');
      expect(button).toHaveAttribute('aria-label', 'Pause session');
    });

    it('should show "Resume" button when session is paused', async () => {
      const session = timerManager.startSession('task-1', 'block-1');

      const { rerender } = render(
        <TimerPanel timerManager={timerManager} tasks={tasks} />
      );

      // Pause the session after rendering
      await userEvent.click(screen.getByTestId('pause-resume-button'));

      // Wait for the component to update
      await waitFor(() => {
        const button = screen.getByTestId('pause-resume-button');
        expect(button).toHaveTextContent('Resume');
        expect(button).toHaveAttribute('aria-label', 'Resume session');
      });
    });

    it('should have different styling for pause vs resume button', () => {
      // Active session - pause button
      const session = timerManager.startSession('task-1', 'block-1');
      const { rerender } = render(
        <TimerPanel timerManager={timerManager} tasks={tasks} />
      );

      let button = screen.getByTestId('pause-resume-button');
      expect(button.className).toContain('bg-yellow-600');

      // Pause the session
      timerManager.pauseSession(session.id);
      rerender(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      button = screen.getByTestId('pause-resume-button');
      expect(button.className).toContain('bg-green-600');
    });

    it('should call pauseSession when pause button is clicked', async () => {
      const session = timerManager.startSession('task-1', 'block-1');
      const pauseSpy = vi.spyOn(timerManager, 'pauseSession');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const button = screen.getByTestId('pause-resume-button');
      await userEvent.click(button);

      expect(pauseSpy).toHaveBeenCalledWith(session.id);
    });

    it('should call resumeSession when resume button is clicked', async () => {
      const session = timerManager.startSession('task-1', 'block-1');
      const resumeSpy = vi.spyOn(timerManager, 'resumeSession');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      // First pause the session
      const button = screen.getByTestId('pause-resume-button');
      await userEvent.click(button);

      // Wait for pause to complete
      await waitFor(() => {
        expect(screen.getByTestId('pause-resume-button')).toHaveTextContent(
          'Resume'
        );
      });

      // Now click resume
      await userEvent.click(button);

      expect(resumeSpy).toHaveBeenCalledWith(session.id);
    });

    it('should show paused indicator when session is paused', async () => {
      timerManager.startSession('task-1', 'block-1');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      // Pause the session
      const button = screen.getByTestId('pause-resume-button');
      await userEvent.click(button);

      // Wait for the paused indicator to appear
      await waitFor(() => {
        expect(screen.getByText(/session paused/i)).toBeInTheDocument();
      });
    });

    it('should not show paused indicator when session is active', () => {
      timerManager.startSession('task-1', 'block-1');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      expect(screen.queryByText(/session paused/i)).not.toBeInTheDocument();
    });
  });

  describe('Time formatting', () => {
    it('should format time as MM:SS', () => {
      timerManager.startSession('task-1', 'block-1');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const elapsedTime = screen.getByTestId('elapsed-time');
      expect(elapsedTime.textContent).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should show 00:00 for newly started session', () => {
      timerManager.startSession('task-1', 'block-1');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const elapsedTime = screen.getByTestId('elapsed-time');
      expect(elapsedTime.textContent).toBe('00:00');
    });

    it('should update elapsed time every second', async () => {
      timerManager.startSession('task-1', 'block-1');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const elapsedTime = screen.getByTestId('elapsed-time');
      const initialTime = elapsedTime.textContent;

      // Wait for more than 1 second
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await waitFor(() => {
        expect(elapsedTime.textContent).not.toBe(initialTime);
      });
    });

    it('should pad minutes and seconds with leading zeros', () => {
      timerManager.startSession('task-1', 'block-1');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const elapsedTime = screen.getByTestId('elapsed-time');
      // Should be 00:00 initially
      expect(elapsedTime.textContent).toBe('00:00');
    });
  });

  describe('Task display', () => {
    it('should display the correct task name', () => {
      timerManager.startSession('task-1', 'block-1');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const taskName = screen.getByTestId('task-name');
      expect(taskName).toHaveTextContent('Test Task');
    });

    it('should display "Unknown Task" when task is not found', () => {
      timerManager.startSession('non-existent-task', 'block-1');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const taskName = screen.getByTestId('task-name');
      expect(taskName).toHaveTextContent('Unknown Task');
    });

    it('should update display when different task is started', async () => {
      const session1 = timerManager.startSession('task-1', 'block-1');
      const { rerender } = render(
        <TimerPanel timerManager={timerManager} tasks={tasks} />
      );

      let taskName = screen.getByTestId('task-name');
      expect(taskName).toHaveTextContent('Test Task');

      // Finish first session and start second
      timerManager.finishSession(session1.id);

      // Wait a bit for the interval to detect the finished session
      await new Promise((resolve) => setTimeout(resolve, 100));

      timerManager.startSession('task-2', 'block-2');

      // Wait for the component to update (the interval runs every second)
      await waitFor(
        () => {
          taskName = screen.getByTestId('task-name');
          expect(taskName).toHaveTextContent('Another Task');
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Finish button', () => {
    it('should display finish button when session is active', () => {
      timerManager.startSession('task-1', 'block-1');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const finishButton = screen.getByTestId('finish-button');
      expect(finishButton).toBeInTheDocument();
      expect(finishButton).toHaveTextContent('Finish');
      expect(finishButton).toHaveAttribute('aria-label', 'Finish session');
    });

    it('should call finishSession when finish button is clicked', async () => {
      const session = timerManager.startSession('task-1', 'block-1');
      const finishSpy = vi.spyOn(timerManager, 'finishSession');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const finishButton = screen.getByTestId('finish-button');
      await userEvent.click(finishButton);

      expect(finishSpy).toHaveBeenCalledWith(session.id);
    });

    it('should show empty state after finishing session', async () => {
      timerManager.startSession('task-1', 'block-1');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const finishButton = screen.getByTestId('finish-button');
      await userEvent.click(finishButton);

      await waitFor(() => {
        expect(screen.getByText(/no active session/i)).toBeInTheDocument();
        expect(screen.queryByTestId('task-name')).not.toBeInTheDocument();
      });
    });
  });

  describe('Session update callback', () => {
    it('should call onSessionUpdate when pause button is clicked', async () => {
      timerManager.startSession('task-1', 'block-1');
      const onSessionUpdate = vi.fn();

      render(
        <TimerPanel
          timerManager={timerManager}
          tasks={tasks}
          onSessionUpdate={onSessionUpdate}
        />
      );

      const pauseButton = screen.getByTestId('pause-resume-button');
      await userEvent.click(pauseButton);

      expect(onSessionUpdate).toHaveBeenCalledTimes(1);
    });

    it('should call onSessionUpdate when resume button is clicked', async () => {
      timerManager.startSession('task-1', 'block-1');
      const onSessionUpdate = vi.fn();

      render(
        <TimerPanel
          timerManager={timerManager}
          tasks={tasks}
          onSessionUpdate={onSessionUpdate}
        />
      );

      const button = screen.getByTestId('pause-resume-button');

      // First pause
      await userEvent.click(button);
      expect(onSessionUpdate).toHaveBeenCalledTimes(1);

      // Wait for pause to complete
      await waitFor(() => {
        expect(screen.getByTestId('pause-resume-button')).toHaveTextContent(
          'Resume'
        );
      });

      // Then resume
      await userEvent.click(button);
      expect(onSessionUpdate).toHaveBeenCalledTimes(2);
    });

    it('should call onSessionUpdate when finish button is clicked', async () => {
      timerManager.startSession('task-1', 'block-1');
      const onSessionUpdate = vi.fn();

      render(
        <TimerPanel
          timerManager={timerManager}
          tasks={tasks}
          onSessionUpdate={onSessionUpdate}
        />
      );

      const finishButton = screen.getByTestId('finish-button');
      await userEvent.click(finishButton);

      expect(onSessionUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('should handle errors when pausing session', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      timerManager.startSession('task-1', 'block-1');

      // Mock pauseSession to throw an error
      vi.spyOn(timerManager, 'pauseSession').mockImplementation(() => {
        throw new Error('Pause failed');
      });

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const pauseButton = screen.getByTestId('pause-resume-button');
      await userEvent.click(pauseButton);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error pausing/resuming session:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle errors when finishing session', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      timerManager.startSession('task-1', 'block-1');

      // Mock finishSession to throw an error
      vi.spyOn(timerManager, 'finishSession').mockImplementation(() => {
        throw new Error('Finish failed');
      });

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const finishButton = screen.getByTestId('finish-button');
      await userEvent.click(finishButton);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error finishing session:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels on buttons', () => {
      timerManager.startSession('task-1', 'block-1');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const pauseButton = screen.getByTestId('pause-resume-button');
      const finishButton = screen.getByTestId('finish-button');

      expect(pauseButton).toHaveAttribute('aria-label');
      expect(finishButton).toHaveAttribute('aria-label');
    });

    it('should have focus styles on buttons', () => {
      timerManager.startSession('task-1', 'block-1');

      render(<TimerPanel timerManager={timerManager} tasks={tasks} />);

      const pauseButton = screen.getByTestId('pause-resume-button');
      const finishButton = screen.getByTestId('finish-button');

      expect(pauseButton.className).toContain('focus:ring');
      expect(finishButton.className).toContain('focus:ring');
    });
  });
});
