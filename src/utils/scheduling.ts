import { Task, StudyPlan, StudySession, UserSettings, FixedCommitment, UserReschedule, DateSpecificStudyWindow } from '../types';

// Utility functions
export const getLocalDateString = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

/**
 * Utility function to calculate total study hours for a plan, including skipped sessions as "done"
 * @param plannedTasks Array of study sessions
 * @returns Total study hours including skipped sessions as completed
 */
export const calculateTotalStudyHours = (plannedTasks: StudySession[]): number => {
  return plannedTasks
    .filter(session => session.done || session.status === 'skipped')
    .reduce((sum, session) => sum + session.allocatedHours, 0);
};

/**
 * Utility function to filter out skipped sessions from an array of sessions
 * @param sessions Array of study sessions
 * @returns Array of sessions excluding skipped ones
 */
export const filterSkippedSessions = (sessions: StudySession[]): StudySession[] => {
  return sessions.filter(session => session.status !== 'skipped');
};

export const formatTime = (hours: number): string => {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const formatTimeForTimer = (seconds: number): string => {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) {
    return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  } else {
    return `${m}m`;
  }
};

/**
 * Check if a task's deadline has passed
 * @param deadline The task deadline string (YYYY-MM-DD format)
 * @returns true if the deadline has passed, false otherwise
 */
export const isTaskDeadlinePast = (deadline: string): boolean => {
  const now = new Date();
  const deadlineDate = new Date(deadline);

  // Reset time to start of day for accurate comparison
  now.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);

  return deadlineDate < now;
};

/**
 * Get the effective study window for a specific date
 * Takes into account date-specific overrides if they exist
 * @param date The date string (YYYY-MM-DD format) to get the study window for
 * @param settings User settings containing default and date-specific study windows
 * @returns Object with startHour and endHour for the effective study window
 */
export const getEffectiveStudyWindow = (
  date: string,
  settings: UserSettings
): { startHour: number; endHour: number } => {
  // Check if there's a date-specific study window for this date
  if (settings.dateSpecificStudyWindows) {
    const dateSpecificWindow = settings.dateSpecificStudyWindows.find(
      window => window.date === date && window.isActive
    );
    
    if (dateSpecificWindow) {
      return {
        startHour: dateSpecificWindow.startHour,
        endHour: dateSpecificWindow.endHour
      };
    }
  }
  
  // Return default study window
  return {
    startHour: settings.studyWindowStartHour || 6,
    endHour: settings.studyWindowEndHour || 23
  };
};

/**
 * Check if a commitment applies to a specific date
 * @param commitment The commitment to check
 * @param date The date string to check (YYYY-MM-DD format)
 * @returns true if the commitment applies to the given date
 */
export const doesCommitmentApplyToDate = (commitment: FixedCommitment, date: string): boolean => {
  // Check if this occurrence was deleted
  if (commitment.deletedOccurrences?.includes(date)) {
    return false;
  }

  // Check if commitment applies to this date
  if (commitment.recurring) {
    // For recurring commitments, check if the day of week matches
    const dayOfWeekMatches = commitment.daysOfWeek.includes(new Date(date).getDay());

    // If day of week doesn't match, return false immediately
    if (!dayOfWeekMatches) return false;

    // CRITICAL FIX: If there's a date range specified, the commitment ONLY applies within that range
    if (commitment.dateRange?.startDate && commitment.dateRange?.endDate) {
      // Only apply if the date is within the specified range
      // Add one day to endDate to include the full last day
      const endDateObj = new Date(commitment.dateRange.endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      const inclusiveEndDate = endDateObj.toISOString().split('T')[0];
      return date >= commitment.dateRange.startDate && date < inclusiveEndDate;
    }

    // No date range specified, so it applies to all dates with matching day of week
    return true;
  } else {
    // For non-recurring commitments, check if the specific date matches
    return commitment.specificDates?.includes(date) || false;
  }
};

// Calculate actual available hours for a specific date considering fixed commitments
export const calculateDailyAvailableHours = (
  date: string,
  baseAvailableHours: number,
  commitments: FixedCommitment[],
  settings: UserSettings
): number => {
  // Filter commitments that apply to this date
  const activeCommitments = commitments.filter(commitment =>
    doesCommitmentApplyToDate(commitment, date)
  );

  // Check for fixed commitments that block the entire day
  const hasFixedAllDayCommitment = activeCommitments.some(c =>
    c.isFixed && c.isAllDay
  );

  if (hasFixedAllDayCommitment) {
    return 0; // No study time available on this day
  }

  // Calculate hours blocked by fixed time-specific commitments
  let blockedHours = 0;
  activeCommitments.forEach(c => {
    if (c.isFixed && !c.isAllDay && c.startTime && c.endTime) {
      // Handle modified occurrences
      let startTime = c.startTime;
      let endTime = c.endTime;

      if (c.modifiedOccurrences?.[date]) {
        const modified = c.modifiedOccurrences[date];
        if (modified.isAllDay) {
          return 0; // Modified to all-day, blocks entire day
        }
        startTime = modified.startTime || startTime;
        endTime = modified.endTime || endTime;
      }

      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const durationHours = (eh * 60 + em - sh * 60 - sm) / 60;
      blockedHours += durationHours;
    }
  });

  return Math.max(0, baseAvailableHours - blockedHours);
};

/**
 * Check if a task's frequency preference conflicts with its deadline
 * @param task Task to check
 * @param settings User settings including buffer days and work days
 * @returns Object indicating if there's a conflict and why
 */
export const checkFrequencyDeadlineConflict = (
  task: Pick<Task, 'deadline' | 'estimatedHours' | 'targetFrequency' | 'deadlineType' | 'minWorkBlock' | 'startDate'>,
  settings: UserSettings
): { hasConflict: boolean; reason?: string; recommendedFrequency?: string } => {
  // No conflict for tasks without deadlines
  if (!task.deadline || task.deadlineType === 'none') {
    return { hasConflict: false };
  }

  // No conflict for flexible deadlines (soft deadlines can be adjusted)
  if (task.deadlineType === 'soft') {
    return { hasConflict: false };
  }

  const deadline = new Date(task.deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Respect startDate if provided
  const start = task.startDate ? new Date(task.startDate) : today;
  start.setHours(0, 0, 0, 0);
  const begin = start > today ? start : today;
  
  // Calculate available days until deadline (respecting buffer)
  const bufferDate = new Date(deadline);
  bufferDate.setDate(bufferDate.getDate() - settings.bufferDays);
  
  const timeDiff = bufferDate.getTime() - begin.getTime();
  const totalDaysUntilDeadline = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
  
  // Count work days between begin and bufferDate (inclusive)
  let workDaysCount = 0;
  const currentDate = new Date(begin);
  
  while (currentDate <= bufferDate) {
    const dayOfWeek = currentDate.getDay();
    if (settings.workDays.includes(dayOfWeek)) {
      workDaysCount++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate minimum sessions needed based on task requirements
  const minSessionHours = (task.minWorkBlock || 30) / 60;
  const minSessionsNeeded = Math.ceil(task.estimatedHours / Math.max(minSessionHours, settings.dailyAvailableHours));
  
  // Determine required frequency based on task preference
  let requiredDaysBetweenSessions = 1;
  switch (task.targetFrequency) {
    case 'weekly':
      requiredDaysBetweenSessions = 7;
      break;
    case '3x-week':
      requiredDaysBetweenSessions = 2; // Every 2-3 days
      break;
    case 'flexible':
      requiredDaysBetweenSessions = 3; // Every 3-4 days
      break;
    case 'daily':
    default:
      requiredDaysBetweenSessions = 1;
      break;
  }

  // Calculate how many sessions we can fit with the preferred frequency
  const maxSessionsWithFrequency = Math.floor(workDaysCount / requiredDaysBetweenSessions) + 1;
  
  // Check if frequency allows sufficient sessions before deadline
  if (maxSessionsWithFrequency < minSessionsNeeded) {
    let recommendedFrequency = 'daily';
    
    // Try to find a less restrictive frequency that works
    const frequencies = [
      { name: '3x-week', days: 2 },
      { name: 'daily', days: 1 }
    ];
    
    for (const freq of frequencies) {
      const sessionsWithThisFreq = Math.floor(workDaysCount / freq.days) + 1;
      if (sessionsWithThisFreq >= minSessionsNeeded) {
        recommendedFrequency = freq.name;
        break;
      }
    }
    
    return {
      hasConflict: true,
      reason: `Given your start date, your ${task.targetFrequency} frequency only allows ${maxSessionsWithFrequency} sessions, but you need at least ${minSessionsNeeded} sessions to complete this task before the deadline.`,
      recommendedFrequency
    };
  }

  return { hasConflict: false };
};

export const checkSessionStatus = (session: StudySession, planDate: string): 'scheduled' | 'in_progress' | 'completed' | 'missed' | 'overdue' | 'rescheduled' => {
  const now = new Date();
  const today = getLocalDateString();
  const sessionStartTime = new Date(`${planDate}T${session.startTime}:00`);
  const sessionEndTime = new Date(`${planDate}T${session.endTime}:00`);

  // Debug logging for session status calculation
  console.log(`checkSessionStatus debug: planDate="${planDate}", today="${today}", planDate < today = ${planDate < today}, session.done=${session.done}, session.status=${session.status}`);

  // Check completion status first - completed sessions are never missed
  if (session.done || session.status === 'completed') {
    return 'completed';
  }

  // Check if session is skipped - skipped sessions should not be treated as missed
  if (session.status === 'skipped') {
    return 'completed'; // Treat skipped sessions as completed for display purposes
  }

  // Check if session was manually rescheduled or has been redistributed
  if (session.originalTime && session.originalDate) {
    return 'rescheduled';
  }

  // Check if session has redistribution metadata indicating it was properly moved
  if (session.schedulingMetadata?.rescheduleHistory && session.schedulingMetadata.rescheduleHistory.length > 0) {
    const lastReschedule = session.schedulingMetadata.rescheduleHistory[session.schedulingMetadata.rescheduleHistory.length - 1];
    // If this session was redistributed to this date, don't mark as missed
    if (lastReschedule.to.date === planDate && lastReschedule.reason === 'redistribution') {
      console.log(`Session redistributed to ${planDate} - not marking as missed`);
      return 'scheduled';
    }
  }

  // Only mark as missed if not completed and from past date
  // AND the session was originally scheduled for that past date (not redistributed there)
  if (planDate < today) {
    // Additional check: if session has manual override flag, it was moved intentionally
    if (session.isManualOverride) {
      console.log(`Session has manual override on ${planDate} - not marking as missed`);
      return 'scheduled';
    }

    // If session was marked as 'rescheduled' status, don't mark as missed
    if (session.status === 'rescheduled') {
      console.log(`Session marked as rescheduled on ${planDate} - not marking as missed`);
      return 'rescheduled';
    }

    console.log(`Session from past date ${planDate} marked as MISSED`);
    return 'missed';
  }

  if (planDate === today) {
    if (now < sessionStartTime) {
      return 'scheduled';
    } else if (now >= sessionStartTime && now <= sessionEndTime) {
      return 'in_progress';
    } else {
      console.log(`Session from today ${planDate} marked as OVERDUE`);
      return 'overdue';
    }
  }

  return 'scheduled';
};

// Helper function to check if a session is a missed or redistributed session
const isMissedOrRedistributedSession = (session: StudySession, planDate: string): boolean => {
  const status = checkSessionStatus(session, planDate);
  return status === 'missed' || session.isManualOverride === true || (!!session.originalTime && !!session.originalDate);
};

// Helper function to optimize session distribution by trying to create larger sessions
const optimizeSessionDistribution = (task: Task, totalHours: number, daysForTask: string[], settings: UserSettings) => {
  const minSessionLength = (settings.minSessionLength || 15) / 60; // in hours
  const maxSessionLength = Math.min(4, settings.dailyAvailableHours); // Cap at 4 hours or daily limit

  // For one-time tasks, return a single session with all hours
  // Note: Scheduling timing is handled in the distribution loop:
  // - High-impact one-sitting tasks: scheduled early (maximum priority)
  // - Regular one-sitting tasks: scheduled on deadline day (respecting buffer), or closest available day
  if (task.isOneTimeTask) {
    return [totalHours];
  }

  // If task has a preferred session duration (from session-based estimation), use it
  if (task.preferredSessionDuration && task.preferredSessionDuration > 0) {
    const preferredDuration = task.preferredSessionDuration;
    const numNeededSessions = Math.ceil(totalHours / preferredDuration);

    // If we have enough days for the needed sessions, use preferred duration
    if (numNeededSessions <= daysForTask.length) {
      const sessions: number[] = [];
      let remainingHours = totalHours;

      for (let i = 0; i < numNeededSessions && remainingHours > 0; i++) {
        const sessionLength = Math.min(preferredDuration, remainingHours);
        if (sessionLength >= minSessionLength) {
          sessions.push(sessionLength);
          remainingHours -= sessionLength;
        }
      }

      return sessions;
    }
    // If not enough days, fall through to default distribution
  }

  // Try to create fewer, larger sessions
  let optimalSessions: number[] = [];
  let remainingHours = totalHours;

  // Calculate how many sessions we can create with minimum length
  const maxSessionsWithMinLength = Math.floor(totalHours / minSessionLength);

  // Determine optimal number of sessions
  let numSessions = Math.min(daysForTask.length, maxSessionsWithMinLength);

  if (numSessions === 0) {
    // If we can't meet minimum session length, create one session per day
    numSessions = daysForTask.length;
  }

  // Create sessions with preference for larger sessions
  for (let i = 0; i < numSessions && remainingHours > 0; i++) {
    const sessionLength = Math.min(
      remainingHours / (numSessions - i), // Distribute remaining hours evenly
      maxSessionLength, // Don't exceed max session length
      remainingHours // Don't exceed remaining hours
    );

    if (sessionLength >= minSessionLength) {
      optimalSessions.push(sessionLength);
      remainingHours -= sessionLength;
    }
  }

  // If we have remaining hours, add them to the first session
  if (remainingHours > 0 && optimalSessions.length > 0) {
    optimalSessions[0] += remainingHours;
  }

  return optimalSessions;
};

// Remove calculatePriorityScore, calculateTaskPriorityScore, and TaskWithPriority

// Helper to find the next available time slot for a session on a given day
export function findNextAvailableTimeSlot(
  requiredHours: number,
  existingSessions: StudySession[],
  commitments: FixedCommitment[],
  studyWindowStartHour: number,
  studyWindowEndHour: number,
  bufferTimeBetweenSessions: number = 0, // new param, in minutes
  targetDate?: string, // Add target date for filtering deleted occurrences
  settings?: UserSettings // Add settings to get date-specific study window
): { start: string; end: string } | null {
  // Early check: if there's a fixed all-day commitment for this date, no time slots are available
  if (targetDate) {
    const hasFixedAllDayCommitment = commitments.some(c =>
      c.isFixed && c.isAllDay && doesCommitmentApplyToDate(c, targetDate)
    );
    if (hasFixedAllDayCommitment) {
      return null; // No available time slots on this day
    }
  }

  // Use date-specific study window if available
  let effectiveStartHour = studyWindowStartHour;
  let effectiveEndHour = studyWindowEndHour;
  
  if (settings && targetDate) {
    const effectiveWindow = getEffectiveStudyWindow(targetDate, settings);
    effectiveStartHour = effectiveWindow.startHour;
    effectiveEndHour = effectiveWindow.endHour;
  }
  // Build a list of all busy intervals (sessions and commitments)
  // Exclude completed sessions as they don't block new scheduling
  const busyIntervals: Array<{ start: number; end: number }> = [];
  existingSessions.forEach(s => {
    // Skip completed sessions as they don't block new time slots
    if (!s.done && s.status !== 'completed') {
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      busyIntervals.push({ start: sh * 60 + (sm || 0), end: eh * 60 + (em || 0) });
    }
  });
  
  // Filter commitments to exclude deleted occurrences and check date range applicability
  const activeCommitments = commitments.filter(commitment => {
    if (!targetDate) return true; // If no target date, include all commitments
    
    // Use the proper function to check if commitment applies to this date
    return doesCommitmentApplyToDate(commitment, targetDate);
  });
  
  activeCommitments.forEach(c => {
    // Handle all-day events - fixed commitments block all scheduling for the day
    if (c.isAllDay) {
      if (c.isFixed) {
        // Fixed all-day commitments block all study session scheduling
        busyIntervals.push({ start: 0, end: 24 * 60 - 1 });
      }
      return;
    }
    
    // Handle time-specific events - only block time for fixed commitments
    if (!c.isFixed) {
      return; // Non-fixed commitments don't block study time
    }

    const [sh, sm] = c.startTime?.split(":").map(Number) || [0, 0];
    const [eh, em] = c.endTime?.split(":").map(Number) || [23, 59];

    // Apply modifications if they exist for the target date
    if (targetDate && c.modifiedOccurrences?.[targetDate]) {
      const modified = c.modifiedOccurrences[targetDate];

      // Check if the modified occurrence is an all-day event
      if (modified.isAllDay) {
        busyIntervals.push({ start: 0, end: 24 * 60 - 1 });
        return;
      }

      if (modified.startTime) {
        const [msh, msm] = modified.startTime.split(":").map(Number);
        busyIntervals.push({ start: msh * 60 + (msm || 0), end: eh * 60 + (em || 0) });
      } else if (modified.endTime) {
        const [meh, mem] = modified.endTime.split(":").map(Number);
        busyIntervals.push({ start: sh * 60 + (sm || 0), end: meh * 60 + (mem || 0) });
      } else {
        busyIntervals.push({ start: sh * 60 + (sm || 0), end: eh * 60 + (em || 0) });
      }
    } else {
      busyIntervals.push({ start: sh * 60 + (sm || 0), end: eh * 60 + (em || 0) });
    }
  });
  
  busyIntervals.sort((a, b) => a.start - b.start);
// Enhanced logic to find first available slot with better precision
const requiredMinutes = Math.round(requiredHours * 60); // Use round instead of ceil for better precision
let current = effectiveStartHour * 60;
const endOfDay = effectiveEndHour * 60;

// Simple debug logging (console only)
const debugLog = (message: string, data?: any) => {
  // Only log to console in development
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] ${message}`, data || '');
  }
};

if (targetDate) {
  debugLog(`Finding slot for ${requiredHours}h (${requiredMinutes}min) on ${targetDate}`);
  debugLog(`Study window: ${effectiveStartHour}:00 - ${effectiveEndHour}:00 (${current}-${endOfDay} minutes)`);
  debugLog(`Busy intervals:`, busyIntervals.map(i => `${Math.floor(i.start/60)}:${String(i.start%60).padStart(2,'0')}-${Math.floor(i.end/60)}:${String(i.end%60).padStart(2,'0')}`));
}

// Check gaps between busy intervals
for (const interval of busyIntervals) {
  const availableGap = interval.start - current;
  
  if (targetDate) {
    debugLog(`Checking gap: ${Math.floor(current/60)}:${String(current%60).padStart(2,'0')} to ${Math.floor(interval.start/60)}:${String(interval.start%60).padStart(2,'0')} = ${availableGap} minutes (need ${requiredMinutes})`);
  }
  
  if (availableGap >= requiredMinutes) {
    // Found a gap that fits - use it immediately
    const startH = Math.floor(current / 60).toString().padStart(2, '0');
    const startM = (current % 60).toString().padStart(2, '0');
    const endTime = current + requiredMinutes;
    const endH = Math.floor(endTime / 60).toString().padStart(2, '0');
    const endM = (endTime % 60).toString().padStart(2, '0');
    
    if (targetDate) {
      debugLog(`Found slot: ${startH}:${startM} - ${endH}:${endM}`);
    }
    
    return { start: `${startH}:${startM}`, end: `${endH}:${endM}` };
  }
  current = Math.max(current, interval.end + bufferTimeBetweenSessions);
}

// Check if there's space at the end of the day
const finalGap = endOfDay - current;
if (targetDate) {
  debugLog(`Checking final gap: ${Math.floor(current/60)}:${String(current%60).padStart(2,'0')} to ${Math.floor(endOfDay/60)}:${String(endOfDay%60).padStart(2,'0')} = ${finalGap} minutes (need ${requiredMinutes})`);
}

if (finalGap >= requiredMinutes) {
  const startH = Math.floor(current / 60).toString().padStart(2, '0');
  const startM = (current % 60).toString().padStart(2, '0');
  const endTime = current + requiredMinutes;
  const endH = Math.floor(endTime / 60).toString().padStart(2, '0');
  const endM = (endTime % 60).toString().padStart(2, '0');
  
  if (targetDate) {
    debugLog(`Found final slot: ${startH}:${startM} - ${endH}:${endM}`);
  }
  
  return { start: `${startH}:${startM}`, end: `${endH}:${endM}` };
}

if (targetDate) {
  debugLog(`No available slot found for ${requiredHours}h session`);
}

return null; // No available slot
}

// Helper function to validate that sessions don't overlap with each other or commitments
function validateSessionTimes(
  sessions: StudySession[],
  commitments: FixedCommitment[],
  date: string
): boolean {
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  // Create a list of all busy intervals
  const busyIntervals: Array<{ start: number; end: number; source: string }> = [];

  // Add commitment intervals
  commitments.forEach(commitment => {
    let appliesToDate = false;
    if (commitment.recurring) {
      // Check day of week match
      const dayOfWeekMatches = commitment.daysOfWeek.includes(new Date(date).getDay());
      
      if (dayOfWeekMatches) {
        // Check date range if specified
        if (commitment.dateRange?.startDate && commitment.dateRange?.endDate) {
          // Add one day to endDate to include the full last day
          const endDateObj = new Date(commitment.dateRange.endDate);
          endDateObj.setDate(endDateObj.getDate() + 1);
          const inclusiveEndDate = endDateObj.toISOString().split('T')[0];
          appliesToDate = date >= commitment.dateRange.startDate && date < inclusiveEndDate;
        } else {
          appliesToDate = true;
        }
      }
    } else {
      appliesToDate = commitment.specificDates?.includes(date) || false;
    }

    if (appliesToDate && !commitment.deletedOccurrences?.includes(date)) {
      // Check for modified occurrences
      const modified = commitment.modifiedOccurrences?.[date];
      
      // Check if the commitment or its modification is an all-day event
      const isAllDay = modified?.isAllDay !== undefined ? modified.isAllDay : commitment.isAllDay;
      
      // For all-day events, block the entire day
      if (isAllDay) {
        busyIntervals.push({
          start: 0,
          end: 24 * 60 - 1,
          source: `commitment-${commitment.title}-allday`
        });
      } else {
        // For time-specific events, use the specified times
        const startTime = modified?.startTime || commitment.startTime;
        const endTime = modified?.endTime || commitment.endTime;
        
        if (startTime && endTime) {
          busyIntervals.push({
            start: timeToMinutes(startTime),
            end: timeToMinutes(endTime),
            source: `commitment-${commitment.title}`
          });
        }
      }
    }
  });

  // Add session intervals
  sessions.forEach((session, index) => {
    if (session.startTime && session.endTime) {
      busyIntervals.push({
        start: timeToMinutes(session.startTime),
        end: timeToMinutes(session.endTime),
        source: `session-${index}`
      });
    }
  });

  // Check for overlaps
  busyIntervals.sort((a, b) => a.start - b.start);
  for (let i = 0; i < busyIntervals.length - 1; i++) {
    const current = busyIntervals[i];
    const next = busyIntervals[i + 1];
    
    if (current.end > next.start) {
      console.warn(`Overlap detected on ${date}: ${current.source} (${current.start}-${current.end}) overlaps with ${next.source} (${next.start}-${next.end})`);
      return false;
    }
  }

  return true;
}

export const generateNewStudyPlan = (
  tasks: Task[],
  settings: UserSettings,
  fixedCommitments: FixedCommitment[],
  existingStudyPlans: StudyPlan[] = []
): { plans: StudyPlan[]; suggestions: Array<{ taskTitle: string; unscheduledMinutes: number }> } => {

  if (settings.studyPlanMode === 'even') {
    // EVEN DISTRIBUTION LOGIC
    // Separate deadline-based tasks from no-deadline tasks
    const allPendingTasks = tasks.filter(task => task.status === 'pending' && task.estimatedHours > 0);

    const deadlineTasks = allPendingTasks
      .filter(task => task.deadline && task.deadline.trim().length > 0 && task.deadlineType !== 'none')
      .sort((a, b) => {
        if (a.importance !== b.importance) return a.importance ? -1 : 1; // Important first
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime(); // Then by deadline (earlier = more urgent)
      });

    const noDeadlineTasks = allPendingTasks
      .filter(task => !task.deadline || task.deadline.trim().length === 0 || task.deadlineType === 'none')
      .sort((a, b) => {
        if (a.importance !== b.importance) return a.importance ? -1 : 1; // Important first
        return (a.title || '').localeCompare(b.title || ''); // Then alphabetically
      });

    // Use deadline tasks for now (we'll add no-deadline scheduling later)
    const tasksEven = deadlineTasks;


    // Step 1: Create a map of available study days
    const now = new Date();
    // Calculate latest deadline using original deadlines (buffer will be applied per task)
    const latestDeadline = new Date(Math.max(...tasksEven.map(t => new Date(t.deadline).getTime())));
    const availableDays: string[] = [];
    const tempDate = new Date(now);
    // Include the latest deadline day by using <= comparison
    while (tempDate <= latestDeadline) {
      const dateStr = tempDate.toISOString().split('T')[0];
      const dayOfWeek = tempDate.getDay();
      if (settings.workDays.includes(dayOfWeek)) {
        availableDays.push(dateStr);
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    // When buffer days is 0, ensure we include the deadline day itself
    if (settings.bufferDays === 0) {
      // Add any missing deadline days that might not be included due to time zone issues
      tasksEven.forEach(task => {
        const deadlineDateStr = new Date(task.deadline).toISOString().split('T')[0];
        if (!availableDays.includes(deadlineDateStr) && settings.workDays.includes(new Date(deadlineDateStr).getDay())) {
          availableDays.push(deadlineDateStr);
        }
      });
      // Sort available days to maintain order
      availableDays.sort();
    } else {
      // When buffer days > 0, ensure we include the buffer-adjusted deadline days
      tasksEven.forEach(task => {
        const deadline = new Date(task.deadline);
        deadline.setDate(deadline.getDate() - settings.bufferDays);
        const deadlineDateStr = deadline.toISOString().split('T')[0];
        if (!availableDays.includes(deadlineDateStr) && settings.workDays.includes(new Date(deadlineDateStr).getDay())) {
          availableDays.push(deadlineDateStr);
        }
      });
      // Sort available days to maintain order
      availableDays.sort();
    }
    

    const studyPlans: StudyPlan[] = [];
    const dailyRemainingHours: { [date: string]: number } = {};
    availableDays.forEach(date => {
      const actualAvailableHours = calculateDailyAvailableHours(date, settings.dailyAvailableHours, commitments, settings);
      dailyRemainingHours[date] = actualAvailableHours;
      studyPlans.push({
        id: `plan-${date}`,
        date,
        plannedTasks: [],
        totalStudyHours: 0,
        availableHours: actualAvailableHours
      });
    });
    let evenTaskScheduledHours: { [taskId: string]: number } = {};
    tasksEven.forEach(task => {
      evenTaskScheduledHours[task.id] = 0;
    });

    // Helper function to redistribute unscheduled hours for a task
    const redistributeUnscheduledHours = (task: Task, unscheduledHours: number, daysForTask: string[]) => {
      let remainingUnscheduledHours = unscheduledHours;
      let redistributionRound = 0;
      const maxRedistributionRounds = 10; // Prevent infinite loops
      const minSessionLength = (settings.minSessionLength || 15) / 60; // in hours
      
      while (remainingUnscheduledHours > 0 && redistributionRound < maxRedistributionRounds) {
        redistributionRound++;
        
        // Find all available days within the task's deadline that have remaining capacity
        const availableDaysForRedistribution = daysForTask.filter(date => {
          return dailyRemainingHours[date] > 0;
        });
        
        if (availableDaysForRedistribution.length === 0) {
          // No more available days, can't redistribute further
          break;
        }
        
        // Try to create larger sessions by distributing to fewer days
        let distributedThisRound = 0;
        
        // Calculate optimal distribution for remaining hours
        const optimalSessions = optimizeSessionDistribution(task, remainingUnscheduledHours, availableDaysForRedistribution, settings);
        
        // Distribute optimal sessions to available days
        for (let i = 0; i < optimalSessions.length && i < availableDaysForRedistribution.length; i++) {
          const date = availableDaysForRedistribution[i];
          const dayPlan = studyPlans.find(p => p.date === date)!;
          const availableHours = dailyRemainingHours[date];
          const sessionLength = Math.min(optimalSessions[i], availableHours);
          
          if (sessionLength >= minSessionLength) {
            const roundedSessionLength = Math.round(sessionLength * 60) / 60;

            // Find available time slot for this session to prevent overlaps
            const commitmentsForDay = fixedCommitments.filter(commitment => {
              if (commitment.recurring) {
                return commitment.daysOfWeek.includes(new Date(date).getDay());
              } else {
                return commitment.specificDates?.includes(date) || false;
              }
            });

            const timeSlot = findNextAvailableTimeSlot(
              roundedSessionLength,
              dayPlan.plannedTasks,
              commitmentsForDay,
              settings.studyWindowStartHour || 6,
              settings.studyWindowEndHour || 23,
              settings.bufferTimeBetweenSessions || 0,
              date
            );

            // Only add the session if we found a valid time slot
            if (timeSlot) {
              dayPlan.plannedTasks.push({
                taskId: task.id,
                scheduledTime: `${date}`,
                startTime: timeSlot.start,
                endTime: timeSlot.end,
                allocatedHours: roundedSessionLength,
                sessionNumber: (dayPlan.plannedTasks.filter(s => s.taskId === task.id).length) + 1,
                isFlexible: true,
                status: 'scheduled'
              });
              dayPlan.totalStudyHours = Math.round((dayPlan.totalStudyHours + roundedSessionLength) * 60) / 60;
              dailyRemainingHours[date] = Math.round((dailyRemainingHours[date] - roundedSessionLength) * 60) / 60;
              distributedThisRound = Math.round((distributedThisRound + roundedSessionLength) * 60) / 60;
            } else {
              // No available time slot found, skip this distribution
              console.log(`No available time slot found for ${roundedSessionLength} hours on ${date}`);
            }
          }
        }
        
        // Update remaining unscheduled hours
        remainingUnscheduledHours -= distributedThisRound;
        
        // If we couldn't distribute any hours this round, break to prevent infinite loop
        if (distributedThisRound === 0) {
          break;
        }
      }
      
      return remainingUnscheduledHours; // Return any still unscheduled hours
    };

    // Helper function to combine sessions of the same task on the same day
    const combineSessionsOnSameDay = (studyPlans: StudyPlan[]) => {
      for (const plan of studyPlans) {
        // Group sessions by taskId, excluding skipped sessions from combination
        const sessionsByTask: { [taskId: string]: StudySession[] } = {};
        
        plan.plannedTasks.forEach(session => {
          // Skip sessions that are marked as skipped - they shouldn't be combined with other sessions
          if (session.status === 'skipped') {
            return;
          }
          
          if (!sessionsByTask[session.taskId]) {
            sessionsByTask[session.taskId] = [];
          }
          sessionsByTask[session.taskId].push(session);
        });
        
        const combinedSessions: StudySession[] = [];
        
        // Combine sessions for each task - only if they are truly adjacent
        Object.entries(sessionsByTask).forEach(([taskId, sessions]) => {
          if (sessions.length > 1) {
            // Sort sessions by start time
          sessions.sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

            // Group adjacent sessions together
            let currentGroup: StudySession[] = [sessions[0]];
            const sessionGroups: StudySession[][] = [];

            for (let i = 1; i < sessions.length; i++) {
              const currentSession = sessions[i];
              const lastInGroup = currentGroup[currentGroup.length - 1];

              // Check if sessions are adjacent (current starts when last ends)
              if (currentSession.startTime === lastInGroup.endTime) {
                currentGroup.push(currentSession);
              } else {
                // Not adjacent, start a new group
                sessionGroups.push(currentGroup);
                currentGroup = [currentSession];
              }
            }
            // Add the last group
            sessionGroups.push(currentGroup);

            // Combine each group of adjacent sessions
            sessionGroups.forEach((group, groupIndex) => {
              if (group.length > 1) {
                const firstSession = group[0];
                const lastSession = group[group.length - 1];
                const totalHours = group.reduce((sum, session) => sum + session.allocatedHours, 0);

                const combinedSession: StudySession = {
                  ...firstSession,
                  startTime: firstSession.startTime,
                  endTime: lastSession.endTime,
                  allocatedHours: totalHours,
                  sessionNumber: groupIndex + 1
                };

                combinedSessions.push(combinedSession);
              } else {
                // Single session in group, keep as is but update session number
                combinedSessions.push({
                  ...group[0],
                  sessionNumber: groupIndex + 1
                });
              }
            });
          } else {
            // Single session, keep as is
            combinedSessions.push(sessions[0]);
          }
        });
        
        // Update the plan with combined sessions (keeping skipped sessions separate)
        const skippedSessions = plan.plannedTasks.filter(session => session.status === 'skipped');
        plan.plannedTasks = [...combinedSessions, ...skippedSessions];
        
        // Calculate totalStudyHours including skipped sessions as "done"
        plan.totalStudyHours = calculateTotalStudyHours(plan.plannedTasks);
      }
    };



    // For each task, distribute hours evenly across available days until deadline
    for (const task of tasksEven) {
      const deadline = new Date(task.deadline);
      if (settings.bufferDays > 0) {
        deadline.setDate(deadline.getDate() - settings.bufferDays);
      }
      // Normalize deadline to start of day for comparison with date strings
      const deadlineDateStr = deadline.toISOString().split('T')[0];
      // Include all available days up to and including the deadline day
      const startDateStr = (task as any).startDate || now.toISOString().split('T')[0];
      let daysForTask = availableDays.filter(d => d >= startDateStr && d <= deadlineDateStr);
      
      // Apply frequency preference if enabled and no conflict detected
      if (task.respectFrequencyForDeadlines !== false && task.targetFrequency) {
        const conflictCheck = checkFrequencyDeadlineConflict(task, settings);

        if (!conflictCheck.hasConflict) {
          // Apply frequency filtering to respect user preference
          let sessionGap = 1; // Days between sessions
          if (task.targetFrequency === 'weekly') {
            // Enhanced weekly scheduling: prioritize filling days with most available time slots
            // Ensure we have at least 2 weeks to work with before applying weekly preference
            const taskStartDate = new Date(task.startDate || now.toISOString().split('T')[0]);
            const taskDeadlineDate = new Date(task.deadline);
            const timeDiff = taskDeadlineDate.getTime() - taskStartDate.getTime();
            const daysAvailable = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (daysAvailable >= 14) { // At least 2 weeks available
              // Calculate available hours for each day and prioritize days with most available time
              // For frequency preferences, only consider existing tasks, not commitments
              const daysWithAvailability = daysForTask.map(date => {
                let availableTimeOnDay = dailyRemainingHours[date] || settings.dailyAvailableHours;

                return {
                  date,
                  availableTime: availableTimeOnDay
                };
              });

              // Sort by available time (descending) to prioritize days with most availability
              daysWithAvailability.sort((a, b) => b.availableTime - a.availableTime);

              // Select one day per week, prioritizing days with most available time
              const weeklyFilteredDays: string[] = [];
              const usedWeeks = new Set<string>();

              for (const { date } of daysWithAvailability) {
                const dateObj = new Date(date);
                // Create a week identifier (year-week)
                const weekStart = new Date(dateObj);
                weekStart.setDate(dateObj.getDate() - dateObj.getDay()); // Start of week (Sunday)
                const weekId = weekStart.toISOString().split('T')[0];

                if (!usedWeeks.has(weekId)) {
                  weeklyFilteredDays.push(date);
                  usedWeeks.add(weekId);
                }
              }

              // Sort the selected days chronologically
              weeklyFilteredDays.sort();
              daysForTask = weeklyFilteredDays;
            } else {
              // Less than 2 weeks available, use regular gap-based scheduling
              sessionGap = 7;
              const frequencyFilteredDays: string[] = [];
              for (let i = 0; i < daysForTask.length; i += sessionGap) {
                frequencyFilteredDays.push(daysForTask[i]);
              }
              daysForTask = frequencyFilteredDays;
            }
          } else if (task.targetFrequency === '3x-week') {
            // Enhanced 2-3 day scheduling: prioritize filling days with most available time slots
            // Like weekly preference, but allow 2-3 sessions per week instead of 1
            const taskStartDate = new Date(task.startDate || now.toISOString().split('T')[0]);
            const taskDeadlineDate = new Date(task.deadline);
            const timeDiff = taskDeadlineDate.getTime() - taskStartDate.getTime();
            const daysAvailable = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            // Calculate available hours for each day and prioritize by availability
            const daysWithAvailability = daysForTask.map(date => {
              let availableTimeOnDay = dailyRemainingHours[date] || settings.dailyAvailableHours;
              return { date, availableTime: availableTimeOnDay };
            });

            // Sort by available time (descending) to prioritize high-availability days
            daysWithAvailability.sort((a, b) => b.availableTime - a.availableTime);

            // Select 2-3 days per week, prioritizing days with most available time
            const filteredDays: string[] = [];
            const usedWeeks = new Map<string, number>(); // Track sessions per week

            for (const { date } of daysWithAvailability) {
              const dateObj = new Date(date);
              // Create week identifier (year-week)
              const weekStart = new Date(dateObj);
              weekStart.setDate(dateObj.getDate() - dateObj.getDay());
              const weekId = weekStart.toISOString().split('T')[0];

              const sessionsThisWeek = usedWeeks.get(weekId) || 0;

              // Allow up to 3 sessions per week for '3x-week' preference
              if (sessionsThisWeek < 3) {
                filteredDays.push(date);
                usedWeeks.set(weekId, sessionsThisWeek + 1);
              }
            }

            // Sort the selected days chronologically
            filteredDays.sort();
            daysForTask = filteredDays;
          } else if (task.targetFrequency === 'flexible') {
            // Enhanced flexible scheduling: adaptively select optimal days based on availability and urgency
            const taskStartDate = new Date(task.startDate || now.toISOString().split('T')[0]);
            const taskDeadlineDate = new Date(task.deadline);
            const timeDiff = taskDeadlineDate.getTime() - taskStartDate.getTime();
            const daysAvailable = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            // Calculate available hours for each day and prioritize by availability
            const daysWithAvailability = daysForTask.map(date => {
              let availableTimeOnDay = dailyRemainingHours[date] || settings.dailyAvailableHours;
              return { date, availableTime: availableTimeOnDay };
            });

            // Sort by available time (descending) to prioritize high-availability days
            daysWithAvailability.sort((a, b) => b.availableTime - a.availableTime);

            // For flexible tasks, adapt frequency based on time pressure and importance
            let maxSessionsPerWeek = 4; // More flexible than 3x-week
            if (task.importance) {
              maxSessionsPerWeek = 5; // Important tasks can be scheduled more frequently
            }

            // If time is very constrained, allow daily scheduling
            const estimatedSessionsNeeded = Math.ceil(task.estimatedHours / 2); // Assume 2h avg per session
            const weeksAvailable = Math.max(1, daysAvailable / 7);
            if (estimatedSessionsNeeded / weeksAvailable > maxSessionsPerWeek) {
              maxSessionsPerWeek = 7; // Allow daily if needed
            }

            // Select optimal days per week based on availability
            const filteredDays: string[] = [];
            const usedWeeks = new Map<string, number>(); // Track sessions per week

            for (const { date } of daysWithAvailability) {
              const dateObj = new Date(date);
              // Create week identifier (year-week)
              const weekStart = new Date(dateObj);
              weekStart.setDate(dateObj.getDate() - dateObj.getDay());
              const weekId = weekStart.toISOString().split('T')[0];

              const sessionsThisWeek = usedWeeks.get(weekId) || 0;

              if (sessionsThisWeek < maxSessionsPerWeek) {
                filteredDays.push(date);
                usedWeeks.set(weekId, sessionsThisWeek + 1);
              }
            }

            // Sort the selected days chronologically
            filteredDays.sort();
            daysForTask = filteredDays;
          }
          // daily frequency uses sessionGap = 1 (no filtering needed)
        }
      }
      

      
      // If no days available, skip this task
      if (daysForTask.length === 0) {
        continue;
      }
      
      let totalHours = task.estimatedHours;
      
      // Use optimized session distribution instead of simple even distribution
      const sessionLengths = optimizeSessionDistribution(task, totalHours, daysForTask, settings);
      

      // Assign sessions to available days, distributing optimally
      let unscheduledHours = 0;

      // Special handling for one-sitting tasks
      if (task.isOneTimeTask && sessionLengths.length === 1) {
        // For one-sitting tasks, try to find a day that can accommodate the full session
        let scheduledOneSitting = false;
        const fullSessionLength = sessionLengths[0];

        // First try the deadline day (or closest to deadline)
        for (let i = daysForTask.length - 1; i >= 0; i--) {
          const date = daysForTask[i];
          let availableHours = dailyRemainingHours[date];

          if (availableHours >= fullSessionLength) {
            // Found a day that can accommodate the full session
            let dayPlan = studyPlans.find(p => p.date === date)!;
            const roundedSessionLength = Math.round(fullSessionLength * 60) / 60;

            dayPlan.plannedTasks.push({
              taskId: task.id,
              scheduledTime: `${date}`,
              startTime: '',
              endTime: '',
              allocatedHours: roundedSessionLength,
              sessionNumber: 1,
              isFlexible: true,
              status: 'scheduled'
            });
            dayPlan.totalStudyHours = Math.round((dayPlan.totalStudyHours + roundedSessionLength) * 60) / 60;
            dailyRemainingHours[date] = Math.round((dailyRemainingHours[date] - roundedSessionLength) * 60) / 60;
            totalHours = Math.round((totalHours - roundedSessionLength) * 60) / 60;
            scheduledOneSitting = true;
            break;
          }
        }

        if (!scheduledOneSitting) {
          // If we couldn't schedule as one sitting, track all hours as unscheduled
          unscheduledHours += totalHours;
        }
      } else {
        // Regular task scheduling (can be split)
        for (let i = 0; i < sessionLengths.length && i < daysForTask.length; i++) {
          const date = daysForTask[i];
          let dayPlan = studyPlans.find(p => p.date === date)!;
          let availableHours = dailyRemainingHours[date];
          const thisSessionLength = Math.min(sessionLengths[i], availableHours);

          if (thisSessionLength > 0) {
            const roundedSessionLength = Math.round(thisSessionLength * 60) / 60;
            dayPlan.plannedTasks.push({
              taskId: task.id,
              scheduledTime: `${date}`,
              startTime: '',
              endTime: '',
              allocatedHours: roundedSessionLength,
              sessionNumber: (dayPlan.plannedTasks.filter(s => s.taskId === task.id).length) + 1,
              isFlexible: true,
              status: 'scheduled'
            });
            dayPlan.totalStudyHours = Math.round((dayPlan.totalStudyHours + roundedSessionLength) * 60) / 60;
            dailyRemainingHours[date] = Math.round((dailyRemainingHours[date] - roundedSessionLength) * 60) / 60;
            totalHours = Math.round((totalHours - roundedSessionLength) * 60) / 60;
          } else {
            // Track unscheduled hours for redistribution
            unscheduledHours += sessionLengths[i];
          }
        }
      }
      
      // Redistribute any unscheduled hours using the improved redistribution logic
      if (unscheduledHours > 0) {
        console.log(`Task "${task.title}" has ${unscheduledHours} unscheduled hours to redistribute`);
        
        const finalUnscheduledHours = redistributeUnscheduledHours(task, unscheduledHours, daysForTask);
        
        if (finalUnscheduledHours > 0) {
          console.log(`Task "${task.title}" still has ${finalUnscheduledHours} unscheduled hours after redistribution`);
        }
      }
    }
    
    // Combine sessions of the same task on the same day
    combineSessionsOnSameDay(studyPlans);
    
    // Validate scheduling for conflicts after all redistribution and combining
    studyPlans.forEach(plan => {
      if (!validateSessionTimes(plan.plannedTasks, fixedCommitments, plan.date)) {
        console.warn(`Scheduling conflicts detected on ${plan.date} after redistribution. Some sessions may overlap.`);
      }
    });

    // Final pass: handle any remaining unscheduled hours and create suggestions
    const suggestions: Array<{ taskTitle: string; unscheduledMinutes: number }> = [];
    let taskScheduledHours: { [taskId: string]: number } = {};
    
    // Calculate how many hours each task actually got scheduled (excluding skipped and completed sessions)
    for (const plan of studyPlans) {
      for (const session of plan.plannedTasks) {
        // Skip sessions that are marked as skipped or completed - they shouldn't count towards scheduled hours
        if (session.status !== 'skipped' && !session.done && session.status !== 'completed') {
          taskScheduledHours[session.taskId] = (taskScheduledHours[session.taskId] || 0) + session.allocatedHours;
        }
      }
    }
    
    // Global redistribution pass: try to fit any remaining unscheduled hours
    const tasksWithUnscheduledHours = tasksEven.filter(task => {
      const scheduledHours = taskScheduledHours[task.id] || 0;
      return task.estimatedHours - scheduledHours > 0;
    });
    
    if (tasksWithUnscheduledHours.length > 0) {
      console.log(`Global redistribution: ${tasksWithUnscheduledHours.length} tasks have unscheduled hours`);
      
      // Sort tasks by importance and deadline for global redistribution
      const sortedTasksForGlobalRedistribution = tasksWithUnscheduledHours.sort((a, b) => {
        if (a.importance !== b.importance) return a.importance ? -1 : 1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
      
      for (const task of sortedTasksForGlobalRedistribution) {
        const scheduledHours = taskScheduledHours[task.id] || 0;
        const unscheduledHours = task.estimatedHours - scheduledHours;
        
        if (unscheduledHours <= 0) continue;
        
        // Get deadline for this task
        const deadline = new Date(task.deadline);
        if (settings.bufferDays > 0) {
          deadline.setDate(deadline.getDate() - settings.bufferDays);
        }
        const deadlineDateStr = deadline.toISOString().split('T')[0];
        const startDateStrA = (task as any).startDate || now.toISOString().split('T')[0];
        const daysForTask = availableDays.filter(d => d >= startDateStrA && d <= deadlineDateStr);
        
        // Try to redistribute remaining hours
        const finalUnscheduledHours = redistributeUnscheduledHours(task, unscheduledHours, daysForTask);
        
        if (finalUnscheduledHours > 0) {
          console.log(`Global redistribution: Task "${task.title}" still has ${finalUnscheduledHours} unscheduled hours`);
        }
      }
      
      // Recalculate scheduled hours after global redistribution (excluding skipped and completed sessions)
      taskScheduledHours = {};
    for (const plan of studyPlans) {
      for (const session of plan.plannedTasks) {
        // Skip sessions that are marked as skipped or completed - they shouldn't count towards scheduled hours
        if (session.status !== 'skipped' && !session.done && session.status !== 'completed') {
          taskScheduledHours[session.taskId] = (taskScheduledHours[session.taskId] || 0) + session.allocatedHours;
        }
      }
      }
      
      // Combine sessions again after global redistribution
      combineSessionsOnSameDay(studyPlans);
    }
    
    // Check for unscheduled hours and create suggestions
    for (const task of tasksEven) {
      const scheduledHours = taskScheduledHours[task.id] || 0;
      const unscheduledHours = task.estimatedHours - scheduledHours;
      
      // Only show suggestions for tasks with more than 1 minute unscheduled (to avoid floating point precision issues)
      if (unscheduledHours > 0.016) { // 1 minute = 0.016 hours
        suggestions.push({
          taskTitle: task.title,
          unscheduledMinutes: Math.round(unscheduledHours * 60)
        });
      }
    }
    
    // For each day, sort plannedTasks by importance before assigning time slots
    for (const plan of studyPlans) {
              // Sort by importance first, then by deadline urgency (earlier deadline = more urgent)
        plan.plannedTasks.sort((a, b) => {
          const taskA = tasksEven.find(t => t.id === a.taskId);
          const taskB = tasksEven.find(t => t.id === b.taskId);
        if (!taskA || !taskB) return 0;
        if (taskA.importance !== taskB.importance) return taskA.importance ? -1 : 1;
        // If same importance, prioritize by deadline (earlier = more urgent)
        return new Date(taskA.deadline).getTime() - new Date(taskB.deadline).getTime();
      });
      // Assign time slots for each session, ensuring no overlap with commitments or other sessions
      const commitmentsForDay = fixedCommitments.filter(commitment => {
        // Check if this commitment applies to this specific date
        if (commitment.recurring) {
          // For recurring commitments, check if the day of week matches
          return commitment.daysOfWeek.includes(new Date(plan.date).getDay());
        } else {
          // For non-recurring commitments, check if the specific date matches
          return commitment.specificDates?.includes(plan.date) || false;
        }
      });
      let assignedSessions: StudySession[] = [];
      for (const session of plan.plannedTasks) {
        const slot = findNextAvailableTimeSlot(
          session.allocatedHours,
          assignedSessions,
          commitmentsForDay,
          settings.studyWindowStartHour || 6,
          settings.studyWindowEndHour || 23,
          settings.bufferTimeBetweenSessions || 0,
          plan.date,
          settings
        );
        if (slot) {
          session.startTime = slot.start;
          session.endTime = slot.end;
          assignedSessions.push(session);
        } else {
          session.startTime = '';
          session.endTime = '';
        }
      }

      // Validate that no sessions overlap on this day
      if (!validateSessionTimes(plan.plannedTasks, commitmentsForDay, plan.date)) {
        console.error(`Session overlap detected on ${plan.date} - some sessions may be incorrectly scheduled`);
      }
    }
    

    // Step 3: Schedule no-deadline tasks in remaining available time
    if (noDeadlineTasks.length > 0) {
      // Extend available days for no-deadline tasks (add 30 more days)
      const extendedDate = new Date(now);
      extendedDate.setDate(extendedDate.getDate() + 30);

      while (tempDate <= extendedDate) {
        const dateStr = tempDate.toISOString().split('T')[0];
        const dayOfWeek = tempDate.getDay();
        if (settings.workDays.includes(dayOfWeek) && !availableDays.includes(dateStr)) {
          availableDays.push(dateStr);
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }

      // Create study plans for extended days if needed
      availableDays.forEach(date => {
        if (!studyPlans.find(plan => plan.date === date)) {
          studyPlans.push({
            id: `${date}-study-plan`,
            date,
            plannedTasks: [],
            totalStudyHours: 0,
            availableHours: settings.dailyAvailableHours
          });
        }
      });

      // Schedule no-deadline tasks in available slots
      noDeadlineTasks.forEach((task, taskIndex) => {
        let remainingHours = task.estimatedHours;
        const minSessionHours = (task.minWorkBlock || 30) / 60; // Convert minutes to hours

        // Determine session frequency based on task preferences and available time
        let sessionGap = 1; // Days between sessions
        const availableDaysForTask = availableDays.length;
        const estimatedSessionsNeeded = Math.ceil(task.estimatedHours / 2); // Assume 2 hours per session average

        if (task.targetFrequency === 'weekly') {
          sessionGap = Math.min(7, Math.floor(availableDaysForTask / Math.max(1, estimatedSessionsNeeded)));
        } else if (task.targetFrequency === '3x-week') {
          sessionGap = Math.min(2, Math.floor(availableDaysForTask / Math.max(1, estimatedSessionsNeeded)));
        } else if (task.targetFrequency === 'flexible') {
          // For flexible tasks, adapt the gap based on available time and task urgency
          const optimalGap = Math.floor(availableDaysForTask / Math.max(1, estimatedSessionsNeeded));
          sessionGap = task.importance ? Math.max(1, Math.min(2, optimalGap)) : Math.max(1, Math.min(3, optimalGap));
        }

        let sessionNumber = 1;
        let dayIndex = 0;
        let failedAttempts = 0; // Track failed scheduling attempts

        // Respect task start date for no-deadline tasks
        const startStr = (task as any).startDate || now.toISOString().split('T')[0];
        // Initialize dayIndex to first day >= startStr
        while (dayIndex < availableDays.length && availableDays[dayIndex] < startStr) {
          dayIndex++;
        }
        while (remainingHours > 0 && dayIndex < availableDays.length) {
          const currentDate = availableDays[dayIndex];
          const plan = studyPlans.find(p => p.date === currentDate);

          if (plan) {
            // Calculate available time on this day (excluding completed sessions)
            const usedHours = plan.plannedTasks.reduce((sum, session) => {
              // Don't count completed sessions toward used hours
              if (session.done || session.status === 'completed') return sum;
              return sum + session.allocatedHours;
            }, 0);
            const availableHours = plan.availableHours - usedHours;

            // Check if we have enough time for minimum session
            if (availableHours >= minSessionHours) {
              // Determine session length based on task frequency preference and max session length
          let maxSessionHours = task.maxSessionLength || 2; // Use task's preference or default
          if (task.targetFrequency === 'weekly') {
            maxSessionHours = Math.min(maxSessionHours * 2, remainingHours); // Longer sessions for weekly tasks
          } else if (task.targetFrequency === 'daily') {
            maxSessionHours = Math.min(maxSessionHours * 0.75, remainingHours); // Shorter sessions for daily tasks
          }

          const sessionHours = Math.min(
            remainingHours,
            availableHours,
            Math.max(minSessionHours, maxSessionHours)
          );

              // Find proper time slot using the existing function to avoid conflicts
              const commitmentsForDay = fixedCommitments.filter(commitment => {
                if (commitment.recurring) {
                  return commitment.daysOfWeek.includes(new Date(currentDate).getDay());
                } else {
                  return commitment.specificDates?.includes(currentDate) || false;
                }
              });

              const slot = findNextAvailableTimeSlot(
                sessionHours,
                plan.plannedTasks, // existing sessions on this day
                commitmentsForDay,
                settings.studyWindowStartHour || 6,
                settings.studyWindowEndHour || 23,
                settings.bufferTimeBetweenSessions || 0,
                currentDate
              );

              if (slot) {
                const session: StudySession = {
                  taskId: task.id,
                  scheduledTime: currentDate,
                  startTime: slot.start,
                  endTime: slot.end,
                  allocatedHours: sessionHours,
                  sessionNumber,
                  isFlexible: true // Mark as flexible for easy rescheduling
                };

                plan.plannedTasks.push(session);
                plan.totalStudyHours += sessionHours;
                remainingHours -= sessionHours;
                sessionNumber++;
                failedAttempts = 0; // Reset failed attempts on successful scheduling
              } else {
                // No available slot on this day
                failedAttempts++;
                // For flexible tasks, try more frequently if we're having trouble scheduling
                if (task.targetFrequency === 'flexible' && failedAttempts > 2) {
                  sessionGap = 1; // Fall back to daily attempts
                }
              }

              // Apply session gap for next scheduling
              dayIndex += sessionGap;
            } else {
              dayIndex++;
            }
          } else {
            dayIndex++;
          }
        }

        // Track unscheduled hours
        if (remainingHours > 0) {
          suggestions.push({
            taskTitle: task.title,
            unscheduledMinutes: Math.round(remainingHours * 60)
          });
        }
      });
    }

    // After all days, return plans and suggestions for any unscheduled hours
    return { plans: studyPlans, suggestions };
  }

  if (settings.studyPlanMode === 'balanced') {
    // BALANCED PRIORITY DISTRIBUTION LOGIC
    // Combines even distribution stability with priority-based task ordering
    const allPendingTasksBalanced = tasks.filter(task => task.status === 'pending' && task.estimatedHours > 0);

    const deadlineTasksBalanced = allPendingTasksBalanced
      .filter(task => task.deadline && task.deadline.trim().length > 0 && task.deadlineType !== 'none')
      .sort((a, b) => {
        // First sort by importance
        if (a.importance !== b.importance) return a.importance ? -1 : 1;
        // Then by deadline urgency for same importance level
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });

    const noDeadlineTasksBalanced = allPendingTasksBalanced
      .filter(task => !task.deadline || task.deadline.trim().length === 0 || task.deadlineType === 'none')
      .sort((a, b) => {
        if (a.importance !== b.importance) return a.importance ? -1 : 1; // Important first
        return (a.title || '').localeCompare(b.title || ''); // Then alphabetically
      });

    const tasksBalanced = deadlineTasksBalanced;

    // Create priority tiers for balanced distribution
    const importantTasks = tasksBalanced.filter(task => task.importance);
    const regularTasks = tasksBalanced.filter(task => !task.importance);

    // Further categorize by deadline urgency within each tier
    const now = new Date();
    const urgentImportant = importantTasks.filter(task => {
      const daysUntilDeadline = (new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilDeadline <= 3;
    });
    const notUrgentImportant = importantTasks.filter(task => {
      const daysUntilDeadline = (new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilDeadline > 3;
    });
    const urgentRegular = regularTasks.filter(task => {
      const daysUntilDeadline = (new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilDeadline <= 3;
    });
    const notUrgentRegular = regularTasks.filter(task => {
      const daysUntilDeadline = (new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilDeadline > 3;
    });

    // Reorder tasks by balanced priority: Q1 (urgent+important) -> Q2 (important) -> Q3 (urgent) -> Q4 (neither)
    const prioritizedTasks = [...urgentImportant, ...notUrgentImportant, ...urgentRegular, ...notUrgentRegular];

    // Use same day calculation logic as even mode
    const latestDeadline = new Date(Math.max(...prioritizedTasks.map(t => new Date(t.deadline).getTime())));
    const availableDays: string[] = [];
    const tempDate = new Date(now);
    while (tempDate <= latestDeadline) {
      const dateStr = tempDate.toISOString().split('T')[0];
      const dayOfWeek = tempDate.getDay();
      if (settings.workDays.includes(dayOfWeek)) {
        availableDays.push(dateStr);
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // Include deadline days
    if (settings.bufferDays === 0) {
      prioritizedTasks.forEach(task => {
        const deadlineDateStr = new Date(task.deadline).toISOString().split('T')[0];
        if (!availableDays.includes(deadlineDateStr) && settings.workDays.includes(new Date(deadlineDateStr).getDay())) {
          availableDays.push(deadlineDateStr);
        }
      });
    } else {
      prioritizedTasks.forEach(task => {
        const deadline = new Date(task.deadline);
        deadline.setDate(deadline.getDate() - settings.bufferDays);
        const deadlineDateStr = deadline.toISOString().split('T')[0];
        if (!availableDays.includes(deadlineDateStr) && settings.workDays.includes(new Date(deadlineDateStr).getDay())) {
          availableDays.push(deadlineDateStr);
        }
      });
    }
    availableDays.sort();

    const studyPlans: StudyPlan[] = [];
    const dailyRemainingHours: { [date: string]: number } = {};
    availableDays.forEach(date => {
      const actualAvailableHours = calculateDailyAvailableHours(date, settings.dailyAvailableHours, commitments, settings);
      dailyRemainingHours[date] = actualAvailableHours;
      studyPlans.push({
        id: `plan-${date}`,
        date,
        plannedTasks: [],
        totalStudyHours: 0,
        availableHours: actualAvailableHours
      });
    });

    // Balanced distribution: Apply even distribution within priority tiers
    const distributeTierTasks = (tierTasks: Task[], tierName: string) => {
      const tierTaskScheduledHours: { [taskId: string]: number } = {};
      tierTasks.forEach(task => {
        tierTaskScheduledHours[task.id] = 0;
      });

      // Calculate total hours needed for this tier
      const totalTierHours = tierTasks.reduce((sum, task) => sum + task.estimatedHours, 0);

      if (totalTierHours === 0) return;

      // Distribute tier tasks evenly across available days until their deadlines
      for (const task of tierTasks) {
        const deadline = new Date(task.deadline);
        if (settings.bufferDays > 0) {
          deadline.setDate(deadline.getDate() - settings.bufferDays);
        }
        const deadlineDateStr = deadline.toISOString().split('T')[0];
        const startDateStrB = (task as any).startDate || now.toISOString().split('T')[0];
        const daysForTask = availableDays.filter(d => d >= startDateStrB && d <= deadlineDateStr);

        if (daysForTask.length === 0) continue;

        // Use optimized session distribution for even spreading
        const sessionLengths = optimizeSessionDistribution(task, task.estimatedHours, daysForTask, settings);

        for (let i = 0; i < sessionLengths.length && i < daysForTask.length; i++) {
          let dayIndex = i;
          
          // For non-important one-sitting tasks, prefer scheduling on the actual deadline day (respecting buffer)
          if (task.isOneTimeTask && !task.importance && sessionLengths.length === 1) {
            // Calculate the effective deadline (respecting buffer days)
            const effectiveDeadline = new Date(task.deadline);
            if (settings.bufferDays > 0) {
              effectiveDeadline.setDate(effectiveDeadline.getDate() - settings.bufferDays);
            }
            const effectiveDeadlineStr = effectiveDeadline.toISOString().split('T')[0];
            
            // First priority: Schedule on the effective deadline day itself (last available day)
            const effectiveDeadlineIndex = daysForTask.indexOf(effectiveDeadlineStr);
            
            if (effectiveDeadlineIndex !== -1) {
              // Effective deadline day is available, use it
              dayIndex = effectiveDeadlineIndex;
            } else {
              // Fallback: Find the closest available day to the effective deadline
              const effectiveDeadlineTime = effectiveDeadline.getTime();
              let closestIndex = daysForTask.length - 1; // Start with the last available day
              let minDistance = Math.abs(new Date(daysForTask[closestIndex]).getTime() - effectiveDeadlineTime);
              
              for (let j = 0; j < daysForTask.length - 1; j++) {
                const distance = Math.abs(new Date(daysForTask[j]).getTime() - effectiveDeadlineTime);
                if (distance < minDistance) {
                  minDistance = distance;
                  closestIndex = j;
                }
              }
              dayIndex = closestIndex;
            }
          }
          
          const date = daysForTask[dayIndex];
          const dayPlan = studyPlans.find(p => p.date === date)!;
          const availableHours = dailyRemainingHours[date];
          const thisSessionLength = Math.min(sessionLengths[i], availableHours);

          if (thisSessionLength > 0) {
            const roundedSessionLength = Math.round(thisSessionLength * 60) / 60;
            dayPlan.plannedTasks.push({
              taskId: task.id,
              scheduledTime: `${date}`,
              startTime: '',
              endTime: '',
              allocatedHours: roundedSessionLength,
              sessionNumber: (dayPlan.plannedTasks.filter(s => s.taskId === task.id).length) + 1,
              isFlexible: true,
              status: 'scheduled'
            });
            dayPlan.totalStudyHours = Math.round((dayPlan.totalStudyHours + roundedSessionLength) * 60) / 60;
            dailyRemainingHours[date] = Math.round((dailyRemainingHours[date] - roundedSessionLength) * 60) / 60;
            tierTaskScheduledHours[task.id] = Math.round((tierTaskScheduledHours[task.id] + roundedSessionLength) * 60) / 60;
          }
        }
      }
    };

    // Distribute tasks by priority tier
    distributeTierTasks(urgentImportant, 'Urgent & Important');
    distributeTierTasks(notUrgentImportant, 'Important');
    distributeTierTasks(urgentRegular, 'Urgent');
    distributeTierTasks(notUrgentRegular, 'Regular');

    // Sort sessions within each day by priority (important first, then by deadline)
    for (const plan of studyPlans) {
      plan.plannedTasks.sort((a, b) => {
        const taskA = prioritizedTasks.find(t => t.id === a.taskId);
        const taskB = prioritizedTasks.find(t => t.id === b.taskId);
        if (!taskA || !taskB) return 0;
        if (taskA.importance !== taskB.importance) return taskA.importance ? -1 : 1;
        return new Date(taskA.deadline).getTime() - new Date(taskB.deadline).getTime();
      });

      // Assign time slots with same logic as other modes
      const commitmentsForDay = fixedCommitments.filter(commitment => {
        if (commitment.recurring) {
          return commitment.daysOfWeek.includes(new Date(plan.date).getDay());
        } else {
          return commitment.specificDates?.includes(plan.date) || false;
        }
      });

      let assignedSessions: StudySession[] = [];
      for (const session of plan.plannedTasks) {
        const slot = findNextAvailableTimeSlot(
          session.allocatedHours,
          assignedSessions,
          commitmentsForDay,
          settings.studyWindowStartHour || 6,
          settings.studyWindowEndHour || 23,
          settings.bufferTimeBetweenSessions || 0,
          plan.date
        );
        if (slot) {
          session.startTime = slot.start;
          session.endTime = slot.end;
          assignedSessions.push(session);
        } else {
          session.startTime = '';
          session.endTime = '';
        }
      }
    }

    // Schedule no-deadline tasks in remaining available time with frequency consideration
    if (noDeadlineTasksBalanced.length > 0) {
      noDeadlineTasksBalanced.forEach(task => {
        let remainingHours = task.estimatedHours;
        const minSessionHours = (task.minWorkBlock || 30) / 60;
        let sessionNumber = 1;

        // Determine session frequency based on task preferences
        let sessionGap = 1;
        if (task.targetFrequency === 'weekly') sessionGap = 7;
        else if (task.targetFrequency === '3x-week') sessionGap = 2;
        else if (task.targetFrequency === 'flexible') {
          sessionGap = task.importance ? 2 : 3;
        }

        let planIndex = 0;
        while (remainingHours > 0 && planIndex < studyPlans.length) {
          const plan = studyPlans[planIndex];
          const usedHours = plan.plannedTasks.reduce((sum, session) => {
            // Don't count completed sessions toward used hours
            if (session.done || session.status === 'completed') return sum;
            return sum + session.allocatedHours;
          }, 0);
          const availableHours = plan.availableHours - usedHours;

          if (availableHours >= minSessionHours) {
            // Determine session length based on frequency preference and task preference
            let maxSessionHours = task.maxSessionLength || 1.5; // Use task's preference or default
            if (task.targetFrequency === 'weekly') {
              maxSessionHours = Math.min(maxSessionHours * 2, remainingHours); // Longer sessions for weekly tasks
            } else if (task.targetFrequency === 'daily') {
              maxSessionHours = Math.min(maxSessionHours * 0.75, remainingHours); // Shorter sessions for daily tasks
            }

            let sessionHours;
            if (task.isOneTimeTask && sessionNumber === 1) {
              sessionHours = remainingHours <= availableHours ? remainingHours : 0;
            } else {
              sessionHours = Math.min(remainingHours, availableHours, maxSessionHours);
            }

            if (sessionHours > 0) {
              // Find available time slot
              const commitmentsForDay = fixedCommitments.filter(commitment =>
                doesCommitmentApplyToDate(commitment, plan.date)
              );

              const slot = findNextAvailableTimeSlot(
                sessionHours,
                plan.plannedTasks,
                commitmentsForDay,
                settings.studyWindowStartHour || 6,
                settings.studyWindowEndHour || 23,
                settings.bufferTimeBetweenSessions || 0,
                plan.date
              );

              if (slot) {
                const session: StudySession = {
                  taskId: task.id,
                  scheduledTime: plan.date,
                  startTime: slot.start,
                  endTime: slot.end,
                  allocatedHours: sessionHours,
                  sessionNumber,
                  isFlexible: true
                };

                plan.plannedTasks.push(session);
                plan.totalStudyHours += sessionHours;
                remainingHours -= sessionHours;
                sessionNumber++;
              }
            }
          }

          planIndex += sessionGap; // Apply frequency gap
        }
      });
    }

    // Create suggestions for any unscheduled hours
    const suggestions = getUnscheduledMinutesForTasks(prioritizedTasks,
      prioritizedTasks.reduce((acc, task) => {
        acc[task.id] = studyPlans.reduce((sum, plan) =>
          sum + plan.plannedTasks.filter(s => s.taskId === task.id && s.status !== 'skipped')
            .reduce((sessionSum, session) => sessionSum + session.allocatedHours, 0), 0);
        return acc;
      }, {} as { [taskId: string]: number }), settings);

    return { plans: studyPlans, suggestions };
  }

  // Step 1: Filter and sort tasks by Eisenhower Matrix logic
  const allPendingTasksEisen = tasks.filter(task => task.status === 'pending' && task.estimatedHours > 0);

  const deadlineTasksEisen = allPendingTasksEisen
    .filter(task => task.deadline && task.deadline.trim().length > 0 && task.deadlineType !== 'none')
    .sort((a, b) => {
      if (a.importance !== b.importance) return a.importance ? -1 : 1; // Important first
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime(); // Then by deadline
    });

  const noDeadlineTasksEisen = allPendingTasksEisen
    .filter(task => !task.deadline || task.deadline.trim().length === 0 || task.deadlineType === 'none')
    .sort((a, b) => {
      if (a.importance !== b.importance) return a.importance ? -1 : 1; // Important first
      return (a.title || '').localeCompare(b.title || ''); // Then alphabetically
    });

  const tasksSorted = deadlineTasksEisen;

  // Step 2: Create a map of available study days (using same logic as even mode)
  const now = new Date();
  // Calculate latest deadline using original deadlines (buffer will be applied per task)
  const latestDeadline = new Date(Math.max(...tasksSorted.map(t => new Date(t.deadline).getTime())));
  const availableDays: string[] = [];
  const tempDate = new Date(now);
  // Include the latest deadline day by using <= comparison
  while (tempDate <= latestDeadline) {
    const dateStr = tempDate.toISOString().split('T')[0];
    const dayOfWeek = tempDate.getDay();
    if (settings.workDays.includes(dayOfWeek)) {
      availableDays.push(dateStr);
    }
    tempDate.setDate(tempDate.getDate() + 1);
  }
  
  // When buffer days is 0, ensure we include the deadline day itself
  if (settings.bufferDays === 0) {
    // Add any missing deadline days that might not be included due to time zone issues
    tasksSorted.forEach(task => {
      const deadlineDateStr = new Date(task.deadline).toISOString().split('T')[0];
      if (!availableDays.includes(deadlineDateStr) && settings.workDays.includes(new Date(deadlineDateStr).getDay())) {
        availableDays.push(deadlineDateStr);
      }
    });
    // Sort available days to maintain order
    availableDays.sort();
  } else {
    // When buffer days > 0, ensure we include the buffer-adjusted deadline days
    tasksSorted.forEach(task => {
      const deadline = new Date(task.deadline);
      deadline.setDate(deadline.getDate() - settings.bufferDays);
      const deadlineDateStr = deadline.toISOString().split('T')[0];
      if (!availableDays.includes(deadlineDateStr) && settings.workDays.includes(new Date(deadlineDateStr).getDay())) {
        availableDays.push(deadlineDateStr);
      }
    });
    // Sort available days to maintain order
    availableDays.sort();
  }

  const studyPlans: StudyPlan[] = [];
  const dailyRemainingHours: { [date: string]: number } = {};
  availableDays.forEach(date => {
    dailyRemainingHours[date] = settings.dailyAvailableHours;
    studyPlans.push({
      id: `plan-${date}`,
      date,
      plannedTasks: [],
      totalStudyHours: 0,
      availableHours: settings.dailyAvailableHours
    });
  });

  let taskScheduledHours: { [taskId: string]: number } = {};
  tasksSorted.forEach(task => {
    taskScheduledHours[task.id] = 0;
  });

  // suggestions will be created by the helper below

  // For each day, allocate hours by Eisenhower Matrix order
  for (const date of availableDays) {
    let dayPlan = studyPlans.find(p => p.date === date)!;
    let availableHours = dailyRemainingHours[date];
    // Get all fixed commitments for this day
            const commitmentsForDay = fixedCommitments.filter(commitment => {
          // Check if this commitment applies to this specific date
          if (commitment.recurring) {
            // For recurring commitments, check if the day of week matches
            return commitment.daysOfWeek.includes(new Date(date).getDay());
          } else {
            // For non-recurring commitments, check if the specific date matches
            return commitment.specificDates?.includes(date) || false;
          }
        });
    // Get tasks that still need hours and are not past their deadline (using same logic as even mode)
    const tasksForDay = tasksSorted.filter(task => {
      const deadline = new Date(task.deadline);
      if (settings.bufferDays > 0) {
        deadline.setDate(deadline.getDate() - settings.bufferDays);
      }
      // Normalize deadline to start of day for comparison
      const deadlineDateStr = deadline.toISOString().split('T')[0];
      const startDateStrC = (task as any).startDate || now.toISOString().split('T')[0];
      const daysForTask = availableDays.filter(d => d >= startDateStrC && d <= deadlineDateStr);
      return taskScheduledHours[task.id] < task.estimatedHours && date <= deadlineDateStr;
    });
    for (const task of tasksForDay) {
      if (availableHours <= 0) break;
      const remainingTaskHours = task.estimatedHours - taskScheduledHours[task.id];
      if (remainingTaskHours <= 0) continue;
      // Allocate as much as possible for this task
      // For one-time tasks, schedule all remaining hours at once if possible
      let hoursToSchedule;
      if (task.isOneTimeTask && taskScheduledHours[task.id] === 0) {
        // One-time task: try to schedule all hours at once, but if not possible on this day,
        // skip to try other days instead of failing completely
        if (remainingTaskHours <= availableHours) {
          hoursToSchedule = remainingTaskHours;
        } else {
          // Continue to next day to find one that can accommodate the full session
          continue;
        }
      } else {
        // Regular task: can be split across sessions
        hoursToSchedule = Math.min(remainingTaskHours, availableHours);
      }
      if (hoursToSchedule > 0) {
        // Find the next available time slot for this session
        const existingSessions = dayPlan.plannedTasks;
        const slot = findNextAvailableTimeSlot(
          hoursToSchedule,
          existingSessions,
          commitmentsForDay,
          settings.studyWindowStartHour || 6,
          settings.studyWindowEndHour || 23,
          settings.bufferTimeBetweenSessions || 0, // pass buffer
          date // pass target date for filtering deleted occurrences
        );
        if (!slot) continue; // No available slot for this session
        const sessionNumber = (dayPlan.plannedTasks.filter(s => s.taskId === task.id).length) + 1;
        const session: StudySession = {
          taskId: task.id,
          scheduledTime: `${date} ${slot.start}`,
          startTime: slot.start,
          endTime: slot.end,
          allocatedHours: Math.round(hoursToSchedule * 60) / 60,
          sessionNumber,
          isFlexible: true,
          status: 'scheduled'
        };
        dayPlan.plannedTasks.push(session);
        dayPlan.totalStudyHours = Math.round((dayPlan.totalStudyHours + session.allocatedHours) * 60) / 60;
        dailyRemainingHours[date] = Math.round((dailyRemainingHours[date] - session.allocatedHours) * 60) / 60;
        availableHours = Math.round((availableHours - session.allocatedHours) * 60) / 60;
        taskScheduledHours[task.id] = Math.round((taskScheduledHours[task.id] + session.allocatedHours) * 60) / 60;
      }
    }
  }

  // Schedule no-deadline tasks in remaining available time
  if (noDeadlineTasksEisen.length > 0) {
    noDeadlineTasksEisen.forEach(task => {
      let remainingHours = task.estimatedHours;
      const minSessionHours = (task.minWorkBlock || 30) / 60;
      let sessionNumber = 1;

      for (const plan of studyPlans) {
        if (remainingHours <= 0) break;

        const usedHours = plan.plannedTasks.reduce((sum, session) => {
          // Don't count completed sessions toward used hours
          if (session.done || session.status === 'completed') return sum;
          return sum + session.allocatedHours;
        }, 0);
        const availableHours = plan.availableHours - usedHours;

        if (availableHours >= minSessionHours) {
          // Determine session length based on task preference and frequency
          let maxSessionHours = task.maxSessionLength || 1.5; // Use task's preference or default
          if (task.targetFrequency === 'weekly') {
            maxSessionHours = Math.min(maxSessionHours * 2, remainingHours); // Longer sessions for weekly tasks
          } else if (task.targetFrequency === 'daily') {
            maxSessionHours = Math.min(maxSessionHours * 0.75, remainingHours); // Shorter sessions for daily tasks
          }

          let sessionHours;
          if (task.isOneTimeTask && sessionNumber === 1) {
            sessionHours = remainingHours <= availableHours ? remainingHours : 0;
          } else {
            sessionHours = Math.min(remainingHours, availableHours, maxSessionHours);
          }

          if (sessionHours <= 0) continue;

          // Find available time slot
          const commitmentsForDay = fixedCommitments.filter(commitment =>
            doesCommitmentApplyToDate(commitment, plan.date)
          );

          const slot = findNextAvailableTimeSlot(
            sessionHours,
            plan.plannedTasks,
            commitmentsForDay,
            settings.studyWindowStartHour || 6,
            settings.studyWindowEndHour || 23,
            settings.bufferTimeBetweenSessions || 0,
            plan.date
          );

          if (slot) {
            const session: StudySession = {
              taskId: task.id,
              scheduledTime: `${plan.date} ${slot.start}`,
              startTime: slot.start,
              endTime: slot.end,
              allocatedHours: sessionHours,
              sessionNumber,
              isFlexible: true,
              status: 'scheduled'
            };

            plan.plannedTasks.push(session);
            plan.totalStudyHours += sessionHours;
            remainingHours -= sessionHours;
            sessionNumber++;
          }
        }
      }

      // Add to task scheduled hours tracking
      taskScheduledHours[task.id] = (taskScheduledHours[task.id] || 0) + (task.estimatedHours - remainingHours);
    });
  }

  // After all days, add suggestions for any unscheduled hours
  const suggestions = getUnscheduledMinutesForTasks(tasksSorted, taskScheduledHours, settings);
  return { plans: studyPlans, suggestions };
};

// Legacy functions for backward compatibility
export const generateStudyPlan = generateNewStudyPlan;

export const generateSmartSuggestions = (tasks: Task[], unscheduledTasks?: Task[]) => {
  const suggestions = [];
  const now = new Date();

  // Overdue tasks (any quadrant)
  const overdueTasks = tasks.filter(task => {
    const deadline = new Date(task.deadline);
    return deadline < now && task.status === 'pending';
  });
  if (overdueTasks.length > 0) {
    suggestions.push({
      type: 'warning' as const,
      message: `You have ${overdueTasks.length} overdue task(s). Consider extending deadlines or increasing study hours.`,
      action: 'Review and update deadlines for overdue tasks.'
    });
  }

  // Q1 & Q3: Urgent tasks (due soon)
  const urgentTasks = tasks.filter(task => {
    const deadline = new Date(task.deadline);
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline <= 3 && task.status === 'pending';
  });
  const urgentImportant = urgentTasks.filter(task => task.importance);
  const urgentNotImportant = urgentTasks.filter(task => !task.importance);

  if (urgentImportant.length > 0) {
    suggestions.push({
      type: 'warning' as const,
      message: `You have ${urgentImportant.length} important task(s) due within 3 days.`,
      action: 'Focus on these tasks first to avoid last-minute stress.'
    });
  }
  if (urgentNotImportant.length > 0) {
    suggestions.push({
      type: 'warning' as const,
      message: `You have ${urgentNotImportant.length} urgent but not important task(s) due soon. These may not fit in your schedule.`,
      action: 'Consider increasing your daily hour limit, delegating, or rescheduling these tasks.'
    });
  }

  // Eisenhower mode: Warn if urgent low-priority tasks are unscheduled due to prioritization
  if (unscheduledTasks && unscheduledTasks.length > 0) {
    const unscheduledUrgentLowPriority = unscheduledTasks.filter(task => {
      const deadline = new Date(task.deadline);
      const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDeadline <= 3 && !task.importance && task.status === 'pending';
    });
    if (unscheduledUrgentLowPriority.length > 0) {
      suggestions.push({
        type: 'warning' as const,
        message: `Some low-priority tasks with urgent deadlines could not be scheduled because higher-priority urgent tasks are taking precedence.`,
        action: 'Consider increasing your daily available hours, rescheduling, or marking some tasks as more important.'
      });
    }
  }

  // Q2: Important but not urgent (encourage scheduling)
  const importantNotUrgent = tasks.filter(task => {
    const deadline = new Date(task.deadline);
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline > 3 && task.importance && task.status === 'pending';
  });
  if (importantNotUrgent.length > 0) {
    suggestions.push({
      type: 'suggestion' as const,
      message: `You have ${importantNotUrgent.length} important task(s) with more than 3 days until deadline.`,
      action: 'Schedule time for these now to avoid last-minute stress.'
    });
  }

  // Q4: Not important & not urgent (may be unscheduled)
  const notImportantNotUrgent = tasks.filter(task => {
    const deadline = new Date(task.deadline);
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline > 3 && !task.importance && task.status === 'pending';
  });
  if (notImportantNotUrgent.length > 0) {
    suggestions.push({
      type: 'suggestion' as const,
      message: `You have ${notImportantNotUrgent.length} task(s) that are neither urgent nor important.`,
      action: 'Do these only if you have extra time, or consider dropping them.'
    });
  }

  // Completed tasks
  const completedTasks = tasks.filter(task => task.status === 'completed');
  if (completedTasks.length > 0) {
    suggestions.push({
      type: 'celebration' as const,
      message: `Great job! You've completed ${completedTasks.length} task(s).`,
      action: 'Keep up the momentum!'
    });
  }

  return suggestions;
};

// Helper to detect unscheduled minutes for each task
export function getUnscheduledMinutesForTasks(tasks: Task[], taskScheduledHours: Record<string, number>, settings?: UserSettings) {
  const minSessionLengthHours = settings?.minSessionLength ? settings.minSessionLength / 60 : 0.016; // Default to 1 minute if no settings provided
  
  return tasks
    .filter(task => task.status === 'pending') // Only include pending tasks
    .map(task => {
      const scheduled = taskScheduledHours[task.id] || 0;
      const unscheduled = Math.max(0, task.estimatedHours - scheduled);
      // Only include tasks with unscheduled time above the minimum session length
      return unscheduled > minSessionLengthHours
        ? { 
            taskTitle: task.title, 
            unscheduledMinutes: Math.round(unscheduled * 60),
            importance: task.importance,
            deadline: task.deadline
          }
        : null;
    })
    .filter(Boolean) as Array<{ taskTitle: string; unscheduledMinutes: number; importance: boolean; deadline: string }>;
}

// Time slot calculation functions
interface TimeSlot {
  start: Date;
  end: Date;
}

export const getDailyAvailableTimeSlots = (
  date: Date,
  dailyHours: number,
  commitments: FixedCommitment[],
  workDays: number[],
  startHour: number,
  endHour: number,
  settings?: UserSettings // Add settings parameter to get date-specific study window
): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const dayOfWeek = date.getDay();
  
  // Check if this is a work day
  if (!workDays.includes(dayOfWeek)) {
    return slots;
  }
  
  const dateString = date.toISOString().split('T')[0];
  
  // Filter commitments for this day using the proper date applicability check
  const dayCommitments = commitments.filter(commitment => {
    return doesCommitmentApplyToDate(commitment, dateString);
  });
  
  // Use date-specific study window if available
  let effectiveStartHour = startHour;
  let effectiveEndHour = endHour;
  
  if (settings) {
    const effectiveWindow = getEffectiveStudyWindow(dateString, settings);
    effectiveStartHour = effectiveWindow.startHour;
    effectiveEndHour = effectiveWindow.endHour;
  }
  
  // Create time slots around commitments
  let currentTime = new Date(date);
  currentTime.setHours(effectiveStartHour, 0, 0, 0);
  
  const endTime = new Date(date);
  endTime.setHours(effectiveEndHour, 0, 0, 0);
  
  // Calculate total available time for the day
  const totalAvailableMinutes = dailyHours * 60;
  let usedMinutes = 0;
  
  // Sort commitments by start time
  const sortedCommitments = dayCommitments.sort((a, b) => {
    const aStartTime = a.modifiedOccurrences?.[dateString]?.startTime || a.startTime || '00:00';
    const bStartTime = b.modifiedOccurrences?.[dateString]?.startTime || b.startTime || '00:00';
    return aStartTime.localeCompare(bStartTime);
  });
  
  for (const commitment of sortedCommitments) {
    const modifiedSession = commitment.modifiedOccurrences?.[dateString];
    
    const commitmentStart = new Date(date);
    const [startHour, startMinute] = (modifiedSession?.startTime || commitment.startTime || '00:00').split(':').map(Number);
    commitmentStart.setHours(startHour, startMinute, 0, 0);
    
    const commitmentEnd = new Date(date);
    const [endHour, endMinute] = (modifiedSession?.endTime || commitment.endTime || '23:59').split(':').map(Number);
    commitmentEnd.setHours(endHour, endMinute, 0, 0);
    
    // Add slot before commitment if there's time
    if (currentTime < commitmentStart) {
      const slotDuration = (commitmentStart.getTime() - currentTime.getTime()) / (1000 * 60);
      if (usedMinutes + slotDuration <= totalAvailableMinutes) {
        slots.push({
          start: currentTime,
          end: commitmentStart
        });
        usedMinutes += slotDuration;
      }
    }
    
    currentTime = commitmentEnd;
  }
  
  // Add final slot if there's time remaining
  if (currentTime < endTime) {
    const remainingMinutes = totalAvailableMinutes - usedMinutes;
    const slotDuration = Math.min(
      (endTime.getTime() - currentTime.getTime()) / (1000 * 60),
      remainingMinutes
    );
    
    if (slotDuration > 0) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60 * 1000);
      slots.push({
        start: currentTime,
        end: slotEnd
      });
    }
  }
  
  return slots;
};

export const findNextAvailableStartTime = (
  startTime: Date,
  durationMinutes: number,
  existingSessions: StudySession[],
  date: Date,
  settings: UserSettings
): Date | null => {
  const dateString = date.toISOString().split('T')[0];
  
  // Use date-specific study window if available
  const effectiveWindow = getEffectiveStudyWindow(dateString, settings);
  
  const studyWindowStart = new Date(date);
  studyWindowStart.setHours(effectiveWindow.startHour, 0, 0, 0);
  
  const studyWindowEnd = new Date(date);
  studyWindowEnd.setHours(effectiveWindow.endHour, 0, 0, 0);
  
  // Check for conflicts with existing sessions
  const proposedEndTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
  
  for (const session of existingSessions) {
    const sessionStart = new Date(date);
    const [startHour, startMinute] = (session.startTime || '00:00').split(':').map(Number);
    sessionStart.setHours(startHour, startMinute, 0, 0);
    
    const sessionEnd = new Date(date);
    const [endHour, endMinute] = (session.endTime || '23:59').split(':').map(Number);
    sessionEnd.setHours(endHour, endMinute, 0, 0);
    
    // Check if there's a conflict
    if (startTime < sessionEnd && proposedEndTime > sessionStart) {
      // Move to after this session
      startTime = sessionEnd;
    }
  }
  
  // Check if the proposed start time is within the study window
  if (startTime >= studyWindowStart && startTime <= studyWindowEnd) {
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    if (endTime <= studyWindowEnd) {
      return startTime;
    }
  }
  
  // If not, return the study window start time
  return studyWindowStart;
};


/**
 * Enhanced skip session function with partial skip support
 */
export const skipSessionEnhanced = (
  studyPlans: StudyPlan[],
  planDate: string,
  sessionNumber: number,
  taskId: string,
  options: {
    partialHours?: number;
    reason?: 'user_choice' | 'conflict' | 'overload';
  } = {}
): boolean => {
  const engine = createEnhancedRedistributionEngine(
    { dailyAvailableHours: 8, workDays: [1,2,3,4,5], bufferDays: 0, minSessionLength: 15, bufferTimeBetweenSessions: 0, shortBreakDuration: 5, longBreakDuration: 15, maxConsecutiveHours: 4, studyWindowStartHour: 6, studyWindowEndHour: 23, avoidTimeRanges: [], weekendStudyHours: 6, autoCompleteSessions: false, enableNotifications: true },
    []
  );
  return engine.skipSession(studyPlans, planDate, sessionNumber, taskId, options);
};

/**
 * Validate time slot for conflicts
 */
export const validateTimeSlot = (
  date: string,
  startTime: string,
  endTime: string,
  existingSessions: StudySession[],
  settings: UserSettings,
  fixedCommitments: FixedCommitment[]
) => {
  const checker = createConflictChecker(settings, fixedCommitments);
  return checker.validateTimeSlot(date, startTime, endTime, existingSessions);
};





export const moveIndividualSession = (
  studyPlans: StudyPlan[],
  session: StudySession,
  originalPlanDate: string,
  settings: UserSettings,
  fixedCommitments: FixedCommitment[]
) => {
  const updatedPlans = [...studyPlans];
  const today = getLocalDateString();
  
  // Try to move to today
  const todayPlan = updatedPlans.find(p => p.date === today);
  if (todayPlan && settings.workDays.includes(new Date().getDay())) {
    const availableSlots = getDailyAvailableTimeSlots(
      new Date(today),
      settings.dailyAvailableHours,
      fixedCommitments,
      settings.workDays,
      settings.studyWindowStartHour || 6,
      settings.studyWindowEndHour || 23
    );
    
    if (availableSlots.length > 0) {
      const newSession = {...session};
      newSession.originalTime = session.startTime;
      newSession.originalDate = originalPlanDate;
      newSession.status = 'scheduled';
      
      // Set new time based on first available slot
      const slot = availableSlots[0];
      const startHour = slot.start.getHours();
      const startMinute = slot.start.getMinutes();
      newSession.startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      
      const endTime = new Date(slot.start.getTime() + session.allocatedHours * 60 * 60 * 1000);
      const endHour = endTime.getHours();
      const endMinute = endTime.getMinutes();
      newSession.endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      
      todayPlan.plannedTasks.push(newSession);
      
      return { 
        updatedPlans, 
        success: true, 
        newTime: newSession.startTime, 
        newDate: today 
      };
    }
  }
  
  return { 
    updatedPlans, 
    success: false, 
    newTime: null, 
    newDate: null 
  };
};

export const applyUserReschedules = (
  studyPlans: StudyPlan[],
  userReschedules: UserReschedule[]
) => {
  const updatedPlans = [...studyPlans];
  const validReschedules: UserReschedule[] = [];
  const obsoleteReschedules: UserReschedule[] = [];
  
  for (const reschedule of userReschedules) {
    // Check if the original session still exists
    const originalPlan = updatedPlans.find(p => p.date === reschedule.originalPlanDate);
    const originalSession = originalPlan?.plannedTasks.find(s => 
      s.taskId === reschedule.taskId && s.sessionNumber === reschedule.sessionNumber
    );
    
    if (!originalSession) {
      obsoleteReschedules.push(reschedule);
      continue;
    }
    
    // Apply the reschedule
    const targetPlan = updatedPlans.find(p => p.date === reschedule.newPlanDate);
    if (targetPlan) {
      const newSession = {...originalSession};
      newSession.startTime = reschedule.newStartTime;
      newSession.endTime = reschedule.newEndTime;
      newSession.originalTime = reschedule.originalStartTime;
      newSession.originalDate = reschedule.originalPlanDate;
      newSession.status = 'rescheduled';
      
      targetPlan.plannedTasks.push(newSession);
      validReschedules.push(reschedule);
    }
  }
  
  return { 
    updatedPlans, 
    validReschedules, 
    obsoleteReschedules 
  };
};

export const createUserReschedule = (
  session: StudySession,
  originalDate: string,
  newDate: string,
  newStartTime: string,
  newEndTime: string
): UserReschedule => {
  // Implementation for creating user reschedules
  return {
    id: Date.now().toString(),
    originalSessionId: `${session.taskId}-${session.sessionNumber}`,
    originalPlanDate: originalDate,
    originalStartTime: session.startTime,
    originalEndTime: session.endTime,
    newPlanDate: newDate,
    newStartTime,
    newEndTime,
    rescheduledAt: new Date().toISOString(),
    status: 'active' as const,
    taskId: session.taskId,
    sessionNumber: session.sessionNumber || 0
  };
};

export const validateUserReschedules = (userReschedules: UserReschedule[]) => {
  const validReschedules: UserReschedule[] = [];
  const obsoleteReschedules: UserReschedule[] = [];
  
  for (const reschedule of userReschedules) {
    // Basic validation
    if (reschedule.originalPlanDate && reschedule.newPlanDate && 
        reschedule.newStartTime && reschedule.newEndTime) {
      validReschedules.push(reschedule);
    } else {
      obsoleteReschedules.push(reschedule);
    }
  }
  
  return { validReschedules, obsoleteReschedules };
};

// New function to aggressively redistribute tasks after deletion
export const redistributeAfterTaskDeletion = (
  tasks: Task[],
  settings: UserSettings,
  fixedCommitments: FixedCommitment[],
  existingStudyPlans: StudyPlan[]
): StudyPlan[] => {
  if (settings.studyPlanMode !== 'even') {
    // For smart mode, just regenerate from scratch, preserving manual schedules
    const { plans } = generateNewStudyPlanWithPreservation(tasks, settings, fixedCommitments, existingStudyPlans);
    return plans;
  }

  // For even mode, do aggressive redistribution
  const tasksEven = tasks
    .filter(task => task.status === 'pending' && task.estimatedHours > 0)
    .sort((a, b) => {
      if (a.importance !== b.importance) return a.importance ? -1 : 1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  // Get available days (same logic as generateNewStudyPlan)
  const now = new Date();
  const latestDeadline = new Date(Math.max(...tasksEven.map(t => new Date(t.deadline).getTime())));
  const availableDays: string[] = [];
  const tempDate = new Date(now);
  while (tempDate <= latestDeadline) {
    const dateStr = tempDate.toISOString().split('T')[0];
    const dayOfWeek = tempDate.getDay();
    if (settings.workDays.includes(dayOfWeek)) {
      availableDays.push(dateStr);
    }
    tempDate.setDate(tempDate.getDate() + 1);
  }

  // Include deadline days
  if (settings.bufferDays === 0) {
    tasksEven.forEach(task => {
      const deadlineDateStr = new Date(task.deadline).toISOString().split('T')[0];
      if (!availableDays.includes(deadlineDateStr) && settings.workDays.includes(new Date(deadlineDateStr).getDay())) {
        availableDays.push(deadlineDateStr);
      }
    });
  } else {
    tasksEven.forEach(task => {
      const deadline = new Date(task.deadline);
      deadline.setDate(deadline.getDate() - settings.bufferDays);
      const deadlineDateStr = deadline.toISOString().split('T')[0];
      if (!availableDays.includes(deadlineDateStr) && settings.workDays.includes(new Date(deadlineDateStr).getDay())) {
        availableDays.push(deadlineDateStr);
      }
    });
  }
  availableDays.sort();

  // Create fresh study plans with full daily capacity
  const studyPlans: StudyPlan[] = [];
  const dailyRemainingHours: { [date: string]: number } = {};
  availableDays.forEach(date => {
    dailyRemainingHours[date] = settings.dailyAvailableHours;
    studyPlans.push({
      id: `plan-${date}`,
      date,
      plannedTasks: [],
      totalStudyHours: 0,
      availableHours: settings.dailyAvailableHours
    });
  });

  // Account for existing sessions (excluding missed, redistributed, and completed sessions from daily limit)
  existingStudyPlans.forEach(plan => {
    if (availableDays.includes(plan.date)) {
      plan.plannedTasks.forEach(session => {
        if (session.status !== 'skipped' && !session.done && session.status !== 'completed') {
          // Only count non-completed sessions toward daily capacity
          if (!isMissedOrRedistributedSession(session, plan.date)) {
            dailyRemainingHours[plan.date] -= session.allocatedHours;
          }
        }
      });
    }
  });

  // Helper function to redistribute unscheduled hours (same as in generateNewStudyPlan)
  const redistributeUnscheduledHours = (task: Task, unscheduledHours: number, daysForTask: string[]) => {
    let remainingUnscheduledHours = unscheduledHours;
    let redistributionRound = 0;
    const maxRedistributionRounds = 10;
    const minSessionLength = (settings.minSessionLength || 15) / 60;
    const maxSessionLength = Math.min(4, settings.dailyAvailableHours);
    
    while (remainingUnscheduledHours > 0 && redistributionRound < maxRedistributionRounds) {
      redistributionRound++;
      
      const availableDaysForRedistribution = daysForTask.filter(date => {
        return dailyRemainingHours[date] > 0;
      });
      
      if (availableDaysForRedistribution.length === 0) {
        break;
      }
      
      let distributedThisRound = 0;
      const optimalSessions = optimizeSessionDistribution(task, remainingUnscheduledHours, availableDaysForRedistribution, settings);
      
      for (let i = 0; i < optimalSessions.length && i < availableDaysForRedistribution.length; i++) {
        const date = availableDaysForRedistribution[i];
        const dayPlan = studyPlans.find(p => p.date === date)!;
        const availableHours = dailyRemainingHours[date];
        const sessionLength = Math.min(optimalSessions[i], availableHours);
        
        if (sessionLength >= minSessionLength) {
          const roundedSessionLength = Math.round(sessionLength * 60) / 60;
          dayPlan.plannedTasks.push({
            taskId: task.id,
            scheduledTime: `${date}`,
            startTime: '',
            endTime: '',
            allocatedHours: roundedSessionLength,
            sessionNumber: (dayPlan.plannedTasks.filter(s => s.taskId === task.id).length) + 1,
            isFlexible: true,
            status: 'scheduled'
          });
          dayPlan.totalStudyHours = Math.round((dayPlan.totalStudyHours + roundedSessionLength) * 60) / 60;
          dailyRemainingHours[date] = Math.round((dailyRemainingHours[date] - roundedSessionLength) * 60) / 60;
          distributedThisRound = Math.round((distributedThisRound + roundedSessionLength) * 60) / 60;
        }
      }
      
      remainingUnscheduledHours -= distributedThisRound;
      
      if (distributedThisRound === 0) {
        break;
      }
    }
    
    return remainingUnscheduledHours;
  };

  // Helper function to combine sessions of the same task on the same day
  const combineSessionsOnSameDay = (studyPlans: StudyPlan[]) => {
    for (const plan of studyPlans) {
      // Group sessions by taskId, excluding skipped sessions from combination
      const sessionsByTask: { [taskId: string]: StudySession[] } = {};
      
      plan.plannedTasks.forEach(session => {
        // Skip sessions that are marked as skipped - they shouldn't be combined with other sessions
        if (session.status === 'skipped') {
          return;
        }
        
        if (!sessionsByTask[session.taskId]) {
          sessionsByTask[session.taskId] = [];
        }
        sessionsByTask[session.taskId].push(session);
      });
      
      const combinedSessions: StudySession[] = [];
      
      // Combine sessions for each task
      Object.entries(sessionsByTask).forEach(([taskId, sessions]) => {
        if (sessions.length > 1) {
          // Sort sessions by start time
          sessions.sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
          
          // Combine all sessions into one
          const firstSession = sessions[0];
          const lastSession = sessions[sessions.length - 1];
          const totalHours = sessions.reduce((sum, session) => sum + session.allocatedHours, 0);
          
          const combinedSession: StudySession = {
            ...firstSession,
            startTime: firstSession.startTime,
            endTime: lastSession.endTime,
            allocatedHours: totalHours,
            sessionNumber: 1 // Combined session gets number 1
          };
          
          combinedSessions.push(combinedSession);
        } else {
          // Single session, keep as is
          combinedSessions.push(sessions[0]);
        }
      });
      
      // Update the plan with combined sessions (keeping skipped sessions separate)
      const skippedSessions = plan.plannedTasks.filter(session => session.status === 'skipped');
      plan.plannedTasks = [...combinedSessions, ...skippedSessions];
      
      // Calculate totalStudyHours including skipped sessions as "done"
      plan.totalStudyHours = calculateTotalStudyHours(plan.plannedTasks);
    }
  };



  // AGGRESSIVE REDISTRIBUTION: Distribute all tasks optimally
  for (const task of tasksEven) {
    const deadline = new Date(task.deadline);
    if (settings.bufferDays > 0) {
      deadline.setDate(deadline.getDate() - settings.bufferDays);
    }
    const deadlineDateStr = deadline.toISOString().split('T')[0];
    const startDateStrD = (task as any).startDate || now.toISOString().split('T')[0];
    const daysForTask = availableDays.filter(d => d >= startDateStrD && d <= deadlineDateStr);
    
    if (daysForTask.length === 0) {
      continue;
    }
    
    let totalHours = task.estimatedHours;
    const sessionLengths = optimizeSessionDistribution(task, totalHours, daysForTask, settings);
    
    let unscheduledHours = 0;
    for (let i = 0; i < sessionLengths.length && i < daysForTask.length; i++) {
      const date = daysForTask[i];
      let dayPlan = studyPlans.find(p => p.date === date)!;
      let availableHours = dailyRemainingHours[date];
      const thisSessionLength = Math.min(sessionLengths[i], availableHours);
      
      if (thisSessionLength > 0) {
        const roundedSessionLength = Math.round(thisSessionLength * 60) / 60;
        dayPlan.plannedTasks.push({
          taskId: task.id,
          scheduledTime: `${date}`,
          startTime: '',
          endTime: '',
          allocatedHours: roundedSessionLength,
          sessionNumber: (dayPlan.plannedTasks.filter(s => s.taskId === task.id).length) + 1,
          isFlexible: true,
          status: 'scheduled'
        });
        dayPlan.totalStudyHours = Math.round((dayPlan.totalStudyHours + roundedSessionLength) * 60) / 60;
        dailyRemainingHours[date] = Math.round((dailyRemainingHours[date] - roundedSessionLength) * 60) / 60;
        totalHours = Math.round((totalHours - roundedSessionLength) * 60) / 60;
      } else {
        unscheduledHours += sessionLengths[i];
      }
    }
    
    // Redistribute any unscheduled hours
    if (unscheduledHours > 0) {
      redistributeUnscheduledHours(task, unscheduledHours, daysForTask);
    }
  }
  
  // Combine sessions
  combineSessionsOnSameDay(studyPlans);
  
  // MULTIPLE GLOBAL REDISTRIBUTION PASSES for maximum filling
  let redistributionPasses = 0;
  const maxRedistributionPasses = 3;
  
  while (redistributionPasses < maxRedistributionPasses) {
    redistributionPasses++;
    
    // Calculate current scheduled hours (excluding skipped sessions)
    let taskScheduledHours: { [taskId: string]: number } = {};
    for (const plan of studyPlans) {
      for (const session of plan.plannedTasks) {
        // Skip sessions that are marked as skipped or completed - they shouldn't count towards scheduled hours
        if (session.status !== 'skipped' && !session.done && session.status !== 'completed') {
          taskScheduledHours[session.taskId] = (taskScheduledHours[session.taskId] || 0) + session.allocatedHours;
        }
      }
    }

    // Find tasks with unscheduled hours
    const tasksWithUnscheduledHours = tasksEven.filter(task => {
      const scheduledHours = taskScheduledHours[task.id] || 0;
      return task.estimatedHours - scheduledHours > 0.016; // More than 1 minute
    });
    
    if (tasksWithUnscheduledHours.length === 0) {
      break; // No more unscheduled hours to redistribute
    }
    
    // Sort by importance and deadline
    const sortedTasksForRedistribution = tasksWithUnscheduledHours.sort((a, b) => {
      if (a.importance !== b.importance) return a.importance ? -1 : 1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
    
    let redistributedThisPass = false;
    
    for (const task of sortedTasksForRedistribution) {
      const scheduledHours = taskScheduledHours[task.id] || 0;
      const unscheduledHours = task.estimatedHours - scheduledHours;
      
      if (unscheduledHours <= 0) continue;
      
      const deadline = new Date(task.deadline);
      if (settings.bufferDays > 0) {
        deadline.setDate(deadline.getDate() - settings.bufferDays);
      }
      const deadlineDateStr = deadline.toISOString().split('T')[0];
      const startDateStrD = (task as any).startDate || now.toISOString().split('T')[0];
      const daysForTask = availableDays.filter(d => d >= startDateStrD && d <= deadlineDateStr);
      
      const finalUnscheduledHours = redistributeUnscheduledHours(task, unscheduledHours, daysForTask);
      
      if (finalUnscheduledHours < unscheduledHours) {
        redistributedThisPass = true;
      }
    }
    
    // If nothing was redistributed this pass, stop
    if (!redistributedThisPass) {
      break;
    }
    
    // Recombine sessions after each pass
    combineSessionsOnSameDay(studyPlans);
  }
  
  // Assign time slots
  for (const plan of studyPlans) {
    plan.plannedTasks.sort((a, b) => {
      const taskA = tasksEven.find(t => t.id === a.taskId);
      const taskB = tasksEven.find(t => t.id === b.taskId);
      if (!taskA || !taskB) return 0;
      if (taskA.importance !== taskB.importance) return taskA.importance ? -1 : 1;
      return new Date(taskA.deadline).getTime() - new Date(taskB.deadline).getTime();
    });
    
            const commitmentsForDay = fixedCommitments.filter(commitment => {
          // Check if this commitment applies to this specific date
          if (commitment.recurring) {
            // For recurring commitments, check if the day of week matches
            return commitment.daysOfWeek.includes(new Date(plan.date).getDay());
          } else {
            // For non-recurring commitments, check if the specific date matches
            return commitment.specificDates?.includes(plan.date) || false;
          }
        });
    let assignedSessions: StudySession[] = [];
    
    for (const session of plan.plannedTasks) {
      const slot = findNextAvailableTimeSlot(
        session.allocatedHours,
        assignedSessions,
        commitmentsForDay,
        settings.studyWindowStartHour || 6,
        settings.studyWindowEndHour || 23,
        settings.bufferTimeBetweenSessions || 0, // pass buffer
        plan.date // pass target date for filtering deleted occurrences
      );
      if (slot) {
        session.startTime = slot.start;
        session.endTime = slot.end;
        assignedSessions.push(session);
      } else {
        session.startTime = '';
        session.endTime = '';
      }
    }
  }
  
  return studyPlans;
};

// Function to check for time conflicts between commitments
export const checkCommitmentConflicts = (
  newCommitment: {
    startTime?: string;
    endTime?: string;
    recurring: boolean;
    daysOfWeek: number[];
    specificDates?: string[];
    isAllDay?: boolean;
    dateRange?: {
      startDate: string;
      endDate: string;
    };
    type?: string; // Added type to check for all-day events
  },
  existingCommitments: FixedCommitment[],
  excludeCommitmentId?: string // For editing, exclude the commitment being edited
): { 
  hasConflict: boolean; 
  conflictingCommitment?: FixedCommitment;
  conflictType?: 'strict' | 'override';
  conflictingDates?: string[];
} => {
  // Convert time strings to minutes for easier comparison
  const timeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0; // For all-day events
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  // For all-day events, use full day time range (00:00 to 23:59)
  const newStartMinutes = newCommitment.isAllDay ? 0 : timeToMinutes(newCommitment.startTime);
  const newEndMinutes = newCommitment.isAllDay ? 24 * 60 - 1 : timeToMinutes(newCommitment.endTime);

  // Check each existing commitment for conflicts
  for (const existing of existingCommitments) {
    // Skip the commitment being edited
    if (excludeCommitmentId && existing.id === excludeCommitmentId) {
      continue;
    }

    let hasConflict = false;
    let conflictType: 'strict' | 'override' = 'strict';
    let conflictingDates: string[] = [];

    // Allow all-day recurring commitments to coexist with other commitments
    // This is the key change to allow all-day events even when there are existing commitments
    if (newCommitment.recurring && newCommitment.isAllDay) {
      // All-day recurring commitments are allowed to overlap with existing commitments
      // We'll skip conflict detection for these
      continue;
    }

    if (newCommitment.recurring && existing.recurring) {
      // Both are recurring - STRICT conflict (same type)
      const hasOverlappingDays = newCommitment.daysOfWeek.some(day => 
        existing.daysOfWeek.includes(day)
      );

      // IMPROVED: Check actual date range overlap with proper logic
      let dateRangeOverlap = false;
      
      if (newCommitment.dateRange?.startDate && newCommitment.dateRange?.endDate && 
          existing.dateRange?.startDate && existing.dateRange?.endDate) {
        // Both have date ranges - check if they actually overlap
        dateRangeOverlap = !(
          newCommitment.dateRange.endDate < existing.dateRange.startDate || 
          newCommitment.dateRange.startDate > existing.dateRange.endDate
        );
      } else if (newCommitment.dateRange?.startDate && newCommitment.dateRange?.endDate) {
        // New commitment has date range, existing doesn't (existing is indefinite)
        // They overlap because existing applies to all dates
        dateRangeOverlap = true;
      } else if (existing.dateRange?.startDate && existing.dateRange?.endDate) {
        // Existing commitment has date range, new doesn't (new is indefinite)
        // They overlap because new applies to all dates
        dateRangeOverlap = true;
      } else {
        // Neither has date range (both are indefinite) - they overlap
        dateRangeOverlap = true;
      }

      // Skip conflict detection if the existing commitment is an all-day event
      if (existing.isAllDay) {
        continue;
      }

      if (hasOverlappingDays && dateRangeOverlap) {
        const existingStartMinutes = existing.isAllDay ? 0 : timeToMinutes(existing.startTime);
        const existingEndMinutes = existing.isAllDay ? 24 * 60 - 1 : timeToMinutes(existing.endTime);

        // If there's a time overlap (we already handled all-day events above)
        const hasTimeOverlap = 
          !(
            newEndMinutes <= existingStartMinutes || 
            newStartMinutes >= existingEndMinutes
          );

        if (hasTimeOverlap) {
          hasConflict = true;
          conflictType = 'strict';
        }
      }
    } else if (!newCommitment.recurring && !existing.recurring) {
      // Both are non-recurring - STRICT conflict (same type)
      const hasOverlappingDates = newCommitment.specificDates?.some(date => 
        existing.specificDates?.includes(date)
      );

      // Skip conflict detection if either commitment is an all-day event
      if (newCommitment.isAllDay || existing.isAllDay) {
        continue;
      }

      if (hasOverlappingDates) {
        const existingStartMinutes = timeToMinutes(existing.startTime);
        const existingEndMinutes = timeToMinutes(existing.endTime);

        // Check for time overlap (we already handled all-day events above)
        const hasTimeOverlap = !(
          newEndMinutes <= existingStartMinutes || 
          newStartMinutes >= existingEndMinutes
        );

        if (hasTimeOverlap) {
          hasConflict = true;
          conflictType = 'strict';
          conflictingDates = newCommitment.specificDates?.filter(date => 
            existing.specificDates?.includes(date)
          ) || [];
        }
      }
    } else {
      // One is recurring, one is non-recurring
      if (newCommitment.recurring && !existing.recurring) {
        // Skip conflict detection if new commitment is an all-day event
        if (newCommitment.isAllDay) {
          continue;
        }
        
        // Skip conflict detection if existing commitment is an all-day event
        if (existing.isAllDay) {
          continue;
        }
        
        // New is recurring, existing is non-recurring - OVERRIDE (one-time takes priority)
        // IMPROVED: Use doesCommitmentApplyToDate logic for better date range handling
        const overlappingDates = existing.specificDates?.filter(date => {
          const dayOfWeek = new Date(date).getDay();
          const isInDayOfWeek = newCommitment.daysOfWeek.includes(dayOfWeek);
          
          // CRITICAL: Only check date range if the day of week matches first
          if (!isInDayOfWeek) return false;
          
          // Check if date is within the new commitment's date range if specified
          let isInDateRange = true;
          if (newCommitment.dateRange?.startDate && newCommitment.dateRange?.endDate) {
            // Add one day to endDate to include the full last day
            const endDateObj = new Date(newCommitment.dateRange.endDate);
            endDateObj.setDate(endDateObj.getDate() + 1);
            const inclusiveEndDate = endDateObj.toISOString().split('T')[0];
            isInDateRange = (
              date >= newCommitment.dateRange.startDate && 
              date < inclusiveEndDate
            );
          }
          
          return isInDateRange; // Both day of week and date range must match
        }) || [];

        if (overlappingDates.length > 0) {
          const existingStartMinutes = timeToMinutes(existing.startTime);
          const existingEndMinutes = timeToMinutes(existing.endTime);

          // Check for time overlap (we already handled all-day events above)
          const hasTimeOverlap = !(
            newEndMinutes <= existingStartMinutes || 
            newStartMinutes >= existingEndMinutes
          );

          if (hasTimeOverlap) {
            hasConflict = true;
            conflictType = 'override';
            conflictingDates = overlappingDates;
          }
        }
      } else {
        // Skip conflict detection if new commitment is an all-day event
        if (newCommitment.isAllDay) {
          continue;
        }
        
        // Skip conflict detection if existing commitment is an all-day event
        if (existing.isAllDay) {
          continue;
        }
        
        // New is non-recurring, existing is recurring - OVERRIDE (one-time takes priority)
        // IMPROVED: Use doesCommitmentApplyToDate logic for better date range handling
        const overlappingDates = newCommitment.specificDates?.filter(date => {
          const dayOfWeek = new Date(date).getDay();
          const isInDayOfWeek = existing.daysOfWeek.includes(dayOfWeek);
          
          // CRITICAL: Only check date range if the day of week matches first
          if (!isInDayOfWeek) return false;
          
          // Check if date is within the existing commitment's date range if specified  
          let isInDateRange = true;
          if (existing.dateRange?.startDate && existing.dateRange?.endDate) {
            // Add one day to endDate to include the full last day
            const endDateObj = new Date(existing.dateRange.endDate);
            endDateObj.setDate(endDateObj.getDate() + 1);
            const inclusiveEndDate = endDateObj.toISOString().split('T')[0];
            isInDateRange = (
              date >= existing.dateRange.startDate && 
              date < inclusiveEndDate
            );
          }
          
          return isInDateRange; // Both day of week and date range must match
        }) || [];

        if (overlappingDates.length > 0) {
          const existingStartMinutes = timeToMinutes(existing.startTime);
          const existingEndMinutes = timeToMinutes(existing.endTime);

          // Check for time overlap (we already handled all-day events above)
          const hasTimeOverlap = !(
            newEndMinutes <= existingStartMinutes || 
            newStartMinutes >= existingEndMinutes
          );

          if (hasTimeOverlap) {
            hasConflict = true;
            conflictType = 'override';
            conflictingDates = overlappingDates;
          }
        }
      }
    }

    if (hasConflict) {
      return {
        hasConflict: true,
        conflictingCommitment: existing,
        conflictType,
        conflictingDates
      };
    }
  }

  return { hasConflict: false };
};

// Enhanced session combination function with conflict validation
const combineSessionsOnSameDayWithValidation = (studyPlans: StudyPlan[], settings: UserSettings) => {
  for (const plan of studyPlans) {
    // Group sessions by taskId, excluding skipped sessions from combination
    const sessionsByTask: { [taskId: string]: StudySession[] } = {};
    
    plan.plannedTasks.forEach(session => {
      // Skip sessions that are marked as skipped - they shouldn't be combined with other sessions
      if (session.status === 'skipped') {
        return;
      }
      
      if (!sessionsByTask[session.taskId]) {
        sessionsByTask[session.taskId] = [];
      }
      sessionsByTask[session.taskId].push(session);
    });
    
    const combinedSessions: StudySession[] = [];
    
    // Combine sessions for each task with validation
    Object.entries(sessionsByTask).forEach(([taskId, sessions]) => {
      if (sessions.length > 1) {
        // Sort sessions by start time
        sessions.sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
        
        // Calculate total hours
        const totalHours = sessions.reduce((sum, session) => sum + session.allocatedHours, 0);
        
        // Validate session length constraints
        const minSessionLength = (settings.minSessionLength || 15) / 60; // in hours
        const maxSessionLength = Math.min(4, settings.dailyAvailableHours);
        
        if (totalHours >= minSessionLength && totalHours <= maxSessionLength) {
          // Combine all sessions into one
          const firstSession = sessions[0];
          const lastSession = sessions[sessions.length - 1];
          
          const combinedSession: StudySession = {
            ...firstSession,
            startTime: firstSession.startTime,
            endTime: lastSession.endTime,
            allocatedHours: totalHours,
            sessionNumber: 1 // Combined session gets number 1
          };
          
          combinedSessions.push(combinedSession);
        } else {
          // If combination would violate constraints, keep sessions separate
          combinedSessions.push(...sessions);
        }
      } else {
        // Single session, keep as is
        combinedSessions.push(...sessions);
      }
    });
    
    // Update plan with combined sessions
    plan.plannedTasks = combinedSessions;
    plan.totalStudyHours = combinedSessions.reduce((sum, session) => sum + session.allocatedHours, 0);
  }
};

/**
 * Preserves manual schedules from existing study plans when generating new ones
 * This ensures that manually rescheduled sessions maintain their exact positions
 * and are treated as fixed constraints by the scheduling algorithm
 */
export const preserveManualSchedules = (
  newPlans: StudyPlan[],
  existingPlans: StudyPlan[]
): StudyPlan[] => {
  // Create a map of manually rescheduled sessions by their unique identifier
  const manualSchedules = new Map<string, StudySession>();
  
  existingPlans.forEach(plan => {
    plan.plannedTasks.forEach(session => {
      if (session.originalTime && session.originalDate && session.isManualOverride) {
        const key = `${session.taskId}-${session.sessionNumber}`;
        manualSchedules.set(key, { ...session });
      }
    });
  });

  // Apply manual schedule preservation to new plans
  newPlans.forEach(plan => {
    const prevPlan = existingPlans.find(p => p.date === plan.date);
    if (!prevPlan) return;

    plan.plannedTasks.forEach(session => {
      const prevSession = prevPlan.plannedTasks.find(s => 
        s.taskId === session.taskId && s.sessionNumber === session.sessionNumber
      );
      
      if (prevSession) {
        // Preserve done sessions
        if (prevSession.done) {
          session.done = true;
          session.status = prevSession.status;
          session.actualHours = prevSession.actualHours;
          session.completedAt = prevSession.completedAt;
        }
        // Preserve skipped sessions
        else if (prevSession.status === 'skipped') {
          session.status = 'skipped';
        }
        // Preserve manual reschedules with their exact positions
        else if (prevSession.originalTime && prevSession.originalDate && prevSession.isManualOverride) {
          // Preserve all the original reschedule metadata
          session.originalTime = prevSession.originalTime;
          session.originalDate = prevSession.originalDate;
          session.rescheduledAt = prevSession.rescheduledAt;
          session.isManualOverride = prevSession.isManualOverride;
          
          // Preserve the actual rescheduled times and positions
          session.startTime = prevSession.startTime;
          session.endTime = prevSession.endTime;
          
          // If the session was moved to a different date, ensure it stays there
          if (prevSession.originalDate !== plan.date) {
            const targetPlan = newPlans.find(p => p.date === prevSession.originalDate);
            if (targetPlan) {
              // Move session to the correct plan
              targetPlan.plannedTasks.push(session);
              plan.plannedTasks = plan.plannedTasks.filter(s => s !== session);
            }
          }
        }
        // Preserve other rescheduled sessions (but allow regeneration of times)
        else if (prevSession.originalTime && prevSession.originalDate) {
          session.originalTime = prevSession.originalTime;
          session.originalDate = prevSession.originalDate;
          session.rescheduledAt = prevSession.rescheduledAt;
          session.isManualOverride = prevSession.isManualOverride;
        }
      }
    });
  });

  return newPlans;
};

/**
 * Enhanced study plan generation that respects existing manual schedules
 * This function ensures that manually rescheduled sessions are treated as
 * fixed constraints when generating new schedules
 */
export const generateNewStudyPlanWithPreservation = (
  tasks: Task[],
  settings: UserSettings,
  fixedCommitments: FixedCommitment[],
  existingStudyPlans: StudyPlan[] = []
): { plans: StudyPlan[]; suggestions: Array<{ taskTitle: string; unscheduledMinutes: number }> } => {
  // First, generate the new study plan
  const result = generateNewStudyPlan(tasks, settings, fixedCommitments, existingStudyPlans);
  
  // Then apply manual schedule preservation
  const preservedPlans = preserveManualSchedules(result.plans, existingStudyPlans);
  
  return {
    plans: preservedPlans,
    suggestions: result.suggestions
  };
};
