# Requirements Document

## Introduction

Clippy is a desktop/web assistant designed to help users manage their time and tasks effectively. The first core feature focuses on automatic scheduling and timeboxing, allowing users to quickly input tasks, generate daily schedules, and track their focus time through timed work sessions. The system uses a greedy scheduling algorithm to fit tasks into user-defined work hours and provides notifications and analytics to support productivity.

## Glossary

- **Clippy**: The desktop/web assistant application
- **Task**: A unit of work with a name and duration that needs to be completed
- **Schedule Block**: A time slot in the daily schedule assigned to a specific task
- **Timebox Session**: A focused work period where the user actively works on a scheduled task
- **Greedy Scheduler**: An algorithm that assigns tasks to available time slots in order of input
- **Work Hours**: User-defined time periods during which tasks can be scheduled
- **Fixed Event**: A pre-existing calendar commitment that blocks scheduling time
- **Analytics Event**: A tracked user action or system event for measuring usage patterns
- **Persistence Layer**: The local storage mechanism (IndexedDB or SQLite) for saving application state

## Requirements

### Requirement 1

**User Story:** As a user, I want to quickly add tasks using short notation or natural language, so that I can capture my work without interrupting my flow.

#### Acceptance Criteria

1. WHEN a user enters text in the format "taskName(duration)", THE Clippy SHALL parse it into a task with the specified name and duration in minutes
2. WHEN a user enters natural language like "Do emails for 20 minutes, then report for 90", THE Clippy SHALL extract multiple tasks with their respective durations
3. WHEN a user submits a task input, THE Clippy SHALL validate that the duration is a positive number
4. WHEN parsing fails due to invalid format, THE Clippy SHALL display a clear error mesd preserve the user's input
5. WHEN a task is successfully parsed, THE Clippy SHALL add it to the task list and clear the input field

### Requirement 2

**User Story:** As a user, I want the system to automatically generate a daily schedule from my tasks, so that I can see when I should work on each item.

#### Acceptance Criteria

1. WHEN a user requests schedule generation, THE Clippy SHALL apply the greedy scheduling algorithm to assign tasks to available time slots
2. WHEN scheduling tasks, THE Clippy SHALL respect user-defined work hours and not schedule tasks outside these periods
3. WHEN fixed calendar events exist, THE Clippy SHALL exclude those time periods from available scheduling slots
4. WHEN tasks cannot fit into available time, THE Clippy SHALL maintain a list of unscheduled tasks
5. WHEN schedule generation completes, THE Clippy SHALL display ordered schedule blocks with start times and task names

### Requirement 3

**User Story:** As a user, I want to start, pause, resume, and finish timebox sessions, so that I can track my focused work time accurately.

#### Acceptance Criteria

1. WHEN a user starts a timebox session, THE Clippy SHALL begin tracking elapsed time and display a running timer
2. WHEN a user pauses a session, THE Clippy SHALL stop the timer and preserve the accumulated time
3. WHEN a user resumes a paused session, THE Clippy SHALL continue tracking time from the previous accumulated value
4. WHEN a user finishes a session, THE Clippy SHALL mark the task as completed and stop the timer
5. WHEN a session is active, THE Clippy SHALL send a notification when the allocated time is exceeded

### Requirement 4

**User Story:** As a user, I want my tasks, schedules, and sessions to persist locally, so that I don't lose my data when I close the application.

#### Acceptance Criteria

1. WHEN a task is created, THE Clippy SHALL store it in the local persistence layer immediately
2. WHEN a schedule is generated, THE Clippy SHALL persist all schedule blocks to local storage
3. WHEN a timebox session state changes, THE Clippy SHALL update the session record in the persistence layer
4. WHEN the application loads, THE Clippy SHALL restore all tasks, schedule blocks, and active sessions from local storage
5. WHEN an active session exists during page reload, THE Clippy SHALL restore the timer state with the correct accumulated time

### Requirement 5

**User Story:** As a user, I want to see my daily schedule with sortable blocks and a timer panel, so that I can manage my time visually.

#### Acceptance Criteria

1. WHEN the schedule view loads, THE Clippy SHALL display all schedule blocks in chronological order with start times
2. WHEN a schedule block is displayed, THE Clippy SHALL show the task name, duration, and a start button
3. WHEN the timer panel is active, THE Clippy SHALL display the current task name, elapsed time, and control buttons
4. WHEN a user interacts with the quick-add input, THE Clippy SHALL provide immediate visual feedback
5. WHEN schedule blocks are rendered, THE Clippy SHALL visually distinguish between scheduled, in-progress, and completed tasks

### Requirement 6

**User Story:** As a user, I want to receive notifications for session events, so that I stay aware of my time commitments.

#### Acceptance Criteria

1. WHEN a timebox session starts, THE Clippy SHALL send a local notification indicating the task name
2. WHEN a timebox session ends normally, THE Clippy SHALL send a completion notification
3. WHEN a session exceeds its allocated duration, THE Clippy SHALL send an overrun notification
4. WHEN the user has granted notification permissions, THE Clippy SHALL display all notifications through the browser notification API
5. WHEN notification permissions are denied, THE Clippy SHALL display in-app alerts as a fallback

### Requirement 7

**User Story:** As a user, I want to see analytics about my completed tasks and focus time, so that I can understand my productivity patterns.

#### Acceptance Criteria

1. WHEN a user views the analytics panel, THE Clippy SHALL display the total number of completed tasks for the current day
2. WHEN a user views the analytics panel, THE Clippy SHALL display the total focus minutes accumulated across all completed sessions
3. WHEN a schedule is generated, THE Clippy SHALL record a "schedule_generated" analytics event with timestamp
4. WHEN a timebox session starts, THE Clippy SHALL record a "timebox_started" event with task identifier and timestamp
5. WHEN a task is completed, THE Clippy SHALL record a "task_completed" event with task identifier, duration, and timestamp

### Requirement 8

**User Story:** As a user, I want the application to track various user actions, so that the system can provide insights and improve over time.

#### Acceptance Criteria

1. WHEN a user pauses a session, THE Clippy SHALL record a "timebox_paused" analytics event
2. WHEN a user resumes a session, THE Clippy SHALL record a "timebox_resumed" analytics event
3. WHEN a user accepts a system suggestion, THE Clippy SHALL record a "suggestion_accepted" analytics event
4. WHEN analytics events are recorded, THE Clippy SHALL persist them to the local storage
5. WHEN analytics events are stored, THE Clippy SHALL include event type, timestamp, and relevant context data

### Requirement 9

**User Story:** As a user, I want the system to provide helpful microcopy and nudges, so that I stay on track with my work.

#### Acceptance Criteria

1. WHEN a user is idle while a timer is running, THE Clippy SHALL display a gentle nudge message
2. WHEN a task is overrunning its allocated time, THE Clippy SHALL show a notification with encouraging microcopy
3. WHEN the application displays messages, THE Clippy SHALL use consistent, friendly language from a centralized strings file
4. WHEN nudges are displayed, THE Clippy SHALL not interrupt the user's workflow aggressively
5. WHEN microcopy is shown, THE Clippy SHALL maintain a supportive and non-judgmental tone

### Requirement 10

**User Story:** As a developer, I want the codebase to have clear separation between parsing, scheduling, storage, and UI components, so that the system is maintainable and testable.

#### Acceptance Criteria

1. WHEN the task parser is invoked, THE Clippy SHALL operate independently of UI and storage components
2. WHEN the scheduler generates a schedule, THE Clippy SHALL accept inputs through well-defined interfaces without coupling to specific implementations
3. WHEN the persistence layer is accessed, THE Clippy SHALL provide a consistent API that abstracts the underlying storage mechanism
4. WHEN UI components render, THE Clippy SHALL receive data through props or hooks without direct storage access
5. WHEN any core module is modified, THE Clippy SHALL maintain backward compatibility with existing interfaces

