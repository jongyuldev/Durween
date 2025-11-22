import type { ScheduleBlock, Task } from '../lib/types';
import { strings } from '../lib/strings';

/**
 * Props for the ScheduleView component.
 */
interface ScheduleViewProps {
  /** Array of schedule blocks to display */
  scheduleBlocks: ScheduleBlock[];
  /** Array of tasks for looking up task details */
  tasks: Task[];
  /** Optional callback invoked when user starts a session */
  onStartSession?: (blockId: string, taskId: string) => void;
}

/**
 * Schedule display component showing chronologically ordered time blocks.
 *
 * Displays each schedule block with task name, start time, duration, and a
 * start button. Visual styling distinguishes between scheduled, in-progress,
 * and completed blocks.
 *
 * @example
 * ```tsx
 * <ScheduleView
 *   scheduleBlocks={blocks}
 *   tasks={tasks}
 *   onStartSession={(blockId, taskId) => startSession(blockId, taskId)}
 * />
 * ```
 */
export function ScheduleView({
  scheduleBlocks,
  tasks,
  onStartSession,
}: ScheduleViewProps) {
  // Create a map of task IDs to tasks for quick lookup
  const taskMap = new Map(tasks.map((task) => [task.id, task]));

  // Format time as HH:MM AM/PM
  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Calculate duration in minutes
  const getDuration = (block: ScheduleBlock): number => {
    return Math.round(
      (block.endTime.getTime() - block.startTime.getTime()) / (1000 * 60)
    );
  };

  // Get status-specific styling
  const getStatusStyles = (status: ScheduleBlock['status']): string => {
    switch (status) {
      case 'scheduled':
        return 'bg-white border-gray-300 hover:border-blue-400';
      case 'in-progress':
        return 'bg-blue-50 border-blue-500 ring-2 ring-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-500 opacity-75';
      default:
        return 'bg-white border-gray-300';
    }
  };

  // Get button styling based on status
  const getButtonStyles = (status: ScheduleBlock['status']): string => {
    if (status === 'completed') {
      return 'bg-gray-400 cursor-not-allowed';
    }
    if (status === 'in-progress') {
      return 'bg-yellow-600 hover:bg-yellow-700';
    }
    return 'bg-blue-600 hover:bg-blue-700';
  };

  const getButtonText = (status: ScheduleBlock['status']): string => {
    if (status === 'completed') return strings.scheduleView.buttonCompleted;
    if (status === 'in-progress') return strings.scheduleView.buttonInProgress;
    return strings.scheduleView.buttonStart;
  };

  const handleStartClick = (block: ScheduleBlock) => {
    if (block.status === 'completed' || !onStartSession) return;
    onStartSession(block.id, block.taskId);
  };

  if (scheduleBlocks.length === 0) {
    return (
      <div className="w-full max-w-2xl p-8 text-center text-gray-500">
        {strings.scheduleView.emptyState}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-3">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {strings.scheduleView.title}
      </h2>
      {scheduleBlocks.map((block) => {
        const task = taskMap.get(block.taskId);
        const taskName = task?.name || 'Unknown Task';
        const duration = getDuration(block);
        const startTime = formatTime(block.startTime);

        return (
          <div
            key={block.id}
            className={`border rounded-lg p-4 transition-all ${getStatusStyles(block.status)}`}
            data-testid={`schedule-block-${block.id}`}
            data-status={block.status}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-baseline gap-3">
                  <span
                    className="text-lg font-medium text-gray-900"
                    data-testid="task-name"
                  >
                    {taskName}
                  </span>
                  <span
                    className="text-sm text-gray-600"
                    data-testid="start-time"
                  >
                    {startTime}
                  </span>
                  <span
                    className="text-sm text-gray-500"
                    data-testid="duration"
                  >
                    {duration} {strings.scheduleView.durationLabel}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleStartClick(block)}
                disabled={block.status === 'completed'}
                className={`px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:cursor-not-allowed ${getButtonStyles(block.status)}`}
                data-testid="start-button"
                aria-label={`${getButtonText(block.status)} ${taskName}`}
              >
                {getButtonText(block.status)}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
