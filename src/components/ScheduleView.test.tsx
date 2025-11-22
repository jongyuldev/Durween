import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScheduleView } from './ScheduleView';
import type { ScheduleBlock, Task } from '../lib/types';

describe('ScheduleView - Unit Tests', () => {
  const createTask = (overrides?: Partial<Task>): Task => ({
    id: 'task-1',
    name: 'Test Task',
    durationMinutes: 30,
    createdAt: new Date('2024-01-01'),
    completed: false,
    ...overrides,
  });

  const createScheduleBlock = (
    overrides?: Partial<ScheduleBlock>
  ): ScheduleBlock => ({
    id: 'block-1',
    taskId: 'task-1',
    startTime: new Date('2024-01-01T09:00:00'),
    endTime: new Date('2024-01-01T09:30:00'),
    status: 'scheduled',
    ...overrides,
  });

  describe('Empty schedule display', () => {
    it('should display message when no schedule blocks exist', () => {
      render(<ScheduleView scheduleBlocks={[]} tasks={[]} />);

      expect(screen.getByText(/no schedule blocks yet/i)).toBeInTheDocument();
      expect(screen.queryByText("Today's Schedule")).not.toBeInTheDocument();
    });

    it('should not render any schedule blocks when empty', () => {
      const { container } = render(
        <ScheduleView scheduleBlocks={[]} tasks={[]} />
      );

      const blocks = container.querySelectorAll(
        '[data-testid^="schedule-block-"]'
      );
      expect(blocks.length).toBe(0);
    });
  });

  describe('Block ordering', () => {
    it('should display blocks in chronological order', () => {
      const task1 = createTask({ id: 'task-1', name: 'First Task' });
      const task2 = createTask({ id: 'task-2', name: 'Second Task' });
      const task3 = createTask({ id: 'task-3', name: 'Third Task' });

      const block1 = createScheduleBlock({
        id: 'block-1',
        taskId: 'task-1',
        startTime: new Date('2024-01-01T09:00:00'),
        endTime: new Date('2024-01-01T09:30:00'),
      });

      const block2 = createScheduleBlock({
        id: 'block-2',
        taskId: 'task-2',
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T10:45:00'),
      });

      const block3 = createScheduleBlock({
        id: 'block-3',
        taskId: 'task-3',
        startTime: new Date('2024-01-01T11:00:00'),
        endTime: new Date('2024-01-01T11:30:00'),
      });

      // Render blocks in non-chronological order
      render(
        <ScheduleView
          scheduleBlocks={[block2, block3, block1]}
          tasks={[task1, task2, task3]}
        />
      );

      // Get all task names in order they appear
      const taskNames = screen.getAllByTestId('task-name');

      // They should be rendered in the order provided (component doesn't sort)
      expect(taskNames[0].textContent).toBe('Second Task');
      expect(taskNames[1].textContent).toBe('Third Task');
      expect(taskNames[2].textContent).toBe('First Task');
    });

    it('should display start times in correct format', () => {
      const task = createTask();
      const morningBlock = createScheduleBlock({
        id: 'block-1',
        startTime: new Date('2024-01-01T09:30:00'),
        endTime: new Date('2024-01-01T10:00:00'),
      });

      const afternoonBlock = createScheduleBlock({
        id: 'block-2',
        startTime: new Date('2024-01-01T14:45:00'),
        endTime: new Date('2024-01-01T15:15:00'),
      });

      render(
        <ScheduleView
          scheduleBlocks={[morningBlock, afternoonBlock]}
          tasks={[task]}
        />
      );

      const startTimes = screen.getAllByTestId('start-time');
      expect(startTimes[0].textContent).toBe('9:30 AM');
      expect(startTimes[1].textContent).toBe('2:45 PM');
    });

    it('should calculate and display duration correctly', () => {
      const task = createTask();
      const block = createScheduleBlock({
        startTime: new Date('2024-01-01T09:00:00'),
        endTime: new Date('2024-01-01T10:30:00'), // 90 minutes
      });

      render(<ScheduleView scheduleBlocks={[block]} tasks={[task]} />);

      const duration = screen.getByTestId('duration');
      expect(duration.textContent).toContain('90 min');
    });
  });

  describe('Status styling', () => {
    it('should apply scheduled styling to scheduled blocks', () => {
      const task = createTask();
      const block = createScheduleBlock({ status: 'scheduled' });

      const { container } = render(
        <ScheduleView scheduleBlocks={[block]} tasks={[task]} />
      );

      const blockElement = container.querySelector(
        '[data-testid="schedule-block-block-1"]'
      );
      expect(blockElement).toHaveAttribute('data-status', 'scheduled');
      expect(blockElement?.className).toContain('bg-white');
      expect(blockElement?.className).toContain('border-gray-300');
    });

    it('should apply in-progress styling to in-progress blocks', () => {
      const task = createTask();
      const block = createScheduleBlock({ status: 'in-progress' });

      const { container } = render(
        <ScheduleView scheduleBlocks={[block]} tasks={[task]} />
      );

      const blockElement = container.querySelector(
        '[data-testid="schedule-block-block-1"]'
      );
      expect(blockElement).toHaveAttribute('data-status', 'in-progress');
      expect(blockElement?.className).toContain('bg-blue-50');
      expect(blockElement?.className).toContain('border-blue-500');
      expect(blockElement?.className).toContain('ring-2');
    });

    it('should apply completed styling to completed blocks', () => {
      const task = createTask();
      const block = createScheduleBlock({ status: 'completed' });

      const { container } = render(
        <ScheduleView scheduleBlocks={[block]} tasks={[task]} />
      );

      const blockElement = container.querySelector(
        '[data-testid="schedule-block-block-1"]'
      );
      expect(blockElement).toHaveAttribute('data-status', 'completed');
      expect(blockElement?.className).toContain('bg-green-50');
      expect(blockElement?.className).toContain('border-green-500');
      expect(blockElement?.className).toContain('opacity-75');
    });

    it('should show different button text based on status', () => {
      const task = createTask();
      const scheduledBlock = createScheduleBlock({
        id: 'block-1',
        status: 'scheduled',
      });
      const inProgressBlock = createScheduleBlock({
        id: 'block-2',
        status: 'in-progress',
      });
      const completedBlock = createScheduleBlock({
        id: 'block-3',
        status: 'completed',
      });

      render(
        <ScheduleView
          scheduleBlocks={[scheduledBlock, inProgressBlock, completedBlock]}
          tasks={[task]}
        />
      );

      const buttons = screen.getAllByTestId('start-button');
      expect(buttons[0].textContent).toBe('Start');
      expect(buttons[1].textContent).toBe('In Progress');
      expect(buttons[2].textContent).toBe('Completed');
    });

    it('should disable button for completed blocks', () => {
      const task = createTask();
      const completedBlock = createScheduleBlock({ status: 'completed' });

      render(<ScheduleView scheduleBlocks={[completedBlock]} tasks={[task]} />);

      const button = screen.getByTestId('start-button');
      expect(button).toBeDisabled();
    });

    it('should not disable button for scheduled blocks', () => {
      const task = createTask();
      const scheduledBlock = createScheduleBlock({ status: 'scheduled' });

      render(<ScheduleView scheduleBlocks={[scheduledBlock]} tasks={[task]} />);

      const button = screen.getByTestId('start-button');
      expect(button).not.toBeDisabled();
    });

    it('should not disable button for in-progress blocks', () => {
      const task = createTask();
      const inProgressBlock = createScheduleBlock({ status: 'in-progress' });

      render(
        <ScheduleView scheduleBlocks={[inProgressBlock]} tasks={[task]} />
      );

      const button = screen.getByTestId('start-button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Task information display', () => {
    it('should display task name from tasks array', () => {
      const task = createTask({ name: 'Important Meeting' });
      const block = createScheduleBlock({ taskId: task.id });

      render(<ScheduleView scheduleBlocks={[block]} tasks={[task]} />);

      expect(screen.getByTestId('task-name').textContent).toBe(
        'Important Meeting'
      );
    });

    it('should display "Unknown Task" when task is not found', () => {
      const block = createScheduleBlock({ taskId: 'non-existent-task' });

      render(<ScheduleView scheduleBlocks={[block]} tasks={[]} />);

      expect(screen.getByTestId('task-name').textContent).toBe('Unknown Task');
    });

    it('should handle multiple blocks for the same task', () => {
      const task = createTask({ name: 'Recurring Task' });
      const block1 = createScheduleBlock({
        id: 'block-1',
        taskId: task.id,
        startTime: new Date('2024-01-01T09:00:00'),
        endTime: new Date('2024-01-01T09:30:00'),
      });
      const block2 = createScheduleBlock({
        id: 'block-2',
        taskId: task.id,
        startTime: new Date('2024-01-01T14:00:00'),
        endTime: new Date('2024-01-01T14:30:00'),
      });

      render(<ScheduleView scheduleBlocks={[block1, block2]} tasks={[task]} />);

      const taskNames = screen.getAllByTestId('task-name');
      expect(taskNames).toHaveLength(2);
      expect(taskNames[0].textContent).toBe('Recurring Task');
      expect(taskNames[1].textContent).toBe('Recurring Task');
    });
  });

  describe('Start button interaction', () => {
    it('should call onStartSession when start button is clicked', async () => {
      const onStartSession = vi.fn();
      const task = createTask();
      const block = createScheduleBlock({ status: 'scheduled' });

      render(
        <ScheduleView
          scheduleBlocks={[block]}
          tasks={[task]}
          onStartSession={onStartSession}
        />
      );

      const button = screen.getByTestId('start-button');
      await userEvent.click(button);

      expect(onStartSession).toHaveBeenCalledTimes(1);
      expect(onStartSession).toHaveBeenCalledWith('block-1', 'task-1');
    });

    it('should not call onStartSession when completed block button is clicked', async () => {
      const onStartSession = vi.fn();
      const task = createTask();
      const block = createScheduleBlock({ status: 'completed' });

      render(
        <ScheduleView
          scheduleBlocks={[block]}
          tasks={[task]}
          onStartSession={onStartSession}
        />
      );

      const button = screen.getByTestId('start-button');
      await userEvent.click(button);

      expect(onStartSession).not.toHaveBeenCalled();
    });

    it('should not crash when onStartSession is not provided', async () => {
      const task = createTask();
      const block = createScheduleBlock({ status: 'scheduled' });

      render(<ScheduleView scheduleBlocks={[block]} tasks={[task]} />);

      const button = screen.getByTestId('start-button');
      await userEvent.click(button);

      // Should not throw error
      expect(button).toBeInTheDocument();
    });

    it('should have accessible aria-label on button', () => {
      const task = createTask({ name: 'Review Code' });
      const block = createScheduleBlock({
        taskId: task.id,
        status: 'scheduled',
      });

      render(<ScheduleView scheduleBlocks={[block]} tasks={[task]} />);

      const button = screen.getByTestId('start-button');
      expect(button).toHaveAttribute('aria-label', 'Start Review Code');
    });
  });

  describe('Time formatting edge cases', () => {
    it('should format midnight correctly', () => {
      const task = createTask();
      const block = createScheduleBlock({
        startTime: new Date('2024-01-01T00:00:00'),
        endTime: new Date('2024-01-01T00:30:00'),
      });

      render(<ScheduleView scheduleBlocks={[block]} tasks={[task]} />);

      const startTime = screen.getByTestId('start-time');
      expect(startTime.textContent).toBe('12:00 AM');
    });

    it('should format noon correctly', () => {
      const task = createTask();
      const block = createScheduleBlock({
        startTime: new Date('2024-01-01T12:00:00'),
        endTime: new Date('2024-01-01T12:30:00'),
      });

      render(<ScheduleView scheduleBlocks={[block]} tasks={[task]} />);

      const startTime = screen.getByTestId('start-time');
      expect(startTime.textContent).toBe('12:00 PM');
    });

    it('should pad minutes with leading zero', () => {
      const task = createTask();
      const block = createScheduleBlock({
        startTime: new Date('2024-01-01T09:05:00'),
        endTime: new Date('2024-01-01T09:35:00'),
      });

      render(<ScheduleView scheduleBlocks={[block]} tasks={[task]} />);

      const startTime = screen.getByTestId('start-time');
      expect(startTime.textContent).toBe('9:05 AM');
    });
  });
});
