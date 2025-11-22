import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  createNotificationService,
  NotificationOptions,
  NotificationType,
} from './notifications';

describe('Notification Service - Property-Based Tests', () => {
  // Feature: clippy-task-scheduler, Property 17: Session events trigger notifications
  // Validates: Requirements 6.1, 6.2
  it('Property 17: Session events trigger notifications with task name', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<NotificationType>('session_start', 'session_complete'),
        fc.string({ minLength: 1, maxLength: 100 }),
        (notificationType, taskName) => {
          // Track if notification was sent
          let notificationSent = false;
          let capturedMessage = '';

          // Create service with custom fallback handler
          const service = createNotificationService((message: string) => {
            notificationSent = true;
            capturedMessage = message;
          });

          // Send notification
          const options: NotificationOptions = {
            type: notificationType,
            taskName,
          };

          service.sendNotification(options);

          // Verify notification was sent
          expect(notificationSent).toBe(true);

          // Verify message contains task name
          expect(capturedMessage).toContain(taskName);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: clippy-task-scheduler, Property 18: Notification fallback on permission denial
  // Validates: Requirements 6.5
  it('Property 18: Notification fallback on permission denial', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<NotificationType>(
          'session_start',
          'session_complete',
          'session_overrun'
        ),
        fc.string({ minLength: 1, maxLength: 100 }),
        (notificationType, taskName) => {
          // Track if fallback was called
          let fallbackCalled = false;
          let capturedMessage = '';

          // Create service with custom fallback handler
          const service = createNotificationService((message: string) => {
            fallbackCalled = true;
            capturedMessage = message;
          });

          // Send notification (will use fallback since we're in test environment)
          const options: NotificationOptions = {
            type: notificationType,
            taskName,
          };

          service.sendNotification(options);

          // Verify fallback was called (since Notification API won't be available in test)
          expect(fallbackCalled).toBe(true);

          // Verify message contains task name
          expect(capturedMessage).toContain(taskName);
        }
      ),
      { numRuns: 100 }
    );
  });
});
