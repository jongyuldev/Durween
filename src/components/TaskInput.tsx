import { useState } from 'react';
import { taskParser } from '../lib/taskParser';
import { database } from '../lib/database';
import type { Task } from '../lib/types';
import { strings } from '../lib/strings';

/**
 * Props for the TaskInput component.
 */
interface TaskInputProps {
  /** Optional callback invoked when tasks are successfully added */
  onTaskAdded?: (tasks: Task[]) => void;
}

/**
 * Quick-add task input component.
 *
 * Allows users to add tasks using short notation (e.g., "emails(20)") or
 * natural language (e.g., "Do emails for 20 minutes"). Displays parse errors
 * inline and clears the input field on successful submission.
 *
 * @example
 * ```tsx
 * <TaskInput onTaskAdded={(tasks) => console.log('Added:', tasks)} />
 * ```
 */
export function TaskInput({ onTaskAdded }: TaskInputProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    // Parse the input
    const result = taskParser.parse(input);

    // If there are errors, display them
    if (result.errors.length > 0) {
      setError(result.errors[0]);
      setIsSubmitting(false);
      return;
    }

    // If parsing was successful, add tasks to storage
    if (result.tasks.length > 0) {
      try {
        // Add all tasks to storage
        for (const task of result.tasks) {
          await database.addTask(task);
        }

        // Clear input field on success
        setInput('');
        setError('');

        // Notify parent component
        if (onTaskAdded) {
          onTaskAdded(result.tasks);
        }
      } catch (err) {
        // Handle storage errors
        const errorMessage =
          err instanceof Error ? err.message : strings.errors.storageFailed;
        setError(errorMessage);
      }
    }

    setIsSubmitting(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={strings.taskInput.placeholder}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={isSubmitting}
            aria-label={strings.taskInput.ariaLabel}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'task-input-error' : undefined}
          />
          <button
            type="submit"
            disabled={isSubmitting || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting
              ? strings.taskInput.buttonAdding
              : strings.taskInput.buttonAdd}
          </button>
        </div>

        {error && (
          <div
            id="task-input-error"
            className="text-red-600 text-sm px-1"
            role="alert"
          >
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
