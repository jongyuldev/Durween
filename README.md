# Clippy Task Scheduler

A desktop/web assistant for automatic scheduling and timeboxing. Clippy helps you manage your time effectively by parsing tasks from natural language input, automatically scheduling them into your work hours, and tracking your focus time through timed work sessions.

## Features

### Core Functionality

- **Quick Task Input**: Add tasks using short notation `taskName(duration)` or natural language like "Do emails for 20 minutes"
- **Automatic Scheduling**: Greedy algorithm fits tasks into your work hours while avoiding conflicts with fixed events
- **Timebox Sessions**: Start, pause, resume, and finish focused work sessions with live timer tracking
- **Local Persistence**: All data stored locally using IndexedDB - no server required
- **Analytics Dashboard**: Track completed tasks and focus minutes for the current day
- **Smart Notifications**: Browser notifications for session start, completion, and overrun events

### Technical Highlights

- Property-based testing with fast-check for comprehensive correctness verification
- Type-safe TypeScript implementation with strict mode enabled
- Modular architecture with clear separation of concerns
- Accessible UI with ARIA labels and keyboard navigation support

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** (comes with Node.js)
- A modern web browser (Chrome, Firefox, Safari, or Edge)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd clippy-task-scheduler
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to [http://localhost:5173](http://localhost:5173)

### First-Time Setup

When you first open Clippy:

1. **Grant notification permissions** when prompted (optional but recommended)
2. The app will use default work hours (9 AM - 5 PM)
3. Start adding tasks using the input field at the top

## Usage Guide

### Adding Tasks

Clippy supports two input formats:

**Short Notation:**
```
emails(20)
```
This creates a task named "emails" with a 20-minute duration.

**Natural Language:**
```
Do emails for 20 minutes, then report for 90 minutes
```
This creates two tasks: "emails" (20 min) and "report" (90 min).

**Multiple Tasks:**
You can add multiple tasks at once by separating them with commas or using multiple natural language phrases.

### Generating a Schedule

1. Add all your tasks for the day
2. Click the "Generate Schedule" button
3. Clippy will automatically fit tasks into your work hours in the order you added them
4. Tasks that don't fit will appear in the "Unscheduled Tasks" section

### Working with Timebox Sessions

1. **Start a session**: Click the "Start" button next to any scheduled task
2. **Pause**: Click "Pause" to temporarily stop the timer (accumulated time is preserved)
3. **Resume**: Click "Resume" to continue from where you paused
4. **Finish**: Click "Finish" to mark the task as complete

The timer will:
- Display elapsed time in MM:SS format
- Update every second while active
- Send a notification when the allocated time is exceeded
- Persist across page reloads (you won't lose your progress)

### Viewing Analytics

The analytics panel shows:
- **Completed Tasks**: Total number of tasks finished today
- **Focus Minutes**: Total time spent in completed sessions today

Analytics automatically update as you complete tasks.

## Development

### Running Tests

```bash
# Run all tests once (unit + property-based)
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with interactive UI
npm run test:ui
```

The test suite includes:
- **Unit tests**: Specific examples and edge cases
- **Property-based tests**: Randomized testing with fast-check (100+ iterations per property)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory. You can preview the production build with:

```bash
npm run preview
```

### Code Quality

```bash
# Check for linting errors
npm run lint

# Auto-format code with Prettier
npm run format
```

## Project Structure

```
src/
├── api/                    # Future: Calendar integration
├── components/             # React UI components
│   ├── TaskInput.tsx       # Quick-add task input with parser integration
│   ├── ScheduleView.tsx    # Display schedule blocks with start buttons
│   ├── TimerPanel.tsx      # Active session timer with pause/resume/finish
│   └── AnalyticsPanel.tsx  # Daily stats (completed tasks, focus minutes)
├── hooks/                  # Custom React hooks (future)
├── lib/                    # Core business logic
│   ├── taskParser.ts       # Parse short notation and natural language
│   ├── scheduler.ts        # Greedy scheduling algorithm
│   ├── timerManager.ts     # Session lifecycle management
│   ├── database.ts         # IndexedDB persistence layer
│   ├── analytics.ts        # Event tracking and calculations
│   ├── notifications.ts    # Browser notification wrapper
│   ├── types.ts            # TypeScript type definitions
│   └── strings/            # Centralized UI text and microcopy
├── test/                   # Test setup and utilities
└── App.tsx                 # Main application component

```

## Architecture

Clippy follows a modular architecture with clear separation of concerns:

- **UI Layer**: React components receive data via props and emit events via callbacks
- **Business Logic**: Pure functions and classes handle parsing, scheduling, and timer logic
- **Persistence Layer**: IndexedDB wrapper provides async storage with error handling
- **Testing**: Dual approach with unit tests (specific examples) and property-based tests (universal properties)

### Key Design Decisions

**Why Greedy Scheduler?**
Simple, predictable, and sufficient for MVP. Tasks are scheduled in the order they're added to the earliest available time slot.

**Why IndexedDB?**
Native browser support, no external dependencies, sufficient storage capacity, and works offline.

**Why Property-Based Testing?**
Catches edge cases that manual test cases miss by testing properties across hundreds of randomly generated inputs.

## Technology Stack

- **Framework**: React 18 + Vite (fast HMR and modern build tooling)
- **Language**: TypeScript (type safety and better developer experience)
- **Styling**: Tailwind CSS (utility-first, rapid UI development)
- **Storage**: IndexedDB via idb library (async/await API wrapper)
- **Testing**: Vitest (fast, Jest-compatible) + fast-check (property-based testing)
- **Notifications**: Web Notifications API (with in-app fallback)

## API Documentation

### Task Parser

```typescript
import { taskParser } from './lib/taskParser';

// Parse user input into tasks
const result = taskParser.parse('emails(20)');
// Returns: { tasks: [{ id, name: 'emails', durationMinutes: 20, ... }], errors: [] }
```

### Scheduler

```typescript
import { createScheduler } from './lib/scheduler';

const scheduler = createScheduler();
const result = scheduler.generateSchedule({
  tasks: [...],
  workHours: { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
  fixedEvents: [],
  scheduleDate: new Date()
});
// Returns: { scheduledBlocks: [...], unscheduledTasks: [...] }
```

### Timer Manager

```typescript
import { createTimerManager } from './lib/timerManager';

const timerManager = createTimerManager();

// Start a session
const session = timerManager.startSession(taskId, scheduleBlockId);

// Pause/resume
timerManager.pauseSession(session.id);
timerManager.resumeSession(session.id);

// Finish
timerManager.finishSession(session.id);

// Get elapsed time
const minutes = timerManager.getElapsedMinutes(session.id);
```

### Database

```typescript
import { database } from './lib/database';

// Tasks
await database.addTask(task);
const tasks = await database.getTasks();
await database.updateTask(task);
await database.deleteTask(taskId);

// Schedule blocks
await database.addScheduleBlock(block);
const blocks = await database.getScheduleBlocks(date);
await database.updateScheduleBlock(block);
await database.clearScheduleBlocks(date);

// Sessions
await database.addSession(session);
const session = await database.getSession(sessionId);
await database.updateSession(session);
const activeSessions = await database.getActiveSessions();

// Analytics
await database.addAnalyticsEvent(event);
const events = await database.getAnalyticsEvents(startDate, endDate);
```

### Analytics

```typescript
import { recordEvent, calculateCompletedTasks, calculateFocusMinutes } from './lib/analytics';

// Record events
await recordEvent(database, 'task_completed', { taskId, durationMinutes });

// Calculate stats
const completedCount = await calculateCompletedTasks(database, new Date());
const focusMinutes = await calculateFocusMinutes(database, new Date());
```

## Troubleshooting

### Notifications Not Working

1. Check browser permissions: Settings → Site Settings → Notifications
2. Ensure you granted permission when prompted
3. If denied, you'll see in-app alerts instead (fallback behavior)

### Data Not Persisting

1. Check browser storage settings (ensure IndexedDB is enabled)
2. Check available storage quota (Settings → Site Settings → Storage)
3. Try clearing site data and reloading

### Tests Failing

1. Ensure all dependencies are installed: `npm install`
2. Clear test cache: `rm -rf node_modules/.vite`
3. Check for TypeScript errors: `npm run build`

## Contributing

This is an MVP implementation. Future enhancements are scaffolded but not implemented:

- **Idle Detection**: Detect when user is away and pause timer automatically
- **Clipboard Helper**: Quick-add tasks from clipboard
- **Project Automation**: Integrate with project management tools
- **Personality Layer**: Friendly microcopy and nudges
- **Calendar Integration**: Sync with Google Calendar, Outlook, etc.

## License

MIT
