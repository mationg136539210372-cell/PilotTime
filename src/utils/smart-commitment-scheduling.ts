import { SmartCommitment, GeneratedSession, TimeRange, UserSettings, FixedCommitment, StudyPlan, StudySession } from '../types';

export interface AvailableTimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // in hours
  dayOfWeek: number;
  score: number; // preference score (higher is better)
}

/**
 * Generate smart commitment schedule based on preferences
 */
export const generateSmartCommitmentSchedule = (
  commitment: Omit<SmartCommitment, 'suggestedSessions' | 'isConfirmed'>,
  settings: UserSettings,
  existingCommitments: (FixedCommitment | SmartCommitment)[],
  existingPlans: StudyPlan[]
): GeneratedSession[] => {
  const sessions: GeneratedSession[] = [];
  const startDate = commitment.dateRange?.startDate ? new Date(commitment.dateRange.startDate) : new Date();
  const endDate = commitment.dateRange?.endDate ? new Date(commitment.dateRange.endDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days default
  
  // Calculate how many weeks we need to schedule
  const weekCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  
  // Generate weekly patterns
  for (let week = 0; week < weekCount; week++) {
    const weekStart = new Date(startDate.getTime() + week * 7 * 24 * 60 * 60 * 1000);
    const weekSessions = generateWeeklySchedule(commitment, weekStart, settings, existingCommitments, existingPlans);
    sessions.push(...weekSessions);
  }
  
  return sessions;
};

/**
 * Generate schedule for a single week
 */
const generateWeeklySchedule = (
  commitment: Omit<SmartCommitment, 'suggestedSessions' | 'isConfirmed'>,
  weekStart: Date,
  settings: UserSettings,
  existingCommitments: (FixedCommitment | SmartCommitment)[],
  existingPlans: StudyPlan[]
): GeneratedSession[] => {
  const sessions: GeneratedSession[] = [];
  let remainingHours = commitment.totalHoursPerWeek;
  
  // Get available time slots for the week
  const availableSlots = findAvailableTimeSlots(weekStart, commitment, settings, existingCommitments, existingPlans);
  
  // Sort slots by preference score (highest first)
  availableSlots.sort((a, b) => b.score - a.score);
  
  // Allocate sessions to slots
  for (const slot of availableSlots) {
    if (remainingHours <= 0) break;
    
    // Determine session duration based on preferences and remaining hours
    const sessionDuration = calculateOptimalSessionDuration(
      remainingHours,
      commitment.sessionDurationRange,
      slot.duration
    );
    
    if (sessionDuration > 0) {
      sessions.push({
        date: slot.date,
        startTime: slot.startTime,
        endTime: addMinutesToTime(slot.startTime, sessionDuration * 60),
        duration: sessionDuration,
        dayOfWeek: slot.dayOfWeek
      });
      
      remainingHours -= sessionDuration;
    }
  }
  
  return sessions;
};

/**
 * Find available time slots for a week
 */
const findAvailableTimeSlots = (
  weekStart: Date,
  commitment: Omit<SmartCommitment, 'suggestedSessions' | 'isConfirmed'>,
  settings: UserSettings,
  existingCommitments: (FixedCommitment | SmartCommitment)[],
  existingPlans: StudyPlan[]
): AvailableTimeSlot[] => {
  const slots: AvailableTimeSlot[] = [];
  
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDate = new Date(weekStart.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const dayOfWeek = currentDate.getDay();
    const dateString = currentDate.toISOString().split('T')[0];
    
    // Skip if not a preferred day or work day
    if (!commitment.preferredDays.includes(dayOfWeek) || !settings.workDays.includes(dayOfWeek)) {
      continue;
    }
    
    // Get study window for this date
    const studyWindow = getStudyWindowForDate(dateString, settings);
    
    // For each preferred time range, find available slots
    for (const timeRange of commitment.preferredTimeRanges) {
      const availableSlots = findSlotsInTimeRange(
        dateString,
        timeRange,
        studyWindow,
        commitment,
        existingCommitments,
        existingPlans
      );
      
      // Score slots based on preferences
      const scoredSlots = availableSlots.map(slot => ({
        ...slot,
        dayOfWeek,
        score: calculateSlotScore(slot, commitment, settings)
      }));
      
      slots.push(...scoredSlots);
    }
  }
  
  return slots;
};

/**
 * Find available slots within a specific time range for a day
 */
const findSlotsInTimeRange = (
  date: string,
  timeRange: TimeRange,
  studyWindow: { start: number; end: number },
  commitment: Omit<SmartCommitment, 'suggestedSessions' | 'isConfirmed'>,
  existingCommitments: (FixedCommitment | SmartCommitment)[],
  existingPlans: StudyPlan[]
): AvailableTimeSlot[] => {
  const slots: AvailableTimeSlot[] = [];
  
  // Convert time range to minutes
  const rangeStart = timeToMinutes(timeRange.start);
  const rangeEnd = timeToMinutes(timeRange.end);
  
  // Apply study window constraints
  const windowStart = studyWindow.start * 60;
  const windowEnd = studyWindow.end * 60;
  
  const effectiveStart = Math.max(rangeStart, windowStart);
  const effectiveEnd = Math.min(rangeEnd, windowEnd);
  
  if (effectiveStart >= effectiveEnd) return slots;
  
  // Get existing conflicts for this date
  const conflicts = getConflictsForDate(date, existingCommitments, existingPlans);
  
  // Find free slots between conflicts
  const minSessionMinutes = commitment.sessionDurationRange.min;
  const maxSessionMinutes = commitment.sessionDurationRange.max;
  
  let currentStart = effectiveStart;
  
  // Sort conflicts by start time
  conflicts.sort((a, b) => a.start - b.start);
  
  for (const conflict of conflicts) {
    // Check if there's a gap before this conflict
    if (currentStart + minSessionMinutes <= conflict.start) {
      const slotEnd = Math.min(conflict.start, currentStart + maxSessionMinutes);
      if (slotEnd > currentStart) {
        slots.push({
          date,
          startTime: minutesToTime(currentStart),
          endTime: minutesToTime(slotEnd),
          duration: (slotEnd - currentStart) / 60,
          dayOfWeek: new Date(date).getDay(),
          score: 0 // Will be calculated later
        });
      }
    }
    currentStart = Math.max(currentStart, conflict.end + 5); // 5 min buffer
  }
  
  // Check for slot after last conflict
  if (currentStart + minSessionMinutes <= effectiveEnd) {
    const slotEnd = Math.min(effectiveEnd, currentStart + maxSessionMinutes);
    if (slotEnd > currentStart) {
      slots.push({
        date,
        startTime: minutesToTime(currentStart),
        endTime: minutesToTime(slotEnd),
        duration: (slotEnd - currentStart) / 60,
        dayOfWeek: new Date(date).getDay(),
        score: 0
      });
    }
  }
  
  return slots;
};

/**
 * Get conflicts (existing commitments and study sessions) for a specific date
 */
const getConflictsForDate = (
  date: string,
  existingCommitments: (FixedCommitment | SmartCommitment)[],
  existingPlans: StudyPlan[]
): Array<{ start: number; end: number }> => {
  const conflicts: Array<{ start: number; end: number }> = [];
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  
  // Add commitment conflicts
  existingCommitments.forEach(commitment => {
    if (commitment.type === 'smart') {
      // Handle smart commitments
      const smartCommitment = commitment as SmartCommitment;
      smartCommitment.suggestedSessions.forEach(session => {
        if (session.date === date) {
          conflicts.push({
            start: timeToMinutes(session.startTime),
            end: timeToMinutes(session.endTime)
          });
        }
      });
    } else {
      // Handle fixed commitments
      const fixedCommitment = commitment as FixedCommitment;
      if (fixedCommitment.startTime && fixedCommitment.endTime) {
        let includeCommitment = false;
        
        if (fixedCommitment.recurring) {
          if (fixedCommitment.daysOfWeek.includes(dayOfWeek)) {
            if (fixedCommitment.dateRange) {
              const startDate = new Date(fixedCommitment.dateRange.startDate);
              const endDate = new Date(fixedCommitment.dateRange.endDate);
              if (targetDate >= startDate && targetDate <= endDate) {
                includeCommitment = true;
              }
            } else {
              includeCommitment = true;
            }
          }
        } else if (fixedCommitment.specificDates?.includes(date)) {
          includeCommitment = true;
        }
        
        if (includeCommitment) {
          conflicts.push({
            start: timeToMinutes(fixedCommitment.startTime),
            end: timeToMinutes(fixedCommitment.endTime)
          });
        }
      }
    }
  });
  
  // Add study session conflicts
  const planForDate = existingPlans.find(plan => plan.date === date);
  if (planForDate) {
    planForDate.plannedTasks.forEach(session => {
      if (session.status !== 'skipped') {
        conflicts.push({
          start: timeToMinutes(session.startTime),
          end: timeToMinutes(session.endTime)
        });
      }
    });
  }
  
  return conflicts;
};

/**
 * Calculate preference score for a time slot
 */
const calculateSlotScore = (
  slot: AvailableTimeSlot,
  commitment: Omit<SmartCommitment, 'suggestedSessions' | 'isConfirmed'>,
  settings: UserSettings
): number => {
  let score = 0;
  
  // Day preference score (higher if preferred day)
  if (commitment.preferredDays.includes(slot.dayOfWeek)) {
    score += 100;
  }
  
  // Time preference score (higher if within preferred time ranges)
  const slotStart = timeToMinutes(slot.startTime);
  const slotEnd = timeToMinutes(slot.endTime);
  
  for (const timeRange of commitment.preferredTimeRanges) {
    const rangeStart = timeToMinutes(timeRange.start);
    const rangeEnd = timeToMinutes(timeRange.end);
    
    // Calculate overlap percentage
    const overlapStart = Math.max(slotStart, rangeStart);
    const overlapEnd = Math.min(slotEnd, rangeEnd);
    const overlap = Math.max(0, overlapEnd - overlapStart);
    const slotDuration = slotEnd - slotStart;
    
    if (slotDuration > 0) {
      const overlapPercentage = overlap / slotDuration;
      score += overlapPercentage * 50; // Max 50 points for perfect overlap
    }
  }
  
  // Duration preference score (prefer sessions close to optimal duration)
  const minDuration = commitment.sessionDurationRange.min / 60;
  const maxDuration = commitment.sessionDurationRange.max / 60;
  const optimalDuration = (minDuration + maxDuration) / 2;
  const durationDiff = Math.abs(slot.duration - optimalDuration);
  const maxDiff = Math.max(optimalDuration - minDuration, maxDuration - optimalDuration);
  
  if (maxDiff > 0) {
    score += (1 - durationDiff / maxDiff) * 25; // Max 25 points for optimal duration
  }
  
  // Consistency bonus (prefer regular times)
  const timeConsistencyBonus = 10; // Could be enhanced with historical data
  score += timeConsistencyBonus;
  
  return score;
};

/**
 * Calculate optimal session duration for a slot
 */
const calculateOptimalSessionDuration = (
  remainingHours: number,
  durationRange: { min: number; max: number },
  slotDuration: number
): number => {
  const minHours = durationRange.min / 60;
  const maxHours = durationRange.max / 60;
  
  // Don't exceed remaining hours or slot duration
  const maxPossible = Math.min(remainingHours, slotDuration, maxHours);
  
  // Must meet minimum duration
  if (maxPossible < minHours) {
    return 0; // Can't fit minimum duration
  }
  
  // Try to use full slot if it's within range
  if (slotDuration >= minHours && slotDuration <= maxHours) {
    return Math.min(slotDuration, remainingHours);
  }
  
  // Otherwise, use maximum allowed
  return maxPossible;
};

/**
 * Get study window for a specific date
 */
const getStudyWindowForDate = (date: string, settings: UserSettings): { start: number; end: number } => {
  // Check for date-specific overrides
  const dateOverride = settings.dateSpecificStudyWindows?.find(
    window => window.date === date && window.isActive
  );
  
  if (dateOverride) {
    return {
      start: dateOverride.startHour,
      end: dateOverride.endHour
    };
  }
  
  // Use default study window
  return {
    start: settings.studyWindowStartHour,
    end: settings.studyWindowEndHour
  };
};

/**
 * Utility functions for time conversion
 */
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
  const totalMinutes = timeToMinutes(timeStr) + minutesToAdd;
  return minutesToTime(totalMinutes);
};

/**
 * Optimize smart commitment schedule after manual changes
 */
export const optimizeSmartCommitmentSchedule = (
  commitment: SmartCommitment,
  settings: UserSettings,
  existingCommitments: (FixedCommitment | SmartCommitment)[],
  existingPlans: StudyPlan[]
): GeneratedSession[] => {
  // Calculate current total hours from existing sessions
  const currentHours = commitment.suggestedSessions.reduce((sum, session) => {
    // Skip manually deleted sessions
    if (commitment.manualOverrides?.[session.date]?.isDeleted) {
      return sum;
    }
    return sum + session.duration;
  }, 0);
  
  // If we're under target, try to add more sessions
  if (currentHours < commitment.totalHoursPerWeek) {
    const additionalHours = commitment.totalHoursPerWeek - currentHours;
    // Generate additional sessions for the missing hours
    const updatedCommitment = {
      ...commitment,
      totalHoursPerWeek: additionalHours
    };
    
    const additionalSessions = generateSmartCommitmentSchedule(
      updatedCommitment,
      settings,
      existingCommitments,
      existingPlans
    );
    
    return [...commitment.suggestedSessions, ...additionalSessions];
  }
  
  return commitment.suggestedSessions;
};
