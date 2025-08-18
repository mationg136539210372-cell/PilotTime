# Day-Specific Study Windows Feature

## Overview
The day-specific study windows feature allows users to set different study hours for each day of the week (recurring), complementing the existing date-specific study windows for one-time overrides.

## UI Location
- Settings → Study Window section
- Two buttons side by side:
  - "Show Date-Specific Study Windows" (existing)
  - "Show Day-Specific Study Windows" (new)

## How It Works

### Priority System
The system uses a three-tier priority system when determining study windows:

1. **Date-Specific Windows** (Highest Priority)
   - Override for specific dates (e.g., "2024-01-15")
   - Used for holidays, special events, one-time schedule changes

2. **Day-Specific Windows** (Medium Priority)  
   - Override for specific days of the week (e.g., "Every Monday")
   - Used for recurring weekly schedule patterns

3. **Default Study Window** (Lowest Priority)
   - Global start/end hours set in settings
   - Fallback when no overrides exist

### Example Scenarios

#### Scenario 1: Regular Week with Weekend Adjustment
- **Default**: 9 AM - 6 PM (weekdays)
- **Day-Specific**: Saturday & Sunday 10 AM - 4 PM
- **Result**: Weekdays use 9-6, weekends use 10-4

#### Scenario 2: Holiday Override
- **Default**: 9 AM - 6 PM
- **Day-Specific**: Monday 8 AM - 7 PM 
- **Date-Specific**: 2024-01-15 (MLK Day) 12 PM - 5 PM
- **Result**: Regular Mondays use 8-7, but MLK Day uses 12-5

#### Scenario 3: Complex Schedule
- **Default**: 9 AM - 5 PM
- **Day-Specific**: 
  - Monday: 8 AM - 7 PM (heavy study day)
  - Friday: 10 AM - 3 PM (light day)
  - Saturday: OFF (no override = uses default)
  - Sunday: 11 AM - 4 PM (weekend prep)
- **Date-Specific**: Christmas Day OFF
- **Result**: Each day follows its specific pattern, with Christmas overriding everything

## User Interface

### Day Selection
- Dropdown with all days of the week
- Sunday (0) through Saturday (6)
- Visual day names (not numbers)

### Time Selection  
- Start and End time dropdowns
- 24-hour format with AM/PM display
- Same validation as date-specific windows

### Management Features
- **Edit**: Click yellow edit button to modify existing overrides
- **Delete**: Click red trash button to remove overrides  
- **Toggle**: Click green/gray active button to enable/disable
- **List View**: Shows all active day-specific overrides

### Form Validation
- End time must be after start time
- Prevents conflicting entries for same day
- Updates existing override if day already has one

## Technical Implementation

### Data Structure
```typescript
interface DaySpecificStudyWindow {
  dayOfWeek: number;    // 0=Sunday, 1=Monday, etc.
  startHour: number;    // 0-23
  endHour: number;      // 0-23  
  isActive: boolean;    // Enable/disable toggle
}
```

### Storage
- Saved in UserSettings as `daySpecificStudyWindows[]`
- Persisted to localStorage
- Includes in settings export/import

### Integration
- Automatically used by scheduling algorithm
- Works with existing time slot finder
- Respects all existing scheduling logic

## Benefits

1. **Flexible Scheduling**: Different hours for different days
2. **Work-Life Balance**: Shorter hours on weekends
3. **Recurring Patterns**: Set once, applies every week
4. **Override Capability**: Can still use date-specific for exceptions
5. **Easy Management**: Simple UI to add/edit/remove

## Use Cases

- **Students**: Shorter hours on class days, longer on free days
- **Workers**: Different availability on work vs. personal days  
- **Weekend Warriors**: Intensive weekend study, light weekdays
- **Shift Workers**: Accommodating rotating work schedules
- **Religious Observance**: Different hours on religious days

The feature seamlessly integrates with existing scheduling while providing powerful recurring customization options.
