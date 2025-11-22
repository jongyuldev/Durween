/**
 * Clipboard Helper Module
 *
 * TODO: Implement clipboard integration to allow users to quickly capture
 * tasks from external sources and paste them into Clippy.
 *
 * Future implementation should:
 * - Monitor clipboard for task-like content
 * - Parse clipboard content for potential tasks
 * - Provide quick-add suggestions from clipboard
 * - Support copying schedule to clipboard for sharing
 * - Handle clipboard permissions gracefully
 */

export interface ClipboardHelper {
  /**
   * Read current clipboard content
   * @returns clipboard text content
   */
  readClipboard(): Promise<string>;

  /**
   * Write content to clipboard
   * @param content - Text to write to clipboard
   */
  writeClipboard(content: string): Promise<void>;

  /**
   * Check if clipboard contains task-like content
   * @returns true if clipboard appears to contain tasks
   */
  hasTaskContent(): Promise<boolean>;

  /**
   * Parse clipboard content into potential tasks
   * @returns array of suggested task strings
   */
  extractTasksFromClipboard(): Promise<string[]>;

  /**
   * Format schedule as text for clipboard export
   * @param scheduleBlocks - Schedule blocks to format
   * @returns formatted text representation
   */
  formatScheduleForClipboard(scheduleBlocks: any[]): string;

  /**
   * Request clipboard permissions if needed
   * @returns true if permissions granted
   */
  requestPermissions(): Promise<boolean>;
}

// TODO: Implement concrete ClipboardHelper class
// TODO: Use Clipboard API (navigator.clipboard)
// TODO: Handle permission denials gracefully
// TODO: Consider security implications of clipboard access
