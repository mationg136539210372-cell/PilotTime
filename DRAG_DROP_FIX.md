# Drag and Drop Session Removal Bug Fix

## Problem Description

When moving a single session using drag and drop in the calendar, other sessions of the same task were being unscheduled/removed unexpectedly. This was causing frustration as users would lose sessions they didn't intend to move.

## Root Cause Analysis

The issue was in the `handleEventDrop` function in `CalendarView.tsx`. The problematic logic was:

```typescript
// PROBLEMATIC CODE
const updatedPlans = studyPlans.map(plan => {
  if (plan.date === targetDate) {
    // Add session to target date...
  } else {
    // ❌ ISSUE: This was removing the session from ALL other plans
    // not just the original plan where it was dragged from
    const updatedTasks = plan.plannedTasks.filter(s => 
      !(s.taskId === session.taskId && s.sessionNumber === session.sessionNumber)
    );
    return { ...plan, plannedTasks: updatedTasks };
  }
});
```

### Why This Caused the Problem

1. **Overly Aggressive Filtering**: The code was removing sessions with matching `taskId` and `sessionNumber` from ALL plans except the target date
2. **Missing Original Plan Tracking**: It wasn't tracking which specific plan the session was dragged from
3. **Unintended Side Effects**: Sessions from different dates with the same task and session number were being removed

## The Fix

### 1. Track Original Plan Date
```typescript
// Get the original plan date where the session was dragged from
const originalPlanDate = event.resource.data.planDate;
```

### 2. Precise Removal Logic
```typescript
const updatedPlans = studyPlans.map(plan => {
  if (plan.date === targetDate) {
    // Add session to target date...
  } else if (plan.date === originalPlanDate) {
    // ✅ FIXED: Remove session ONLY from the original plan date
    const updatedTasks = plan.plannedTasks.filter(s => 
      !(s.taskId === session.taskId && s.sessionNumber === session.sessionNumber)
    );
    return { ...plan, plannedTasks: updatedTasks };
  } else {
    // ✅ FIXED: Leave all other plans unchanged
    return plan;
  }
});
```

### 3. Handle New Plan Creation
```typescript
// Also handle the case when target date doesn't exist in plans
if (!targetPlanExists) {
  // Create new plan with the session...
  
  // ✅ FIXED: Also remove from original plan in this case
  const originalPlanIndex = updatedPlans.findIndex(plan => plan.date === originalPlanDate);
  if (originalPlanIndex >= 0) {
    const originalPlan = updatedPlans[originalPlanIndex];
    const updatedOriginalTasks = originalPlan.plannedTasks.filter(s => 
      !(s.taskId === session.taskId && s.sessionNumber === session.sessionNumber)
    );
    updatedPlans[originalPlanIndex] = { ...originalPlan, plannedTasks: updatedOriginalTasks };
  }
}
```

## What Changed

### Before (Broken Behavior):
1. Drag session A from Monday
2. ❌ System removes ALL sessions with same task+sessionNumber from every day except target
3. ❌ Unrelated sessions get unscheduled

### After (Fixed Behavior):
1. Drag session A from Monday
2. ✅ System removes ONLY that specific session from Monday
3. ✅ All other sessions remain untouched

## Technical Details

### Data Flow
1. **Event Created**: Each calendar event includes `planDate` in resource data
2. **Drag Detection**: `originalPlanDate = event.resource.data.planDate`
3. **Precise Removal**: Filter only affects the original plan date
4. **Clean Addition**: Session added to target date with proper metadata

### Session Identification
Sessions are identified by:
- `taskId` - Which task the session belongs to
- `sessionNumber` - Which session number within that task
- `planDate` - Which date the session was originally scheduled for

### Edge Cases Handled
- ✅ Moving to existing plan date
- ✅ Moving to non-existing plan date (creates new plan)
- ✅ Moving within the same day
- ✅ Sessions with same task but different dates
- ✅ Sessions with same session number but different tasks

## Testing

The fix has been tested to ensure:
- ✅ TypeScript compilation successful
- ✅ Hot module replacement working
- ✅ Only the dragged session moves
- ✅ Other sessions of the same task remain in place
- ✅ Sessions from different dates are unaffected

## Impact

This fix resolves the frustrating behavior where users would lose sessions unintentionally when using drag and drop. Now the drag and drop functionality works as expected - moving only the specific session that was dragged, without affecting any other sessions.
