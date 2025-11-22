# Implementation Plan

- [x] 1. Set up project structure and development environment





  - Create React + Vite project with TypeScript
  - Install dependencies: React, Vite, Tailwind CSS, fast-check, Vitest, idb
  - Configure ESLint and Prettier
  - Set up Tailwind CSS configuration
  - Create basic directory structure: /src/api, /src/components, /src/hooks, /src/lib, /src/scheduler, /src/storage
  - Add minimal README with run instructions and MVP scope
  - Create GitHub Actions workflow for running tests
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 2. Implement task parser module





  - Create TypeScript types for Task, ParseResult, and TaskParser interface
  - Implement parser for short notation format "taskName(duration)"
  - Implement parser for natural language format "do X for Y minutes"
  - Add validation for positive duration values
  - Handle multiple tasks in a single input string
  - Return errors for invalid formats while preserving input
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.1 Write property test for parser correctness


  - **Property 1: Parser extracts tasks correctly**
  - **Validates: Requirements 1.1, 1.2**

- [x] 2.2 Write property test for invalid duration rejection


  - **Property 2: Parser rejects invalid durations**
  - **Validates: Requirements 1.3**

- [x] 2.3 Write property test for error handling


  - **Property 3: Parse errors preserve input**
  - **Validates: Requirements 1.4**

- [x] 2.4 Write unit tests for parser edge cases


  - Test empty input
  - Test malformed input
  - Test boundary duration values
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Implement greedy scheduler module





  - Create TypeScript types for ScheduleBlock, WorkHours, FixedEvent, ScheduleInput, ScheduleResult
  - Implement greedy scheduling algorithm that assigns tasks to earliest available slots
  - Add logic to respect work hours boundaries
  - Add logic to avoid fixed event conflicts
  - Track unscheduled tasks when time is insufficient
  - Return schedule blocks in chronological order
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3.1 Write property test for work hours constraint


  - **Property 5: Scheduled blocks respect work hours**
  - **Validates: Requirements 2.2**

- [x] 3.2 Write property test for fixed event avoidance


  - **Property 6: Scheduled blocks avoid fixed events**
  - **Validates: Requirements 2.3**

- [x] 3.3 Write property test for unscheduled task tracking


  - **Property 7: Unscheduled tasks are tracked**
  - **Validates: Requirements 2.4**

- [x] 3.4 Write property test for chronological ordering


  - **Property 8: Schedule blocks are chronologically ordered**
  - **Validates: Requirements 2.5, 5.1**

- [x] 3.5 Write unit tests for scheduler edge cases


  - Test empty task list
  - Test tasks exactly filling work hours
  - Test overlapping fixed events
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Implement timer manager module





  - Create TypeScript types for Session and session status enum
  - Implement startSession function that creates new session and begins tracking
  - Implement pauseSession function that stops timer and preserves accumulated time
  - Implement resumeSession function that continues from paused state
  - Implement finishSession function that marks task complete and stops timer
  - Implement getActiveSession and getElapsedMinutes helper functions
  - Add state machine validation for valid transitions
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4.1 Write property test for session state machine


  - **Property 9: Session state transitions are valid**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [x] 4.2 Write unit tests for timer edge cases


  - Test invalid state transitions
  - Test time accumulation across pause/resume cycles
  - Test session not found errors
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Implement IndexedDB persistence layer





  - Install and configure idb library
  - Create database schema with object stores: tasks, scheduleBlocks, sessions, analyticsEvents, appState
  - Implement Database interface with all CRUD operations
  - Implement addTask, getTasks, updateTask, deleteTask functions
  - Implement addScheduleBlock, getScheduleBlocks, updateScheduleBlock, clearScheduleBlocks functions
  - Implement addSession, getSession, updateSession, getActiveSessions functions
  - Implement addAnalyticsEvent, getAnalyticsEvents functions
  - Add error handling for database unavailable and quota exceeded
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.1 Write property test for task persistence


  - **Property 10: Task persistence round-trip**
  - **Validates: Requirements 4.1**

- [x] 5.2 Write property test for schedule persistence


  - **Property 11: Schedule persistence round-trip**
  - **Validates: Requirements 4.2**

- [x] 5.3 Write property test for session persistence


  - **Property 12: Session state persists across changes**
  - **Validates: Requirements 4.3, 4.5**

- [x] 5.4 Write property test for application state restoration


  - **Property 13: Application state restoration**
  - **Validates: Requirements 4.4**

- [x] 5.5 Write unit tests for storage error handling


  - Test database unavailable fallback
  - Test quota exceeded error
  - Test corrupted data handling
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement analytics tracking module





  - Create TypeScript types for AnalyticsEvent and event type enum
  - Implement recordEvent function that creates and stores analytics events
  - Add event recording for: schedule_generated, timebox_started, timebox_paused, timebox_resumed, task_completed, suggestion_accepted
  - Implement calculateCompletedTasks function for daily task count
  - Implement calculateFocusMinutes function for total session time
  - Ensure all events include type, timestamp, and metadata
  - _Requirements: 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 7.1 Write property test for analytics event recording


  - **Property 20: Analytics events are recorded with complete data**
  - **Validates: Requirements 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.5**

- [x] 7.2 Write property test for analytics persistence

  - **Property 21: Analytics events persist correctly**
  - **Validates: Requirements 8.4**

- [x] 7.3 Write property test for analytics calculations

  - **Property 19: Analytics calculations are accurate**
  - **Validates: Requirements 7.1, 7.2**

- [x] 7.4 Write unit tests for analytics edge cases

  - Test events with missing metadata
  - Test calculation with no completed tasks
  - Test calculation with no sessions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Implement notification service





  - Create notification wrapper for Web Notifications API
  - Implement requestPermission function
  - Implement sendNotification function with fallback to in-app alerts
  - Add notification for session start with task name
  - Add notification for session completion
  - Add notification for session overrun
  - Handle permission denied with in-app alert fallback
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8.1 Write property test for notification triggers


  - **Property 17: Session events trigger notifications**
  - **Validates: Requirements 6.1, 6.2**

- [x] 8.2 Write property test for notification fallback


  - **Property 18: Notification fallback on permission denial**
  - **Validates: Requirements 6.5**

- [x] 8.3 Write unit tests for notification edge cases


  - Test notification API unavailable
  - Test notification send failure
  - Test permission states
  - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [x] 9. Create quick-add task input component





  - Create TaskInput React component with text input and submit button
  - Integrate task parser to handle user input
  - Display parse errors below input field
  - Clear input field on successful parse
  - Add task to storage on successful parse
  - Provide visual feedback on interaction
  - Style with Tailwind CSS
  - _Requirements: 1.4, 1.5, 5.4_

- [x] 9.1 Write property test for successful parse behavior


  - **Property 4: Successful parse adds task and clears input**
  - **Validates: Requirements 1.5**

- [x] 9.2 Write unit tests for TaskInput component


  - Test input validation
  - Test error display
  - Test successful submission
  - _Requirements: 1.4, 1.5_

- [x] 10. Create schedule display component



  - Create ScheduleView React component
  - Display schedule blocks in chronological order
  - Show start time, task name, and duration for each block
  - Add start button for each scheduled block
  - Visually distinguish between scheduled, in-progress, and completed blocks
  - Style with Tailwind CSS for clean, readable layout
  - _Requirements: 2.5, 5.1, 5.2, 5.5_

- [x] 10.1 Write property test for schedule block rendering


  - **Property 14: Schedule blocks contain required display information**
  - **Validates: Requirements 5.2**

- [x] 10.2 Write property test for status visual distinction



  - **Property 16: Block status affects visual rendering**
  - **Validates: Requirements 5.5**

- [x] 10.3 Write unit tests for ScheduleView component


  - Test empty schedule display
  - Test block ordering
  - Test status styling
  - _Requirements: 2.5, 5.1, 5.2, 5.5_

- [x] 11. Create timer panel component





  - Create TimerPanel React component
  - Display current task name when session is active
  - Display elapsed time with live updates
  - Add pause/resume button that changes based on session state
  - Add finish button to complete session
  - Integrate with timer manager for state updates
  - Style with Tailwind CSS
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.3_

- [x] 11.1 Write property test for timer panel display


  - **Property 15: Timer panel displays session information**
  - **Validates: Requirements 5.3**

- [x] 11.2 Write unit tests for TimerPanel component


  - Test display with no active session
  - Test pause/resume button states
  - Test time formatting
  - _Requirements: 3.1, 3.2, 3.3, 5.3_

- [x] 12. Create analytics display component





  - Create AnalyticsPanel React component
  - Display total completed tasks for current day
  - Display total focus minutes for current day
  - Fetch data from analytics module
  - Update display when new tasks complete or sessions finish
  - Style with Tailwind CSS
  - _Requirements: 7.1, 7.2_

- [x] 12.1 Write unit tests for AnalyticsPanel component


  - Test display with no data
  - Test display with completed tasks
  - Test display with focus minutes
  - _Requirements: 7.1, 7.2_

- [x] 13. Implement main App component and state management





  - Create App.tsx with main application layout
  - Set up React state for tasks, schedule blocks, and active session
  - Implement schedule generation trigger
  - Wire up TaskInput to add tasks
  - Wire up ScheduleView to display schedule and start sessions
  - Wire up TimerPanel to control active session
  - Wire up AnalyticsPanel to display stats
  - Load initial state from storage on mount
  - Persist state changes to storage
  - _Requirements: 1.5, 2.1, 3.1, 4.4, 5.1_

- [x] 13.1 Write integration tests for App component


  - Test full flow: add task → generate schedule → start session → complete task
  - Test state persistence across simulated reload
  - Test error handling
  - _Requirements: 1.5, 2.1, 3.1, 4.4_

- [x] 14. Implement session restoration on page load





  - Add logic to detect active session in storage on app mount
  - Restore timer state with correct accumulated time
  - Resume timer display in TimerPanel
  - Trigger notification if session was overrun during reload
  - _Requirements: 4.5_

- [x] 14.1 Write unit tests for session restoration


  - Test restoration with active session
  - Test restoration with paused session
  - Test restoration with no active session
  - _Requirements: 4.5_

- [x] 15. Create microcopy strings file





  - Create /src/lib/strings/en.json with all UI text
  - Add strings for notifications (session start, completion, overrun)
  - Add strings for nudges (idle, overrun)
  - Add strings for errors (parse errors, storage errors)
  - Add strings for UI labels and buttons
  - Ensure all displayed text references this file
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 15.1 Write property test for centralized strings


  - **Property 22: Messages use centralized strings**
  - **Validates: Requirements 9.3**

- [x] 16. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Scaffold future features (interfaces only)





  - Create /src/lib/idleDetection.ts with IdleDetector interface and TODO comments
  - Create /src/lib/clipboardHelper.ts with ClipboardHelper interface and TODO comments
  - Create /src/lib/projectAutomation.ts with ProjectAutomation interface and TODO comments
  - Create /src/lib/personality.ts with PersonalityLayer interface and TODO comments
  - Create /src/api/calendar.ts with CalendarIntegration interface and TODO comments
  - Add placeholder test files for each future feature
  - _Requirements: None (future scaffolding)_

- [x] 18. Add final polish and documentation





  - Update README with complete setup instructions
  - Add usage examples to README
  - Document all public APIs with JSDoc comments
  - Add inline code comments for complex logic
  - Verify all ESLint and Prettier rules pass
  - Test application end-to-end manually
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 19. Final Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

