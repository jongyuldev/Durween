import { useState, useEffect } from 'react';
import { database } from '../lib/database';
import {
  calculateCompletedTasks,
  calculateFocusMinutes,
} from '../lib/analytics';
import { strings } from '../lib/strings';

/**
 * Props for the AnalyticsPanel component.
 */
interface AnalyticsPanelProps {
  /** Date to calculate analytics for (defaults to today) */
  date?: Date;
}

/**
 * Analytics dashboard component showing daily productivity stats.
 *
 * Displays two metrics:
 * - Completed tasks: Total number of tasks finished for the date
 * - Focus minutes: Total time spent in completed sessions for the date
 *
 * Automatically fetches and updates data when the date prop changes.
 *
 * @example
 * ```tsx
 * <AnalyticsPanel date={new Date()} />
 * ```
 */
export function AnalyticsPanel({ date = new Date() }: AnalyticsPanelProps) {
  const [completedTasks, setCompletedTasks] = useState<number>(0);
  const [focusMinutes, setFocusMinutes] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const [tasks, minutes] = await Promise.all([
          calculateCompletedTasks(database, date),
          calculateFocusMinutes(database, date),
        ]);

        setCompletedTasks(tasks);
        setFocusMinutes(minutes);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        // Set to 0 on error
        setCompletedTasks(0);
        setFocusMinutes(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [date]);

  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {strings.analyticsPanel.title}
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Completed Tasks Card */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center">
            <div
              className="text-4xl font-bold text-blue-600 mb-2"
              data-testid="completed-tasks-count"
            >
              {isLoading
                ? strings.analyticsPanel.loadingPlaceholder
                : completedTasks}
            </div>
            <div className="text-sm text-gray-600 text-center">
              {strings.analyticsPanel.completedTasksLabel}
            </div>
          </div>
        </div>

        {/* Focus Minutes Card */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center">
            <div
              className="text-4xl font-bold text-green-600 mb-2"
              data-testid="focus-minutes-count"
            >
              {isLoading
                ? strings.analyticsPanel.loadingPlaceholder
                : focusMinutes}
            </div>
            <div className="text-sm text-gray-600 text-center">
              {strings.analyticsPanel.focusMinutesLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
