import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createNotificationService,
  DefaultNotificationService,
} from './notifications';

describe('Notification Service - Unit Tests', () => {
  describe('Edge Cases', () => {
    it('should handle notification API unavailable', () => {
      // Track fallback calls
      let fallbackCalled = false;
      let capturedMessage = '';

      const service = createNotificationService((message: string) => {
        fallbackCalled = true;
        capturedMessage = message;
      });

      // Send notification
      service.sendNotification({
        type: 'session_start',
        taskName: 'Test Task',
      });

      // Should use fallback when API unavailable
      expect(fallbackCalled).toBe(true);
      expect(capturedMessage).toContain('Test Task');
    });

    it('should handle all permission states', () => {
      const service = createNotificationService();

      // In test environment, permission should be 'denied' (no Notification API)
      const permission = service.getPermissionStatus();
      expect(['granted', 'denied', 'default']).toContain(permission);
    });

    it('should format session start notifications correctly', () => {
      let capturedMessage = '';

      const service = createNotificationService((message: string) => {
        capturedMessage = message;
      });

      service.sendNotification({
        type: 'session_start',
        taskName: 'Email Review',
      });

      expect(capturedMessage).toContain('Session Started');
      expect(capturedMessage).toContain('Email Review');
    });

    it('should format session complete notifications correctly', () => {
      let capturedMessage = '';

      const service = createNotificationService((message: string) => {
        capturedMessage = message;
      });

      service.sendNotification({
        type: 'session_complete',
        taskName: 'Code Review',
      });

      expect(capturedMessage).toContain('Session Complete');
      expect(capturedMessage).toContain('Code Review');
    });

    it('should format session overrun notifications correctly', () => {
      let capturedMessage = '';

      const service = createNotificationService((message: string) => {
        capturedMessage = message;
      });

      service.sendNotification({
        type: 'session_overrun',
        taskName: 'Meeting Prep',
      });

      expect(capturedMessage).toContain('Time Exceeded');
      expect(capturedMessage).toContain('Meeting Prep');
    });

    it('should use default fallback handler when none provided', () => {
      // Create service without custom fallback
      const service = createNotificationService();

      // Should not throw when sending notification
      expect(() => {
        service.sendNotification({
          type: 'session_start',
          taskName: 'Test',
        });
      }).not.toThrow();
    });

    it('should handle empty task names gracefully', () => {
      let capturedMessage = '';

      const service = createNotificationService((message: string) => {
        capturedMessage = message;
      });

      service.sendNotification({
        type: 'session_start',
        taskName: '',
      });

      // Should still send notification even with empty task name
      expect(capturedMessage).toBeTruthy();
    });

    it('should handle very long task names', () => {
      let capturedMessage = '';

      const service = createNotificationService((message: string) => {
        capturedMessage = message;
      });

      const longTaskName = 'A'.repeat(500);

      service.sendNotification({
        type: 'session_start',
        taskName: longTaskName,
      });

      expect(capturedMessage).toContain(longTaskName);
    });
  });

  describe('Permission Handling', () => {
    it('should return permission status', () => {
      const service = createNotificationService();
      const status = service.getPermissionStatus();

      // In test environment, should be 'denied' (no Notification API)
      expect(status).toBe('denied');
    });

    it('should handle requestPermission when API unavailable', async () => {
      const service = createNotificationService();
      const permission = await service.requestPermission();

      // Should return 'denied' when API unavailable
      expect(permission).toBe('denied');
    });
  });
});
