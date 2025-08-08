# Drag and Drop Session Blocks - User Guide

## Overview

The calendar view now supports drag and drop functionality for study session blocks, allowing you to easily reschedule sessions by dragging them to new time slots.

## Features

### ✅ What You Can Drag
- **Study Session Blocks** - All study sessions can be dragged and dropped
- **Automatic Snapping** - Sessions automatically snap to the nearest available 15-minute interval
- **Smart Conflict Detection** - Prevents overlapping with existing sessions or commitments
- **Visual Feedback** - Real-time feedback during dragging with color-coded indicators

### ❌ What You Cannot Drag
- **Fixed Commitments** - These remain locked in place
- **Sessions on Non-Work Days** - Cannot drop sessions on days you haven't configured as work days

## How to Use

### Dragging Sessions
1. **Hover over any study session block** - The cursor will change to a grab hand
2. **Click and drag** - The session becomes semi-transparent during dragging
3. **Drop at desired time** - Release to place the session at the new time

### Visual Indicators
- **Blue dashed border** - Shows where the session will be placed
- **Green highlight** - Indicates valid drop zones
- **Red feedback** - Appears if the drop location is invalid

### Auto-Snapping Behavior
- Sessions automatically snap to **15-minute intervals**
- The system finds the **nearest available time slot** if your exact drop location is occupied
- **Work day validation** - Ensures you can only drop on configured work days
- **Study window respect** - Sessions can only be placed within your configured study hours

## Smart Conflict Resolution

### Automatic Positioning
When you drop a session, the system:
1. **Checks for conflicts** with existing sessions and commitments
2. **Finds the nearest available slot** to your drop location
3. **Respects buffer times** between sessions (if configured)
4. **Maintains session duration** - Your session length stays the same

### Validation Rules
- **Minimum duration**: Sessions must be at least 15 minutes
- **Work days only**: Cannot schedule on non-work days
- **Study window**: Must be within your configured study hours
- **No overlaps**: Automatic conflict detection with buffer time consideration

## Session Resizing

### How to Resize
1. **Hover over a session** - Resize handles appear at top and bottom
2. **Click and drag the handles** - Adjust session duration
3. **15-minute increments** - Resizing snaps to quarter-hour intervals

### Resize Validation
- **Minimum 15 minutes** - Sessions cannot be made shorter
- **Conflict detection** - Prevents resizing into occupied time slots

## Feedback Messages

The system provides helpful feedback in the top-right corner:

### Success Messages
- `"Session moved to [Date] at [Time]"` - Successful move
- `"Session resized to [X] hours"` - Successful resize

### Error Messages
- `"Cannot move session to [Day] - not a work day"` - Invalid day
- `"No available time slot found for this session"` - No space available
- `"Only study sessions can be moved"` - Trying to drag commitments
- `"Session must be at least 15 minutes long"` - Invalid resize

## Technical Details

### Session Preservation
- **Original times preserved** - The system remembers where sessions were originally scheduled
- **Manual override flag** - Dragged sessions are marked as manually overridden
- **Reschedule timestamp** - System tracks when sessions were moved

### Integration with Scheduling
- **Works with existing logic** - Drag and drop integrates seamlessly with the current scheduling system
- **Preserves session metadata** - All session properties (task ID, duration, etc.) are maintained
- **Updates study plans** - Changes are immediately reflected in your study plans

## Tips for Best Results

1. **Use Week/Day view** - Drag and drop works best in detailed calendar views
2. **Check work days** - Ensure your target day is configured as a work day
3. **Mind the buffer** - Consider buffer times between sessions when placing
4. **Combine with regeneration** - Use "Regenerate Study Plan" if you want to optimize around your manual changes

## Troubleshooting

### Common Issues
- **Can't drag a session**: Check if it's a study session (not a commitment)
- **Drop doesn't work**: Ensure the target day is a work day and within study hours
- **Session disappears**: The system may have found a better nearby slot - check the feedback message

### Browser Compatibility
- **Modern browsers required** - Works with Chrome, Firefox, Safari, Edge (recent versions)
- **Touch devices** - Limited support on mobile devices (use mobile calendar view instead)

## Future Enhancements

Potential improvements being considered:
- Multi-session selection and bulk movement
- Drag to different days in month view
- Undo/redo functionality for moves
- Custom snap intervals (beyond 15 minutes)
