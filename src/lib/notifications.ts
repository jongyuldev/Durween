/**
 * Notification service for Clippy task scheduler
 * Wraps Web Notifications API with fallback to in-app alerts
 */

import { strings, formatString } from './strings';

export type NotificationType =
  | 'session_start'
  | 'session_complete'
  | 'session_overrun';

export interface NotificationOptions {
  type: NotificationType;
  taskName: string;
  duration?: number;
}

export interface NotificationService {
  requestPermission(): Promise<NotificationPermission>;
  sendNotification(options: NotificationOptions): Promise<void>;
  getPermissionStatus(): NotificationPermission;
}

/**
 * Default implementation of notification service
 */
export class DefaultNotificationService implements NotificationService {
  private fallbackHandler: (message: string) => void;

  constructor(fallbackHandler?: (message: string) => void) {
    // Default fallback uses window.alert
    this.fallbackHandler =
      fallbackHandler || ((message: string) => window.alert(message));
  }

  async requestPermission(): Promise<NotificationPermission> {
    // Check if Notification API is available
    if (!('Notification' in window)) {
      return 'denied';
    }

    // If already granted or denied, return current status
    if (Notification.permission !== 'default') {
      return Notification.permission;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    return permission;
  }

  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  async sendNotification(options: NotificationOptions): Promise<void> {
    const message = this.formatMessage(options);
    const title = this.formatTitle(options);

    // Check if Notification API is available and permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/vite.svg', // Using default Vite icon
          tag: options.type, // Prevents duplicate notifications
        });
        return;
      } catch (error) {
        // If notification fails, fall back to in-app alert
        console.error('Failed to send notification:', error);
        this.fallbackHandler(`${title}\n${message}`);
        return;
      }
    }

    // Fallback to in-app alert if permission denied or API unavailable
    this.fallbackHandler(`${title}\n${message}`);
  }

  private formatTitle(options: NotificationOptions): string {
    switch (options.type) {
      case 'session_start':
        return strings.notifications.sessionStartTitle;
      case 'session_complete':
        return strings.notifications.sessionCompleteTitle;
      case 'session_overrun':
        return strings.notifications.sessionOverrunTitle;
      default:
        return strings.app.title;
    }
  }

  private formatMessage(options: NotificationOptions): string {
    switch (options.type) {
      case 'session_start':
        return formatString(strings.notifications.sessionStartMessage, {
          taskName: options.taskName,
        });
      case 'session_complete':
        return formatString(strings.notifications.sessionCompleteMessage, {
          taskName: options.taskName,
        });
      case 'session_overrun':
        return formatString(strings.notifications.sessionOverrunMessage, {
          taskName: options.taskName,
        });
      default:
        return options.taskName;
    }
  }
}

/**
 * Factory function to create a notification service instance
 */
export function createNotificationService(
  fallbackHandler?: (message: string) => void
): NotificationService {
  return new DefaultNotificationService(fallbackHandler);
}
