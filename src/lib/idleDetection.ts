/**
 * Idle Detection Module
 *
 * TODO: Implement idle detection functionality to monitor user activity
 * and provide gentle nudges when the user is idle during an active session.
 *
 * Future implementation should:
 * - Track mouse movements, keyboard input, and other user interactions
 * - Define configurable idle threshold (e.g., 5 minutes of inactivity)
 * - Emit events when user becomes idle or active
 * - Integrate with timer manager to detect idle time during sessions
 * - Provide gentle nudges without being intrusive
 */

export interface IdleDetector {
  /**
   * Start monitoring user activity
   * @param idleThresholdMinutes - Minutes of inactivity before considered idle
   */
  startMonitoring(idleThresholdMinutes: number): void;

  /**
   * Stop monitoring user activity
   */
  stopMonitoring(): void;

  /**
   * Check if user is currently idle
   * @returns true if user has been inactive beyond threshold
   */
  isIdle(): boolean;

  /**
   * Get minutes since last user activity
   * @returns minutes of inactivity
   */
  getIdleMinutes(): number;

  /**
   * Register callback for idle state changes
   * @param callback - Function to call when idle state changes
   */
  onIdleStateChange(callback: (isIdle: boolean) => void): void;
}

// TODO: Implement concrete IdleDetector class
// TODO: Consider using browser APIs like requestIdleCallback or custom event listeners
// TODO: Handle edge cases like browser tab visibility changes
