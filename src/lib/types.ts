// Core domain types for Clippy task scheduler

export interface Task {
  id: string;
  name: string;
  durationMinutes: number;
  createdAt: Date;
  completed: boolean;
}

export interface ParseResult {
  tasks: Task[];
  errors: string[];
}

export interface TaskParser {
  parse(input: string): ParseResult;
}

// Schedule block with time assignment
export interface ScheduleBlock {
  id: string;
  taskId: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'in-progress' | 'completed';
}

// User availability configuration
export interface WorkHours {
  startHour: number; // 0-23
  startMinute: number; // 0-59
  endHour: number;
  endMinute: number;
}

// Fixed calendar event
export interface FixedEvent {
  id: string;
  startTime: Date;
  endTime: Date;
  title: string;
}

// Scheduler input
export interface ScheduleInput {
  tasks: Task[];
  workHours: WorkHours;
  fixedEvents: FixedEvent[];
  scheduleDate: Date;
}

// Scheduler result
export interface ScheduleResult {
  scheduledBlocks: ScheduleBlock[];
  unscheduledTasks: Task[];
}

// Scheduler interface
export interface Scheduler {
  generateSchedule(input: ScheduleInput): ScheduleResult;
}

// Session status enum
export type SessionStatus = 'active' | 'paused' | 'completed';

// Timebox session tracking
export interface Session {
  id: string;
  taskId: string;
  scheduleBlockId: string;
  startTime: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  completedAt?: Date;
  accumulatedMinutes: number;
  status: SessionStatus;
}

// Timer Manager interface
export interface TimerManager {
  startSession(taskId: string, scheduleBlockId: string): Session;
  pauseSession(sessionId: string): Session;
  resumeSession(sessionId: string): Session;
  finishSession(sessionId: string): Session;
  getActiveSession(): Session | null;
  getElapsedMinutes(sessionId: string): number;
  restoreSession?(session: Session): void;
}

// Analytics event types
export type AnalyticsEventType =
  | 'schedule_generated'
  | 'timebox_started'
  | 'timebox_paused'
  | 'timebox_resumed'
  | 'task_completed'
  | 'suggestion_accepted';

// Analytics event
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: Date;
  metadata: Record<string, any>;
}

// Database interface
export interface Database {
  // Tasks
  addTask(task: Task): Promise<void>;
  getTasks(): Promise<Task[]>;
  updateTask(task: Task): Promise<void>;
  deleteTask(taskId: string): Promise<void>;

  // Schedule blocks
  addScheduleBlock(block: ScheduleBlock): Promise<void>;
  getScheduleBlocks(date: Date): Promise<ScheduleBlock[]>;
  updateScheduleBlock(block: ScheduleBlock): Promise<void>;
  clearScheduleBlocks(date: Date): Promise<void>;

  // Sessions
  addSession(session: Session): Promise<void>;
  getSession(sessionId: string): Promise<Session | null>;
  updateSession(session: Session): Promise<void>;
  getActiveSessions(): Promise<Session[]>;

  // Analytics
  addAnalyticsEvent(event: AnalyticsEvent): Promise<void>;
  getAnalyticsEvents(startDate: Date, endDate: Date): Promise<AnalyticsEvent[]>;
}
