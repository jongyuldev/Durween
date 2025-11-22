# Implementation Plan

- [-] 1. Create sprite position manager module



  - Create TypeScript types for SpritePosition
  - Implement savePosition function that stores coordinates to IndexedDB appState
  - Implement loadPosition function that retrieves coordinates from storage
  - Implement getDefaultPosition function that returns bottom-right corner position
  - Implement constrainToViewport function that keeps sprite within viewport bounds
  - _Requirements: 1.4, 2.4, 2.5, 9.1, 9.2, 9.3_

- [ ] 1.1 Write property test for position persistence
  - **Property 1: Position persistence round-trip**
  - **Validates: Requirements 1.4, 2.4, 9.1, 9.2**

- [ ] 1.2 Write property test for viewport constraints
  - **Property 2: Viewport boundary constraints**
  - **Validates: Requirements 2.5**

- [ ] 1.3 Write unit tests for position manager edge cases
  - Test invalid saved position handling
  - Test viewport smaller than sprite
  - Test default position calculation
  - _Requirements: 1.4, 2.5, 9.3_

- [ ] 2. Implement drag handler hook
  - Create useDragHandler custom React hook
  - Implement mouse event handlers (mousedown, mousemove, mouseup)
  - Implement touch event handlers (touchstart, touchmove, touchend)
  - Add drag threshold logic (5px) to distinguish click from drag
  - Track drag state (isDragging, startX, startY, offsetX, offsetY)
  - Call position update callbacks during drag
  - Apply viewport constraints during drag
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 10.3_

- [ ] 2.1 Write property test for drag position updates
  - **Property 3: Drag position updates**
  - **Validates: Requirements 2.1, 2.2**

- [ ] 2.2 Write property test for drag completion
  - **Property 4: Drag completion preserves position**
  - **Validates: Requirements 2.3**

- [ ] 2.3 Write property test for click detection
  - **Property 5: Click without drag opens panel**
  - **Validates: Requirements 3.1**

- [ ] 2.4 Write property test for touch dragging
  - **Property 24: Touch events support dragging**
  - **Validates: Requirements 10.3**

- [ ] 2.5 Write unit tests for drag handler edge cases
  - Test rapid mouse movements
  - Test drag near viewport edges
  - Test touch event conflicts
  - _Requirements: 2.1, 2.2, 2.3, 10.3_

- [ ] 3. Create sprite state management module
  - Create TypeScript type for SpriteState ('idle' | 'active' | 'celebrating' | 'thinking')
  - Implement determineSpriteState function based on session status and system activity
  - Create useSpriteState custom hook that tracks and updates sprite state
  - Add logic to briefly show 'celebrating' state on task completion
  - Add logic to show 'thinking' state during schedule generation
  - Add logic to show 'active' state when session is running
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 3.1 Write property test for session status state
  - **Property 19: Sprite state reflects session status**
  - **Validates: Requirements 8.2**

- [ ] 3.2 Write property test for task completion celebration
  - **Property 20: Task completion triggers celebration**
  - **Validates: Requirements 8.3**

- [ ] 3.3 Write property test for schedule generation thinking
  - **Property 21: Schedule generation shows thinking state**
  - **Validates: Requirements 8.4**

- [ ] 3.4 Write unit tests for sprite state transitions
  - Test idle state when no activity
  - Test state priority (celebrating > thinking > active > idle)
  - Test celebration timeout
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 4. Create ClippySprite component
  - Create ClippySprite React component with sprite visual rendering
  - Integrate useDragHandler hook for drag behavior
  - Apply CSS transforms for positioning (translate3d for GPU acceleration)
  - Render different sprite visuals based on SpriteState prop
  - Add visual indicator (badge/icon) when hasActiveSession is true
  - Set z-index to 9999 to appear above page content
  - Size sprite to 100-150px (configurable)
  - Add smooth CSS transitions for position changes
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 6.5, 8.1, 8.2, 8.3, 8.4_

- [ ] 4.1 Write unit tests for ClippySprite component
  - Test sprite renders at given position
  - Test sprite shows correct visual for each state
  - Test active session indicator appears
  - Test z-index is set correctly
  - _Requirements: 1.1, 1.3, 1.5, 6.5, 8.1_

- [ ] 4.2 Write property test for sprite indicator
  - **Property 16: Active session shows sprite indicator**
  - **Validates: Requirements 6.5**

- [ ] 5. Create InteractionPanel component
  - Create InteractionPanel React component with panel container
  - Implement calculatePanelPosition function to position panel near sprite
  - Add logic to avoid viewport edge clipping (try right, then left, adjust vertical)
  - Implement open/close state management
  - Add close button in panel header
  - Add click-outside-to-close behavior using ref and event listener
  - Set z-index to 10000 (above sprite)
  - Add CSS transitions for smooth open/close animations
  - Size panel to 300-400px wide, variable height
  - _Requirements: 3.1, 3.3, 3.4, 3.5_

- [ ] 5.1 Write property test for panel positioning
  - **Property 7: Panel positioning avoids viewport edges**
  - **Validates: Requirements 3.5**

- [ ] 5.2 Write property test for panel close behavior
  - **Property 6: Panel closes and resets sprite state**
  - **Validates: Requirements 3.4**

- [ ] 5.3 Write unit tests for InteractionPanel component
  - Test panel renders at calculated position
  - Test close button closes panel
  - Test click outside closes panel
  - Test panel z-index is above sprite
  - _Requirements: 3.1, 3.3, 3.4, 3.5_

- [ ] 6. Implement panel view navigation
  - Add tabbed navigation UI in panel header
  - Create state for activeView ('tasks' | 'schedule' | 'timer' | 'analytics')
  - Implement view switching on tab click
  - Persist last active view to IndexedDB appState
  - Restore last active view on panel open
  - Style active tab with visual distinction
  - _Requirements: 3.2, 9.4_

- [ ] 6.1 Write property test for view persistence
  - **Property 22: Last panel view persistence**
  - **Validates: Requirements 9.4**

- [ ] 6.2 Write unit tests for panel navigation
  - Test tab switching updates activeView
  - Test active tab styling
  - Test view persistence on close/reopen
  - _Requirements: 3.2, 9.4_

- [ ] 7. Create CompactTaskInput component
  - Create CompactTaskInput React component with condensed layout
  - Reuse existing parseTask function from taskParser module
  - Add text input field with smaller styling
  - Add submit button or Enter key handler
  - Display parse errors below input within panel
  - Clear input on successful parse
  - Call onTaskAdded callback with parsed tasks
  - Integrate with existing database.addTask for persistence
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [ ] 7.1 Write property test for parser integration
  - **Property 8: Compact UI uses existing parser**
  - **Validates: Requirements 4.1, 4.2**

- [ ] 7.2 Write property test for error display
  - **Property 10: Parse errors display in panel**
  - **Validates: Requirements 4.4**

- [ ] 7.3 Write property test for task persistence
  - **Property 11: Task persistence through compact UI**
  - **Validates: Requirements 4.5**

- [ ] 7.4 Write unit tests for CompactTaskInput component
  - Test input validation
  - Test error message display
  - Test successful task addition
  - Test input clearing
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [ ] 8. Create CompactScheduleView component
  - Create CompactScheduleView React component with scrollable layout
  - Display schedule blocks in condensed format (smaller cards/rows)
  - Show start time, task name, and duration for each block
  - Add start button for each scheduled block
  - Set max height (e.g., 300px) and enable vertical scrolling
  - Visually distinguish between scheduled, in-progress, and completed blocks
  - Display empty state message when no schedule blocks exist
  - Call onStartSession callback when start button clicked
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8.1 Write property test for schedule block rendering
  - **Property 12: Schedule blocks contain required information**
  - **Validates: Requirements 5.3**

- [ ] 8.2 Write property test for timer manager integration
  - **Property 13: Timer integration with existing manager**
  - **Validates: Requirements 5.4**

- [ ] 8.3 Write unit tests for CompactScheduleView component
  - Test empty schedule message
  - Test block rendering with all required info
  - Test scrolling behavior
  - Test start button click
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9. Create CompactTimerPanel component
  - Create CompactTimerPanel React component with condensed layout
  - Reuse existing timerManager for all timer operations
  - Display current task name when session is active
  - Display elapsed time with live updates (useEffect with interval)
  - Add pause/resume button that changes based on session state
  - Add finish button to complete session
  - Hide panel or show inactive state when no session is active
  - Call onSessionUpdate callback on state changes
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 9.1 Write property test for active session display
  - **Property 14: Active session displays timer panel**
  - **Validates: Requirements 6.1**

- [ ] 9.2 Write property test for elapsed time accuracy
  - **Property 15: Timer displays accurate elapsed time**
  - **Validates: Requirements 6.2**

- [ ] 9.3 Write unit tests for CompactTimerPanel component
  - Test display with no active session
  - Test pause/resume button states
  - Test finish button
  - Test time formatting
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 10. Create CompactAnalyticsPanel component
  - Create CompactAnalyticsPanel React component with condensed layout
  - Reuse existing calculateCompletedTasks and calculateFocusMinutes functions
  - Display completed task count for current day
  - Display total focus minutes for current day
  - Format information in compact cards or rows
  - Update display when analytics data changes (useEffect with dependencies)
  - _Requirements: 7.1, 7.2, 7.4, 7.5_

- [ ] 10.1 Write property test for analytics updates
  - **Property 17: Analytics data updates in real-time**
  - **Validates: Requirements 7.4**

- [ ] 10.2 Write property test for analytics calculation reuse
  - **Property 18: Analytics uses existing calculations**
  - **Validates: Requirements 7.5**

- [ ] 10.3 Write unit tests for CompactAnalyticsPanel component
  - Test display with no data
  - Test display with completed tasks
  - Test display with focus minutes
  - Test data updates
  - _Requirements: 7.1, 7.2, 7.4, 7.5_

- [ ] 11. Integrate compact components into InteractionPanel
  - Add conditional rendering based on activeView state
  - Render CompactTaskInput when activeView is 'tasks'
  - Render CompactScheduleView when activeView is 'schedule'
  - Render CompactTimerPanel when activeView is 'timer'
  - Render CompactAnalyticsPanel when activeView is 'analytics'
  - Pass necessary props and callbacks to each component
  - Ensure all components receive data from existing modules
  - _Requirements: 3.2, 4.1, 5.1, 6.1, 7.1_

- [ ] 11.1 Write integration tests for panel views
  - Test each view renders correctly
  - Test view switching
  - Test data flow to compact components
  - _Requirements: 3.2, 4.1, 5.1, 6.1, 7.1_

- [ ] 12. Create main ClippyApp component
  - Create ClippyApp React component as new main app component
  - Load sprite position from storage on mount
  - Initialize sprite state based on application state
  - Manage panel open/close state
  - Manage panel active view state
  - Render ClippySprite component with position and state
  - Render InteractionPanel component when panel is open
  - Handle sprite click to open panel
  - Handle position changes to save to storage
  - Integrate with existing business logic modules (parser, scheduler, timer, database, analytics, notifications)
  - _Requirements: 1.4, 2.4, 3.1, 3.4, 9.1, 9.2, 9.4_

- [ ] 12.1 Write property test for module reuse
  - **Property 26: Existing modules are reused**
  - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

- [ ] 12.2 Write integration tests for ClippyApp
  - Test sprite renders at loaded position
  - Test panel opens on sprite click
  - Test panel closes and position persists
  - Test all compact components receive correct data
  - _Requirements: 1.4, 2.4, 3.1, 3.4, 9.1, 9.2_

- [ ] 13. Implement visual feedback for task addition
  - Add logic to change sprite state briefly when task is added
  - Update panel content to show new task in schedule view
  - Add subtle animation or transition on task addition
  - Ensure feedback works for both successful and failed additions
  - _Requirements: 4.3_

- [ ] 13.1 Write property test for task addition feedback
  - **Property 9: Task addition provides feedback**
  - **Validates: Requirements 4.3**

- [ ] 13.2 Write unit tests for feedback behavior
  - Test sprite state changes on task addition
  - Test panel content updates
  - Test feedback timing
  - _Requirements: 4.3_

- [ ] 14. Implement notification-triggered sprite animations
  - Add event listener for notification events from notification service
  - Trigger sprite animation or state change when notification is sent
  - Implement brief animation (e.g., bounce, pulse, or state flash)
  - Ensure animation doesn't interfere with drag behavior
  - Reset sprite to previous state after animation completes
  - _Requirements: 11.4_

- [ ] 14.1 Write property test for notification animations
  - **Property 25: Notification triggers sprite animation**
  - **Validates: Requirements 11.4**

- [ ] 14.2 Write unit tests for notification animations
  - Test animation triggers on each notification type
  - Test animation doesn't block interactions
  - Test state restoration after animation
  - _Requirements: 11.4_

- [ ] 15. Implement viewport resize handling
  - Add window resize event listener in ClippyApp
  - Recalculate sprite position constraints on resize
  - Adjust sprite position if it would be outside new viewport bounds
  - Recalculate panel position if panel is open
  - Debounce resize handler to avoid excessive calculations
  - _Requirements: 10.1_

- [ ] 15.1 Write property test for viewport resize
  - **Property 23: Viewport resize constrains position**
  - **Validates: Requirements 10.1**

- [ ] 15.2 Write unit tests for resize handling
  - Test position adjustment on resize
  - Test panel repositioning on resize
  - Test debouncing behavior
  - _Requirements: 10.1_

- [ ] 16. Add sprite visual assets and animations
  - Create or source Clippy sprite images for each state (idle, active, celebrating, thinking)
  - Implement sprite rendering with state-based image switching
  - Add CSS animations for state transitions
  - Add active session indicator visual (badge, icon, or glow effect)
  - Optimize sprite images for web (compress, use appropriate formats)
  - Add fallback styling if images fail to load
  - _Requirements: 1.2, 1.3, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 16.1 Write unit tests for sprite visuals
  - Test correct image/visual for each state
  - Test active session indicator visibility
  - Test fallback styling
  - _Requirements: 1.2, 1.3, 8.1, 8.2, 8.3, 8.4_

- [ ] 17. Update main.tsx to use ClippyApp
  - Replace App component with ClippyApp in main.tsx
  - Ensure all existing functionality is accessible through sprite interface
  - Remove or hide original full-page UI components
  - Test that application loads with sprite interface
  - Verify all features work through compact UI
  - _Requirements: All requirements_

- [ ] 17.1 Write end-to-end integration tests
  - Test full flow: open panel → add task → generate schedule → start session → complete task
  - Test sprite position persistence across reload
  - Test panel view persistence across reload
  - Test all existing features work through sprite interface
  - _Requirements: All requirements_

- [ ] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Add accessibility features
  - Add ARIA labels to sprite and panel elements
  - Implement keyboard navigation (Tab, Enter, Escape)
  - Add focus trap in interaction panel
  - Ensure sprite is keyboard-accessible (Space/Enter to open panel)
  - Add screen reader announcements for state changes
  - Test with screen reader software
  - _Requirements: All requirements (accessibility enhancement)_

- [ ] 19.1 Write unit tests for accessibility
  - Test ARIA labels are present
  - Test keyboard navigation works
  - Test focus trap in panel
  - Test screen reader announcements
  - _Requirements: All requirements_

- [ ] 20. Polish and final testing
  - Test on different screen sizes (desktop, tablet, mobile)
  - Test on different browsers (Chrome, Firefox, Safari, Edge)
  - Verify smooth animations and transitions
  - Check performance (drag smoothness, panel open/close speed)
  - Verify all existing tests still pass
  - Test edge cases (very small viewport, rapid interactions)
  - Update README with sprite interface documentation
  - _Requirements: All requirements_

- [ ] 21. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


