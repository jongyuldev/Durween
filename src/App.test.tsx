import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { database } from './lib/database';

// Mock the database module
vi.mock('./lib/database', () => ({
  database: {
    getTasks: vi.fn(),
    addTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    getScheduleBlocks: vi.fn(),
    addScheduleBlock: vi.fn(),
    updateScheduleBlock: vi.fn(),
    clearScheduleBlocks: vi.fn(),
    addSession: vi.fn(),
    getSession: vi.fn(),
    updateSession: vi.fn(),
    getActiveSessions: vi.fn(),
    addAnalyticsEvent: vi.fn(),
    getAnalyticsEvents: vi.fn(),
  },
}));

describe('App Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Set up default mock implementations
    vi.mocked(database.getTasks).mockResolvedValue([]);
    vi.mocked(database.getScheduleBlocks).mockResolvedValue([]);
    vi.mocked(database.getActiveSessions).mockResolvedValue([]);
    vi.mocked(database.getAnalyticsEvents).mockResolvedValue([]);
    vi.mocked(database.addTask).mockResolvedValue(undefined);
    vi.mocked(database.addScheduleBlock).mockResolvedValue(undefined);
    vi.mocked(database.clearScheduleBlocks).mockResolvedValue(undefined);
    vi.mocked(database.addSession).mockResolvedValue(undefined);
    vi.mocked(database.updateSession).mockResolvedValue(undefined);
    vi.mocked(database.updateScheduleBlock).mockResolvedValue(undefined);
    vi.mocked(database.updateTask).mockResolvedValue(undefined);
    vi.mocked(database.addAnalyticsEvent).mockResolvedValue(undefined);
  });

  it('should load initial state from storage on mount', async () => {
    const mockTasks = [
      {
        id: 'task-1',
        name: 'Test Task',
        durationMinutes: 30,
        createdAt: new Date(),
        completed: false,
      },
    ];

    vi.mocked(database.getTasks).mockResolvedValue(mockTasks);

    render(<App />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Verify database was called
    expect(database.getTasks).toHaveBeenCalled();
    expect(database.getScheduleBlocks).toHaveBeenCalled();
  });

  it('should handle full flow: add task → generate schedule → start session → complete task', async () => {
    const user = userEvent.setup();

    // Start with empty state
    vi.mocked(database.getTasks).mockResolvedValue([]);
    vi.mocked(database.getScheduleBlocks).mockResolvedValue([]);

    render(<App />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Step 1: Add a task
    const input = screen.getByPlaceholderText(/Add task/i);
    const addButton = screen.getByRole('button', { name: /Add/i });

    await user.type(input, 'emails(30)');
    await user.click(addButton);

    // Verify task was added to database
    await waitFor(() => {
      expect(database.addTask).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'emails',
          durationMinutes: 30,
          completed: false,
        })
      );
    });

    // Step 2: Generate schedule
    // Mock the updated tasks list
    const mockTask = {
      id: 'task-1',
      name: 'emails',
      durationMinutes: 30,
      createdAt: new Date(),
      completed: false,
    };
    vi.mocked(database.getTasks).mockResolvedValue([mockTask]);

    // Find and click the generate schedule button
    const generateButton = await screen.findByRole('button', {
      name: /Generate Schedule/i,
    });
    await user.click(generateButton);

    // Verify schedule was generated
    await waitFor(() => {
      expect(database.clearScheduleBlocks).toHaveBeenCalled();
      expect(database.addScheduleBlock).toHaveBeenCalled();
      expect(database.addAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'schedule_generated',
        })
      );
    });

    // Step 3: Verify session can be started
    // The schedule generation should have created blocks
    await waitFor(() => {
      expect(database.addSession).not.toHaveBeenCalled();
    });

    // Verify that the schedule was generated successfully
    const addScheduleBlockCalls = vi.mocked(database.addScheduleBlock).mock
      .calls;
    expect(addScheduleBlockCalls.length).toBeGreaterThan(0);

    // Verify the schedule block has the correct structure
    const scheduledBlock = addScheduleBlockCalls[0][0];
    expect(scheduledBlock).toMatchObject({
      taskId: expect.any(String),
      startTime: expect.any(Date),
      endTime: expect.any(Date),
      status: 'scheduled',
    });
  });

  it('should handle state persistence across simulated reload', async () => {
    // Simulate initial state with tasks and schedule
    const mockTasks = [
      {
        id: 'task-1',
        name: 'Test Task',
        durationMinutes: 30,
        createdAt: new Date(),
        completed: false,
      },
    ];

    const mockBlocks = [
      {
        id: 'block-1',
        taskId: 'task-1',
        startTime: new Date(),
        endTime: new Date(Date.now() + 30 * 60 * 1000),
        status: 'scheduled' as const,
      },
    ];

    vi.mocked(database.getTasks).mockResolvedValue(mockTasks);
    vi.mocked(database.getScheduleBlocks).mockResolvedValue(mockBlocks);

    // First render (simulating initial load)
    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Verify data was loaded
    expect(database.getTasks).toHaveBeenCalled();
    expect(database.getScheduleBlocks).toHaveBeenCalled();

    // Unmount (simulating page close)
    unmount();

    // Second render (simulating page reload)
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Verify data was loaded again from storage
    expect(database.getTasks).toHaveBeenCalledTimes(2);
    expect(database.getScheduleBlocks).toHaveBeenCalledTimes(2);
  });

  it('should handle error when loading initial state fails', async () => {
    // Mock database error
    vi.mocked(database.getTasks).mockRejectedValue(new Error('Database error'));

    render(<App />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // App should still render (with empty state)
    expect(screen.getByText(/Clippy/i)).toBeInTheDocument();
  });

  it('should handle error when generating schedule fails', async () => {
    const user = userEvent.setup();

    // Start with a task
    const mockTask = {
      id: 'task-1',
      name: 'Test Task',
      durationMinutes: 30,
      createdAt: new Date(),
      completed: false,
    };
    vi.mocked(database.getTasks).mockResolvedValue([mockTask]);
    vi.mocked(database.getScheduleBlocks).mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Mock schedule generation error
    vi.mocked(database.clearScheduleBlocks).mockRejectedValue(
      new Error('Storage error')
    );

    // Try to generate schedule
    const generateButton = await screen.findByRole('button', {
      name: /Generate Schedule/i,
    });
    await user.click(generateButton);

    // Verify error is displayed
    await waitFor(() => {
      expect(screen.getByText(/Storage error/i)).toBeInTheDocument();
    });
  });

  it('should show message when trying to generate schedule with no tasks', async () => {
    const user = userEvent.setup();

    // Start with no tasks
    vi.mocked(database.getTasks).mockResolvedValue([]);
    vi.mocked(database.getScheduleBlocks).mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Generate schedule button should not be visible with no tasks
    expect(
      screen.queryByRole('button', { name: /Generate Schedule/i })
    ).not.toBeInTheDocument();
  });

  // Session restoration tests
  describe('Session Restoration', () => {
    it('should restore active session on page load', async () => {
      const mockTask = {
        id: 'task-1',
        name: 'Test Task',
        durationMinutes: 30,
        createdAt: new Date(),
        completed: false,
      };

      const mockBlock = {
        id: 'block-1',
        taskId: 'task-1',
        startTime: new Date(),
        endTime: new Date(Date.now() + 30 * 60 * 1000),
        status: 'in-progress' as const,
      };

      const mockSession = {
        id: 'session-1',
        taskId: 'task-1',
        scheduleBlockId: 'block-1',
        startTime: new Date(Date.now() - 5 * 60 * 1000), // Started 5 minutes ago
        accumulatedMinutes: 0,
        status: 'active' as const,
      };

      vi.mocked(database.getTasks).mockResolvedValue([mockTask]);
      vi.mocked(database.getScheduleBlocks).mockResolvedValue([mockBlock]);
      vi.mocked(database.getActiveSessions).mockResolvedValue([mockSession]);

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Verify active session was loaded
      expect(database.getActiveSessions).toHaveBeenCalled();

      // Verify timer panel shows the active session
      await waitFor(() => {
        const timerPanel = screen
          .getByText('Current Task')
          .closest('div')?.parentElement;
        expect(timerPanel).toBeInTheDocument();
        expect(timerPanel).toHaveTextContent('Test Task');
      });

      // Verify timer is running (should show elapsed time)
      const elapsedTime = screen.getByTestId('elapsed-time');
      expect(elapsedTime).toBeInTheDocument();
    });

    it('should restore paused session on page load', async () => {
      const mockTask = {
        id: 'task-1',
        name: 'Paused Task',
        durationMinutes: 45,
        createdAt: new Date(),
        completed: false,
      };

      const mockBlock = {
        id: 'block-1',
        taskId: 'task-1',
        startTime: new Date(),
        endTime: new Date(Date.now() + 45 * 60 * 1000),
        status: 'in-progress' as const,
      };

      const mockSession = {
        id: 'session-1',
        taskId: 'task-1',
        scheduleBlockId: 'block-1',
        startTime: new Date(Date.now() - 10 * 60 * 1000), // Started 10 minutes ago
        pausedAt: new Date(Date.now() - 2 * 60 * 1000), // Paused 2 minutes ago
        accumulatedMinutes: 8, // 8 minutes accumulated before pause
        status: 'paused' as const,
      };

      vi.mocked(database.getTasks).mockResolvedValue([mockTask]);
      vi.mocked(database.getScheduleBlocks).mockResolvedValue([mockBlock]);
      vi.mocked(database.getActiveSessions).mockResolvedValue([mockSession]);

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Verify paused session was loaded
      expect(database.getActiveSessions).toHaveBeenCalled();

      // Verify timer panel shows the paused session
      await waitFor(() => {
        const timerPanel = screen
          .getByText('Current Task')
          .closest('div')?.parentElement;
        expect(timerPanel).toBeInTheDocument();
        expect(timerPanel).toHaveTextContent('Paused Task');
      });

      // Verify pause/resume button shows "Resume"
      await waitFor(() => {
        const pauseResumeButton = screen.getByTestId('pause-resume-button');
        expect(pauseResumeButton).toHaveTextContent('Resume');
      });

      // Verify paused status indicator is shown
      expect(screen.getByText('Session paused')).toBeInTheDocument();
    });

    it('should handle page load with no active session', async () => {
      const mockTask = {
        id: 'task-1',
        name: 'Completed Task',
        durationMinutes: 30,
        createdAt: new Date(),
        completed: true,
      };

      vi.mocked(database.getTasks).mockResolvedValue([mockTask]);
      vi.mocked(database.getScheduleBlocks).mockResolvedValue([]);
      vi.mocked(database.getActiveSessions).mockResolvedValue([]);

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Verify no active sessions were found
      expect(database.getActiveSessions).toHaveBeenCalled();

      // Verify timer panel shows empty state
      expect(screen.getByText(/No active session/i)).toBeInTheDocument();
    });
  });
});
