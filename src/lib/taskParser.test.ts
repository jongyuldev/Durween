import { describe, it, expect } from 'vitest';
import { DefaultTaskParser } from './taskParser';

describe('Task Parser - Unit Tests for Edge Cases', () => {
  const parser = new DefaultTaskParser();

  describe('Empty input', () => {
    it('should return error for empty string', () => {
      const result = parser.parse('');
      expect(result.tasks).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Please enter a task');
    });

    it('should return error for whitespace-only string', () => {
      const result = parser.parse('   ');
      expect(result.tasks).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Please enter a task');
    });
  });

  describe('Malformed input', () => {
    it('should return error for task without duration', () => {
      const result = parser.parse('taskname');
      expect(result.tasks).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Unable to parse task');
    });

    it('should return error for duration without task name', () => {
      const result = parser.parse('(30)');
      expect(result.tasks).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Unable to parse task');
    });

    it('should return error for mismatched parentheses', () => {
      const result = parser.parse('task(30');
      expect(result.tasks).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Unable to parse task');
    });

    it('should return error for natural language without "for"', () => {
      const result = parser.parse('do emails 20 minutes');
      expect(result.tasks).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Unable to parse task');
    });

    it('should return error for natural language without "do"', () => {
      const result = parser.parse('emails for 20 minutes');
      expect(result.tasks).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Unable to parse task');
    });
  });

  describe('Boundary duration values', () => {
    it('should accept duration of 1 minute', () => {
      const result = parser.parse('task(1)');
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].durationMinutes).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept very large duration', () => {
      const result = parser.parse('task(9999)');
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].durationMinutes).toBe(9999);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject duration of 0', () => {
      const result = parser.parse('task(0)');
      expect(result.tasks).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Duration must be a positive number');
    });

    it('should reject negative duration', () => {
      const result = parser.parse('task(-5)');
      expect(result.tasks).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Duration must be a positive number');
    });
  });

  describe('Mixed valid and invalid tasks', () => {
    it('should parse valid tasks and report errors for invalid ones', () => {
      const result = parser.parse('task1(30), task2(0), task3(45)');
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].name).toBe('task1');
      expect(result.tasks[0].durationMinutes).toBe(30);
      expect(result.tasks[1].name).toBe('task3');
      expect(result.tasks[1].durationMinutes).toBe(45);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Duration must be a positive number');
    });
  });

  describe('Task properties', () => {
    it('should generate unique IDs for each task', () => {
      const result = parser.parse('task1(30), task2(45)');
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].id).not.toBe(result.tasks[1].id);
    });

    it('should set completed to false for new tasks', () => {
      const result = parser.parse('task(30)');
      expect(result.tasks[0].completed).toBe(false);
    });

    it('should set createdAt timestamp', () => {
      const before = new Date();
      const result = parser.parse('task(30)');
      const after = new Date();
      expect(result.tasks[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(result.tasks[0].createdAt.getTime()).toBeLessThanOrEqual(
        after.getTime()
      );
    });
  });

  describe('Natural language format edge cases', () => {
    it('should handle "minute" singular', () => {
      const result = parser.parse('do task for 1 minute');
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].name).toBe('task');
      expect(result.tasks[0].durationMinutes).toBe(1);
    });

    it('should handle "minutes" plural', () => {
      const result = parser.parse('do task for 30 minutes');
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].name).toBe('task');
      expect(result.tasks[0].durationMinutes).toBe(30);
    });

    it('should trim whitespace from task names', () => {
      const result = parser.parse('do   task with spaces   for 30 minutes');
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].name).toBe('task with spaces');
    });
  });
});
