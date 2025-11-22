import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskInput } from './TaskInput';
import { database } from '../lib/database';

describe('TaskInput - Uests', () => {
  beforeEach(async () => {
    // Clear all tasks before each test
    const tasks = await database.getTasks();
    for (const task of tasks) {
      await database.deleteTask(task.id);
    }
  });

  describe('Input validation', () => {
    it('should disable submit button when input is empty', () => {
      render(<TaskInput />);
      const submitButton = screen.getByRole('button', { name: /add/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when input has text', async () => {
      render(<TaskInput />);
      const input = screen.getByLabelText('Task input');
      const submitButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, 'task(30)');
      expect(submitButton).not.toBeDisabled();
    });

    it('should disable submit button when input is only whitespace', async () => {
      render(<TaskInput />);
      const input = screen.getByLabelText('Task input');
      const submitButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, '   ');
      expect(submitButton).toBeDisabled();
    });

    it('should show error for invalid format', async () => {
      render(<TaskInput />);
      const input = screen.getByLabelText('Task input');
      const submitButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, 'invalid task');
      await userEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage.textContent).toContain('Unable to parse task');
      });
    });

    it('should show error for zero duration', async () => {
      render(<TaskInput />);
      const input = screen.getByLabelText('Task input');
      const submitButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, 'task(0)');
      await userEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage.textContent).toContain('positive number');
      });
    });

    it('should show error for negative duration', async () => {
      render(<TaskInput />);
      const input = screen.getByLabelText('Task input');
      const submitButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, 'task(-5)');
      await userEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage.textContent).toContain('positive number');
      });
    });
  });

  describe('Error display', () => {
    it('should not show error initially', () => {
      render(<TaskInput />);
      const errorMessage = screen.queryByRole('alert');
      expect(errorMessage).not.toBeInTheDocument();
    });

    it('should preserve input when parse fails', async () => {
      render(<TaskInput />);
      const input = screen.getByLabelText('Task input') as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /add/i });

      const invalidInput = 'invalid task';
      await userEvent.type(input, invalidInput);
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Input should still contain the invalid text
      expect(input.value).toBe(invalidInput);
    });

    it('should clear error when user starts typing', async () => {
      render(<TaskInput />);
      const input = screen.getByLabelText('Task input');
      const submitButton = screen.getByRole('button', { name: /add/i });

      // First, trigger an error
      await userEvent.type(input, 'invalid');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Now type something new
      await userEvent.type(input, 'x');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('should set aria-invalid when there is an error', async () => {
      render(<TaskInput />);
      const input = screen.getByLabelText('Task input');
      const submitButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, 'invalid');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAttribute('aria-describedby', 'task-input-error');
      });
    });
  });

  describe('Successful submission', () => {
    it('should add task to storage on successful parse', async () => {
      render(<TaskInput />);
      const input = screen.getByLabelText('Task input');
      const submitButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, 'emails(30)');
      await userEvent.click(submitButton);

      await waitFor(async () => {
        const tasks = await database.getTasks();
        expect(tasks.length).toBe(1);
        expect(tasks[0].name).toBe('emails');
        expect(tasks[0].durationMinutes).toBe(30);
      });
    });

    it('should clear input field after successful submission', async () => {
      render(<TaskInput />);
      const input = screen.getByLabelText('Task input') as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, 'task(45)');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should call onTaskAdded callback when tasks are added', async () => {
      const onTaskAdded = vi.fn();
      render(<TaskInput onTaskAdded={onTaskAdded} />);
      const input = screen.getByLabelText('Task input');
      const submitButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, 'task(30)');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onTaskAdded).toHaveBeenCalledTimes(1);
        expect(onTaskAdded).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'task',
              durationMinutes: 30,
            }),
          ])
        );
      });
    });

    it('should handle natural language format', async () => {
      render(<TaskInput />);
      const input = screen.getByLabelText('Task input');
      const submitButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, 'do report for 60 minutes');
      await userEvent.click(submitButton);

      await waitFor(async () => {
        const tasks = await database.getTasks();
        expect(tasks.length).toBe(1);
        expect(tasks[0].name).toBe('report');
        expect(tasks[0].durationMinutes).toBe(60);
      });
    });

    it('should handle multiple tasks in one input', async () => {
      render(<TaskInput />);
      const input = screen.getByLabelText('Task input');
      const submitButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, 'task1(30), task2(45)');
      await userEvent.click(submitButton);

      await waitFor(async () => {
        const tasks = await database.getTasks();
        expect(tasks.length).toBe(2);

        // Find tasks by name (order not guaranteed)
        const task1 = tasks.find((t) => t.name === 'task1');
        const task2 = tasks.find((t) => t.name === 'task2');

        expect(task1).toBeDefined();
        expect(task1?.durationMinutes).toBe(30);
        expect(task2).toBeDefined();
        expect(task2?.durationMinutes).toBe(45);
      });
    });

    it('should show submitting state during async operation', async () => {
      render(<TaskInput />);
      const input = screen.getByLabelText('Task input');
      const submitButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, 'task(30)');

      // Click and immediately check for submitting state
      const clickPromise = userEvent.click(submitButton);

      // Button text should change to "Adding..."
      await waitFor(() => {
        expect(submitButton).toHaveTextContent(/adding/i);
      });

      await clickPromise;

      // After completion, should return to "Add"
      await waitFor(() => {
        expect(submitButton).toHaveTextContent(/^add$/i);
      });
    });
  });

  describe('Visual feedback', () => {
    it('should have focus styles on input', () => {
      render(<TaskInput />);
      const input = screen.getByLabelText('Task input');

      // Check that focus-related classes are present
      expect(input.className).toContain('focus:ring');
      expect(input.className).toContain('focus:outline-none');
    });

    it('should have hover styles on button', () => {
      render(<TaskInput />);
      const submitButton = screen.getByRole('button', { name: /add/i });

      // Check that hover-related classes are present
      expect(submitButton.className).toContain('hover:bg');
    });

    it('should show disabled state visually', () => {
      render(<TaskInput />);
      const submitButton = screen.getByRole('button', { name: /add/i });

      expect(submitButton).toBeDisabled();
      expect(submitButton.className).toContain('disabled:opacity');
      expect(submitButton.className).toContain('disabled:cursor-not-allowed');
    });
  });
});
