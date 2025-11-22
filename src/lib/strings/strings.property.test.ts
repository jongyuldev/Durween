import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { strings, formatString } from './index';
import { createNotificationService, NotificationType } from '../notifications';
import { taskParser } from '../taskParser';

describe('Centralized Strings - Property-Based Tests', () => {
  // Feature: clippy-task-scheduler, Property 22: Messages use centralized strings
  // Validates: Requirements 9.3
  it('Property 22: All notification messages use centralized strings', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<NotificationType>(
          'session_start',
          'session_complete',
          'session_overrun'
        ),
        fc.string({ minLength: 1, maxLength: 100 }),
        (notificationType, taskName) => {
          // Track captured message
          let capturedMessage = '';

          // Create service with custom fallback handler
          const service = createNotificationService((message: string) => {
            capturedMessage = message;
          });

          // Send notification
          service.sendNotification({
            type: notificationType,
            taskName,
          });

          // Verify message uses centralized strings
          // The message should contain the formatted string from our strings file
          let expectedMessage = '';
          switch (notificationType) {
            case 'session_start':
              expectedMessage = formatString(
                strings.notifications.sessionStartMessage,
                { taskName }
              );
              break;
            case 'session_complete':
              expectedMessage = formatString(
                strings.notifications.sessionCompleteMessage,
                { taskName }
              );
              break;
            case 'session_overrun':
              expectedMessage = formatString(
                strings.notifications.sessionOverrunMessage,
                { taskName }
              );
              break;
          }

          // The captured message should contain the expected message
          expect(capturedMessage).toContain(expectedMessage);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: clippy-task-scheduler, Property 22: Messages use centralized strings
  // Validates: Requirements 9.3
  it('Property 22: All parser error messages use centralized strings', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''), // Empty input
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter(
              (s) =>
                !s.match(/\w+\(\d+\)/) &&
                !s.match(/do\s+.+\s+for\s+\d+\s+minutes?/i)
            ), // Invalid format
          fc
            .tuple(
              fc.string({ minLength: 1 }),
              fc.integer({ min: -100, max: 0 })
            )
            .map(([name, duration]) => `${name}(${duration})`) // Invalid duration
        ),
        (input) => {
          const result = taskParser.parse(input);

          // If there are errors, they should use centralized strings
          if (result.errors.length > 0) {
            const error = result.errors[0];

            // Check if error matches one of our centralized error strings
            const validErrors = [
              strings.errors.parseEmpty,
              strings.errors.parseInvalidFormat,
              strings.errors.parseInvalidDuration,
            ];

            expect(validErrors).toContain(error);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: clippy-task-scheduler, Property 22: Messages use centralized strings
  // Validates: Requirements 9.3
  it('Property 22: formatString correctly replaces placeholders', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 0, max: 1000 }),
        (taskName, count) => {
          // Test with task name placeholder
          const messageWithTaskName = formatString(
            strings.notifications.sessionStartMessage,
            { taskName }
          );
          expect(messageWithTaskName).toContain(taskName);
          expect(messageWithTaskName).not.toContain('{taskName}');

          // Test with count placeholder
          const messageWithCount = formatString(
            strings.warnings.unscheduledTasks,
            { count }
          );
          expect(messageWithCount).toContain(String(count));
          expect(messageWithCount).not.toContain('{count}');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: clippy-task-scheduler, Property 22: Messages use centralized strings
  // Validates: Requirements 9.3
  it('Property 22: All UI labels are defined in centralized strings', () => {
    // Verify all expected string keys exist
    expect(strings.app).toBeDefined();
    expect(strings.app.title).toBeDefined();
    expect(strings.app.subtitle).toBeDefined();
    expect(strings.app.loading).toBeDefined();

    expect(strings.taskInput).toBeDefined();
    expect(strings.taskInput.placeholder).toBeDefined();
    expect(strings.taskInput.buttonAdd).toBeDefined();
    expect(strings.taskInput.buttonAdding).toBeDefined();

    expect(strings.scheduleView).toBeDefined();
    expect(strings.scheduleView.title).toBeDefined();
    expect(strings.scheduleView.emptyState).toBeDefined();
    expect(strings.scheduleView.buttonStart).toBeDefined();
    expect(strings.scheduleView.buttonInProgress).toBeDefined();
    expect(strings.scheduleView.buttonCompleted).toBeDefined();

    expect(strings.timerPanel).toBeDefined();
    expect(strings.timerPanel.emptyState).toBeDefined();
    expect(strings.timerPanel.currentTaskLabel).toBeDefined();
    expect(strings.timerPanel.elapsedTimeLabel).toBeDefined();
    expect(strings.timerPanel.buttonPause).toBeDefined();
    expect(strings.timerPanel.buttonResume).toBeDefined();
    expect(strings.timerPanel.buttonFinish).toBeDefined();

    expect(strings.analyticsPanel).toBeDefined();
    expect(strings.analyticsPanel.title).toBeDefined();
    expect(strings.analyticsPanel.completedTasksLabel).toBeDefined();
    expect(strings.analyticsPanel.focusMinutesLabel).toBeDefined();

    expect(strings.notifications).toBeDefined();
    expect(strings.notifications.sessionStartTitle).toBeDefined();
    expect(strings.notifications.sessionStartMessage).toBeDefined();
    expect(strings.notifications.sessionCompleteTitle).toBeDefined();
    expect(strings.notifications.sessionCompleteMessage).toBeDefined();
    expect(strings.notifications.sessionOverrunTitle).toBeDefined();
    expect(strings.notifications.sessionOverrunMessage).toBeDefined();

    expect(strings.errors).toBeDefined();
    expect(strings.errors.parseEmpty).toBeDefined();
    expect(strings.errors.parseInvalidFormat).toBeDefined();
    expect(strings.errors.parseInvalidDuration).toBeDefined();
    expect(strings.errors.storageFailed).toBeDefined();
    expect(strings.errors.storageQuotaExceeded).toBeDefined();

    expect(strings.warnings).toBeDefined();
    expect(strings.warnings.unscheduledTasks).toBeDefined();

    expect(strings.nudges).toBeDefined();
    expect(strings.nudges.idle).toBeDefined();
    expect(strings.nudges.overrun).toBeDefined();
  });
});
