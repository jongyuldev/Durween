/**
 * Personality Layer Module
 *
 * TODO: Implement personality layer to make Clippy feel more engaging
 * and supportive through contextual messages and encouragement.
 *
 * Future implementation should:
 * - Generate contextual messages based on user behavior
 * - Provide encouraging feedback on task completion
 * - Adapt tone based on time of day and user patterns
 * - Offer helpful suggestions without being intrusive
 * - Maintain consistent, friendly personality
 */

export interface PersonalityContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  tasksCompletedToday: number;
  currentStreak: number;
  userMood?: 'productive' | 'struggling' | 'neutral';
}

export interface PersonalityMessage {
  text: string;
  tone: 'encouraging' | 'celebratory' | 'supportive' | 'informative';
  priority: 'low' | 'medium' | 'high';
}

export interface PersonalityLayer {
  /**
   * Generate a contextual message based on current state
   * @param context - Current user and system context
   * @returns personalized message
   */
  generateMessage(context: PersonalityContext): PersonalityMessage;

  /**
   * Get encouragement message for task completion
   * @param taskName - Name of completed task
   * @param isOnTime - Whether task was completed within allocated time
   * @returns encouraging message
   */
  getCompletionMessage(taskName: string, isOnTime: boolean): string;

  /**
   * Get nudge message for idle user
   * @param idleMinutes - Minutes user has been idle
   * @returns gentle nudge message
   */
  getIdleNudge(idleMinutes: number): string;

  /**
   * Get message for session overrun
   * @param taskName - Name of overrunning task
   * @param overrunMinutes - Minutes over allocated time
   * @returns supportive message
   */
  getOverrunMessage(taskName: string, overrunMinutes: number): string;

  /**
   * Get motivational message for starting the day
   * @param scheduledTaskCount - Number of tasks scheduled for today
   * @returns motivational message
   */
  getMorningMessage(scheduledTaskCount: number): string;

  /**
   * Get end-of-day summary message
   * @param completedTasks - Number of completed tasks
   * @param focusMinutes - Total focus minutes
   * @returns summary message
   */
  getEndOfDayMessage(completedTasks: number, focusMinutes: number): string;
}

// TODO: Implement concrete PersonalityLayer class
// TODO: Create message templates with variable substitution
// TODO: Consider user preferences for personality intensity
// TODO: Add A/B testing for message effectiveness
// TODO: Ensure messages remain supportive and non-judgmental
