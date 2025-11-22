# Requirements Document

## Introduction

This feature transforms the Clippy task scheduler from a full-page web application into an authenpy-style assistant experience. The system will present all functionality through a small, draggable sprite character that users can interact with, replicating the classic Microsoft Office Assistant behavior. The sprite will be movable across the screen, clickable to reveal contextual menus and panels, and will maintain the core task scheduling, timer, and analytics functionality within a compact, overlay-based interface.

## Glossary

- **Clippy Sprite**: The animated character visual element that serves as the primary interface
- **Sprite Container**: The draggable DOM element that contains the Clippy character and handles positioning
- **Interaction Panel**: A popup/overlay interface that appears when the sprite is clicked, containing task management controls
- **Compact UI**: Minimized interface elements designed to fit within small overlay panels
- **Drag Handle**: The area of the sprite that responds to mouse/touch drag events
- **Sprite State**: The visual appearance of the sprite (idle, active, thinking, celebrating)
- **Overlay Mode**: The UI pattern where interface elements appear as floating panels above other content
- **Persistent Position**: The sprite's screen coordinates that are saved and restored across sessions

## Requirements

### Requirement 1

**User Story:** As a user, I want to see a small Clippy sprite on my screen, so that I have a familiar assistant-style interface.

#### Acceptance Criteria

1. WHEN the application loads, THE Clippy Sprite SHALL render as a small visual element (approximately 100-150px in size)
2. WHEN the sprite is displayed, THE Clippy Sprite SHALL show an animated character representation
3. WHEN the sprite is idle, THE Clippy Sprite SHALL display a default idle animation or static pose
4. WHEN the sprite appears, THE Clippy Sprite SHALL be positioned at the last saved location or a default position
5. WHEN the sprite is rendered, THE Clippy Sprite SHALL appear above all other page content with appropriate z-index layering

### Requirement 2

**User Story:** As a user, I want to drag the Clippy sprite around my screen, so that I can position it wherever is convenient.

#### Acceptance Criteria

1. WHEN a user clicks and holds on the sprite, THE Sprite Container SHALL enter drag mode and follow the cursor
2. WHEN the sprite is being dragged, THE Sprite Container SHALL update its position in real-time to match cursor movement
3. WHEN a user releases the mouse button, THE Sprite Container SHALL stop dragging and remain at the current position
4. WHEN the sprite position changes, THE Clippy SHALL persist the new coordinates to local storage
5. WHEN the sprite is dragged near screen edges, THE Sprite Container SHALL remain fully visible and not clip outside viewport boundaries

### Requirement 3

**User Story:** As a user, I want to click on the Clippy sprite to open an interaction panel, so that I can access task management features.

#### Acceptance Criteria

1. WHEN a user clicks on the sprite without dragging, THE Clippy SHALL display the Interaction Panel near the sprite
2. WHEN the interaction panel opens, THE Clippy SHALL show the quick-add task input as the primary interface element
3. WHEN the interaction panel is open, THE Clippy SHALL display a close button or allow clicking outside to dismiss
4. WHEN a user closes the interaction panel, THE Clippy SHALL hide the panel and return the sprite to idle state
5. WHEN the panel is displayed, THE Clippy SHALL position it intelligently to avoid screen edge clipping

### Requirement 4

**User Story:** As a user, I want to add tasks through the sprite's interaction panel, so that I can manage my work without a full-page interface.

#### Acceptance Criteria

1. WHEN the interaction panel is open, THE Compact UI SHALL display the task input field with the same parsing capabilities as the original interface
2. WHEN a user submits a task, THE Clippy SHALL parse the input using the existing task parser
3. WHEN a task is successfully added, THE Clippy SHALL provide visual feedback through sprite animation or panel update
4. WHEN a parse error occurs, THE Compact UI SHALL display the error message within the interaction panel
5. WHEN a task is added, THE Clippy SHALL update the task list in storage using existing persistence mechanisms

### Requirement 5

**User Story:** As a user, I want to view my schedule through the sprite interface, so that I can see my planned tasks in a compact format.

#### Acceptance Criteria

1. WHEN the interaction panel is open, THE Compact UI SHALL provide a way to view the current schedule
2. WHEN displaying the schedule, THE Compact UI SHALL show schedule blocks in a scrollable, condensed format
3. WHEN schedule blocks are displayed, THE Compact UI SHALL include start times, task names, and start buttons
4. WHEN a user clicks a start button, THE Clippy SHALL initiate a timebox session using the existing timer manager
5. WHEN the schedule is empty, THE Compact UI SHALL display a message prompting the user to add tasks

### Requirement 6

**User Story:** As a user, I want to see timer controls in the sprite interface, so that I can manage my active work session.

#### Acceptance Criteria

1. WHEN a timebox session is active, THE Compact UI SHALL display the timer panel within the interaction panel
2. WHEN the timer is running, THE Compact UI SHALL show the elapsed time with live updates
3. WHEN the timer panel is displayed, THE Compact UI SHALL include pause/resume and finish buttons
4. WHEN no session is active, THE Compact UI SHALL hide the timer panel or show an inactive state
5. WHEN a session is active and the panel is closed, THE Clippy Sprite SHALL provide a visual indicator that a timer is running

### Requirement 7

**User Story:** As a user, I want to see analytics through the sprite interface, so that I can track my productivity in a compact view.

#### Acceptance Criteria

1. WHEN the interaction panel is open, THE Compact UI SHALL provide access to analytics information
2. WHEN analytics are displayed, THE Compact UI SHALL show completed task count and total focus minutes
3. WHEN analytics are shown, THE Compact UI SHALL format the information to fit within the compact panel layout
4. WHEN analytics data updates, THE Compact UI SHALL reflect the changes in real-time
5. WHEN the user views analytics, THE Clippy SHALL use the existing analytics calculation functions

### Requirement 8

**User Story:** As a user, I want the sprite to show different visual states, so that I receive feedback about system activity.

#### Acceptance Criteria

1. WHEN no session is active and no panel is open, THE Clippy Sprite SHALL display an idle state
2. WHEN a timebox session is running, THE Clippy Sprite SHALL display an active/working state
3. WHEN a task is completed, THE Clippy Sprite SHALL briefly display a celebrating or success state
4. WHEN the system is processing (generating schedule), THE Clippy Sprite SHALL display a thinking or processing state
5. WHEN the sprite state changes, THE Clippy SHALL animate the transition between states smoothly

### Requirement 9

**User Story:** As a user, I want the sprite's position and panel state to persist, so that my preferences are maintained across sessions.

#### Acceptance Criteria

1. WHEN the sprite position changes, THE Clippy SHALL save the coordinates to local storage immediately
2. WHEN the application loads, THE Clippy SHALL restore the sprite to the last saved position
3. WHEN no saved position exists, THE Clippy SHALL position the sprite at a default location (bottom-right corner)
4. WHEN the interaction panel is closed, THE Clippy SHALL remember which view was last active
5. WHEN the application reloads with an active session, THE Clippy SHALL restore the timer state and display the timer panel

### Requirement 10

**User Story:** As a user, I want the sprite interface to work on different screen sizes, so that I can use it on various devices.

#### Acceptance Criteria

1. WHEN the viewport size changes, THE Sprite Container SHALL adjust its position to remain within visible bounds
2. WHEN the interaction panel is displayed on a small screen, THE Compact UI SHALL scale appropriately to fit available space
3. WHEN the sprite is on a mobile device, THE Sprite Container SHALL support touch-based dragging
4. WHEN the panel is open on a small screen, THE Compact UI SHALL prioritize essential controls and hide secondary information
5. WHEN the viewport is very small, THE Clippy SHALL provide a minimal interface that maintains core functionality

### Requirement 11

**User Story:** As a user, I want notifications to still work with the sprite interface, so that I stay informed about session events.

#### Acceptance Criteria

1. WHEN a timebox session starts, THE Clippy SHALL send a notification using the existing notification service
2. WHEN a session completes, THE Clippy SHALL send a completion notification
3. WHEN a session overruns, THE Clippy SHALL send an overrun notification
4. WHEN a notification is triggered, THE Clippy Sprite SHALL briefly animate to draw attention
5. WHEN notifications are displayed, THE Clippy SHALL use the existing notification fallback mechanisms

### Requirement 12

**User Story:** As a developer, I want the sprite interface to reuse existing business logic, so that the system remains maintainable and consistent.

#### Acceptance Criteria

1. WHEN implementing sprite functionality, THE Clippy SHALL use the existing task parser module without modification
2. WHEN implementing sprite functionality, THE Clippy SHALL use the existing scheduler module without modification
3. WHEN implementing sprite functionality, THE Clippy SHALL use the existing timer manager module without modification
4. WHEN implementing sprite functionality, THE Clippy SHALL use the existing persistence layer without modification
5. WHEN implementing sprite functionality, THE Clippy SHALL use the existing analytics and notification modules without modification

