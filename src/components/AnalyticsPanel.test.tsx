import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AnalyticsPanel } from './AnalyticsPanel';
import { database } from '../lib/database';
import { recordEvent } from '../lib/analytics';

describe('AnalyticsPanel - Unit Tests', () => {
  beforeEach(async () => {
    // Clear analytics events before each test
    // Note: We can't easily clear analytics events, so we'll use future dates for isolation
  });

  describe('Display with no data', () => {
    it('should display 0 completed tasks when no data exists', async () => {
      // Use a future date where no events exist
      const futureDate = new Date('2099-12-31');

      render(<AnalyticsPanel date={futureDate} />);

      await waitFor(() => {
        const count = screen.getByTestId('completed-tasks-count');
        expect(count.textContent).toBe('0');
      });
    });

    it('should display 0 focus minutes when no data exists', async () => {
      const futureDate = new Date('2099-12-31');

      render(<AnalyticsPanel date={futureDate} />);

      await waitFor(() => {
        const count = screen.getByTestId('focus-minutes-count');
        expect(count.textContent).toBe('0');
      });
    });

    it('should render without crashing when no data exists', () => {
      const futureDate = new Date('2099-12-31');

      const { container } = render(<AnalyticsPanel date={futureDate} />);

      expect(container).toBeInTheDocument();
    });
  });

  describe('Display with completed tasks', () => {
    it('should display correct count of completed tasks', async () => {
      const testDate = new Date();

      // Record some task_completed events
      await recordEvent(database, 'task_completed', {
        taskId: 'task-1',
        durationMinutes: 30,
      });
      await recordEvent(database, 'task_completed', {
        taskId: 'task-2',
        durationMinutes: 45,
      });

      render(<AnalyticsPanel date={testDate} />);

      await waitFor(() => {
        const count = screen.getByTestId('completed-tasks-count');
        const countValue = parseInt(count.textContent || '0');
        expect(countValue).toBeGreaterThanOrEqual(2);
      });
    });

    it('should update when new tasks are completed', async () => {
      const testDate = new Date();

      const { rerender } = render(
        <AnalyticsPanel date={testDate} key="initial" />
      );

      // Wait for initial load to complete
      let initialCount = 0;
      await waitFor(() => {
        const countText = screen.getByTestId(
          'completed-tasks-count'
        ).textContent;
        expect(countText).not.toBe('-'); // Wait until loading is done
        initialCount = parseInt(countText || '0');
      });

      // Add a new completed task
      await recordEvent(database, 'task_completed', {
        taskId: 'new-task',
        durationMinutes: 20,
      });

      // Force re-render with new key to trigger data refresh
      rerender(<AnalyticsPanel date={testDate} key="updated" />);

      await waitFor(() => {
        const newCount = parseInt(
          screen.getByTestId('completed-tasks-count').textContent || '0'
        );
        expect(newCount).toBeGreaterThan(initialCount);
      });
    });

    it('should display task count with proper label', async () => {
      const testDate = new Date();

      render(<AnalyticsPanel date={testDate} />);

      await waitFor(() => {
        expect(screen.getByText(/completed tasks/i)).toBeInTheDocument();
      });
    });
  });

  describe('Display with focus minutes', () => {
    it('should display correct sum of focus minutes', async () => {
      const testDate = new Date();

      // Record task_completed events with durations
      await recordEvent(database, 'task_completed', {
        taskId: 'task-1',
        durationMinutes: 30,
      });
      await recordEvent(database, 'task_completed', {
        taskId: 'task-2',
        durationMinutes: 45,
      });

      render(<AnalyticsPanel date={testDate} />);

      await waitFor(() => {
        const minutes = screen.getByTestId('focus-minutes-count');
        const minutesValue = parseInt(minutes.textContent || '0');
        expect(minutesValue).toBeGreaterThanOrEqual(75);
      });
    });

    it('should update when new sessions finish', async () => {
      const testDate = new Date();

      const { rerender } = render(
        <AnalyticsPanel date={testDate} key="initial" />
      );

      // Wait for initial load to complete
      let initialMinutes = 0;
      await waitFor(() => {
        const minutesText = screen.getByTestId(
          'focus-minutes-count'
        ).textContent;
        expect(minutesText).not.toBe('-'); // Wait until loading is done
        initialMinutes = parseInt(minutesText || '0');
      });

      // Add a new completed task with duration
      await recordEvent(database, 'task_completed', {
        taskId: 'new-task',
        durationMinutes: 60,
      });

      // Force re-render with new key to trigger data refresh
      rerender(<AnalyticsPanel date={testDate} key="updated" />);

      await waitFor(() => {
        const newMinutes = parseInt(
          screen.getByTestId('focus-minutes-count').textContent || '0'
        );
        expect(newMinutes).toBeGreaterThanOrEqual(initialMinutes + 60);
      });
    });

    it('should display focus minutes with proper label', async () => {
      const testDate = new Date();

      render(<AnalyticsPanel date={testDate} />);

      await waitFor(() => {
        expect(screen.getByText(/focus minutes/i)).toBeInTheDocument();
      });
    });

    it('should handle large focus minute values', async () => {
      const testDate = new Date();

      // Record a task with large duration
      await recordEvent(database, 'task_completed', {
        taskId: 'long-task',
        durationMinutes: 480, // 8 hours
      });

      render(<AnalyticsPanel date={testDate} />);

      await waitFor(() => {
        const minutes = screen.getByTestId('focus-minutes-count');
        const minutesValue = parseInt(minutes.textContent || '0');
        expect(minutesValue).toBeGreaterThanOrEqual(480);
      });
    });
  });

  describe('Visual styling', () => {
    it('should have proper Tailwind CSS classes', () => {
      const testDate = new Date();

      const { container } = render(<AnalyticsPanel date={testDate} />);

      // Check that the component has styling classes
      const panel = container.firstChild as HTMLElement;
      expect(panel.className).toBeTruthy();
    });

    it('should display analytics in a readable format', async () => {
      const testDate = new Date();

      render(<AnalyticsPanel date={testDate} />);

      await waitFor(() => {
        expect(screen.getByTestId('completed-tasks-count')).toBeInTheDocument();
        expect(screen.getByTestId('focus-minutes-count')).toBeInTheDocument();
      });

      // Both metrics should be visible
      expect(screen.getByTestId('completed-tasks-count')).toBeVisible();
      expect(screen.getByTestId('focus-minutes-count')).toBeVisible();
    });
  });

  describe('Default date behavior', () => {
    it('should use current date when no date prop is provided', async () => {
      render(<AnalyticsPanel />);

      // Wait for loading to complete and data to be displayed
      await waitFor(() => {
        const tasksCount = screen.getByTestId('completed-tasks-count');
        const minutesCount = screen.getByTestId('focus-minutes-count');

        // Should display numeric data (not loading placeholder)
        expect(tasksCount.textContent).toMatch(/^\d+$/);
        expect(minutesCount.textContent).toMatch(/^\d+$/);
      });
    });
  });
});
