# Timer Fix Documentation

## Problem
The original timer implementation used `setInterval` with a 1-second interval, which caused significant delays when users switched to other browser tabs or windows. This happened because browsers throttle JavaScript timers in inactive tabs to save battery and CPU resources.

## Solution
Implemented a robust timer system that works accurately even when the browser tab is inactive.

## Key Components

### 1. High-Resolution Timing (`useRobustTimer.ts`)
- Uses `performance.now()` for high-precision timestamps
- Calculates actual elapsed time based on real time, not interval counts
- Maintains accuracy regardless of browser throttling

### 2. Page Visibility API Integration
- Detects when the tab becomes hidden or visible
- Switches to different update strategies based on visibility state
- Handles timer state correctly when returning to the tab

### 3. Dual Update Strategy

#### When Tab is Visible:
- Uses `requestAnimationFrame()` for smooth, 60fps updates
- Provides real-time visual feedback
- Efficient and battery-friendly

#### When Tab is Hidden:
- Switches to `setInterval` with 5-second checks
- Maintains timer functionality in background
- Reduces resource usage while preserving accuracy

### 4. Background Notifications
- Shows desktop notifications when timer completes in background
- Plays audio alerts as backup
- Helps users stay aware of timer completion

## Technical Implementation

### TimerState Interface Updates
```typescript
interface TimerState {
  isRunning: boolean;
  currentTime: number;
  totalTime: number;
  currentTaskId: string | null;
  startTime?: number;        // High-resolution start timestamp
  pausedTime?: number;       // Accumulated paused time
  lastUpdateTime?: number;   // Last update timestamp
}
```

### Timer Control Functions
- `startTimer()`: Initializes high-resolution timing
- `pauseTimer()`: Calculates and preserves elapsed time
- `resumeTimer()`: Resumes from paused state
- `resetTimer()`: Resets to initial state

### Accuracy Features
- Compensates for pause duration
- Handles visibility state changes
- Maintains precision across browser throttling
- Syncs display with actual elapsed time

## Benefits

1. **Accurate Timing**: Timer remains precise regardless of tab activity
2. **Battery Efficient**: Reduces updates when tab is hidden
3. **User-Friendly**: Notifications keep users informed
4. **Robust**: Handles edge cases and browser inconsistencies
5. **Backwards Compatible**: Works with existing timer UI

## Usage

The robust timer automatically activates when users start any study session. No configuration required - it seamlessly replaces the old timer logic.

### For Developers

To use the robust timer in other components:

```typescript
import { useRobustTimer } from '../hooks/useRobustTimer';

useRobustTimer({
  timer: timerState,
  onTimerUpdate: setTimerState,
  onTimerComplete: handleCompletion,
  taskTitle: 'Task Name' // For notifications
});
```

## Testing

To test the timer accuracy:
1. Start a study session
2. Switch to another tab/window for several minutes
3. Return to TimePilot
4. Verify the timer shows the correct remaining time

The timer should maintain accuracy regardless of how long the tab was inactive.
