import { SmartCommitment, FixedCommitment, StudySession, StudyPlan } from '../types';

/**
 * Convert smart commitment sessions to calendar events for display
 */
export const getSmartCommitmentSessionsForDate = (
  date: string,
  smartCommitments: SmartCommitment[]
): Array<{
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  isSmartCommitment: true;
  commitmentId: string;
  duration: number;
}> => {
  const sessions: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    category: string;
    isSmartCommitment: true;
    commitmentId: string;
    duration: number;
  }> = [];

  smartCommitments.forEach(commitment => {
    // Find sessions for this date
    const sessionsForDate = commitment.suggestedSessions.filter(session => session.date === date);
    
    sessionsForDate.forEach((session, index) => {
      // Check if this session has been manually overridden
      const override = commitment.manualOverrides?.[date];
      
      if (override?.isDeleted) {
        return; // Skip deleted sessions
      }

      const startTime = override?.startTime || session.startTime;
      const endTime = override?.endTime || session.endTime;

      sessions.push({
        id: `${commitment.id}-${date}-${index}`,
        title: commitment.title,
        startTime,
        endTime,
        category: commitment.category,
        isSmartCommitment: true,
        commitmentId: commitment.id,
        duration: session.duration
      });
    });
  });

  return sessions;
};

/**
 * Convert smart commitments to fixed-commitment-like format for scheduling compatibility
 */
export const convertSmartCommitmentsToFixedFormat = (
  smartCommitments: SmartCommitment[]
): FixedCommitment[] => {
  const fixedFormat: FixedCommitment[] = [];

  smartCommitments.forEach(commitment => {
    commitment.suggestedSessions.forEach((session, index) => {
      // Check if this session has been manually overridden
      const override = commitment.manualOverrides?.[session.date];
      
      if (override?.isDeleted) {
        return; // Skip deleted sessions
      }

      const startTime = override?.startTime || session.startTime;
      const endTime = override?.endTime || session.endTime;

      // Create a fixed commitment representation for this session
      const fixedCommitment: FixedCommitment = {
        id: `smart-${commitment.id}-${session.date}-${index}`,
        title: commitment.title,
        type: 'fixed',
        startTime,
        endTime,
        recurring: false,
        daysOfWeek: [],
        specificDates: [session.date],
        category: commitment.category,
        location: commitment.location,
        description: commitment.description,
        createdAt: commitment.createdAt,
        countsTowardDailyHours: commitment.countsTowardDailyHours
      };

      fixedFormat.push(fixedCommitment);
    });
  });

  return fixedFormat;
};

/**
 * Get all commitment conflicts for a date (both fixed and smart)
 */
export const getAllCommitmentConflicts = (
  date: string,
  fixedCommitments: FixedCommitment[],
  smartCommitments: SmartCommitment[]
): Array<{ start: number; end: number; source: 'fixed' | 'smart'; id: string }> => {
  const conflicts: Array<{ start: number; end: number; source: 'fixed' | 'smart'; id: string }> = [];
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();

  // Add fixed commitment conflicts
  fixedCommitments.forEach(commitment => {
    if (commitment.startTime && commitment.endTime && !commitment.isAllDay) {
      let includeCommitment = false;

      if (commitment.recurring) {
        if (commitment.daysOfWeek.includes(dayOfWeek)) {
          if (commitment.dateRange) {
            const startDate = new Date(commitment.dateRange.startDate);
            const endDate = new Date(commitment.dateRange.endDate);
            if (targetDate >= startDate && targetDate <= endDate) {
              includeCommitment = true;
            }
          } else {
            includeCommitment = true;
          }
        }
      } else if (commitment.specificDates?.includes(date)) {
        includeCommitment = true;
      }

      if (includeCommitment && !commitment.deletedOccurrences?.includes(date)) {
        conflicts.push({
          start: timeToMinutes(commitment.startTime),
          end: timeToMinutes(commitment.endTime),
          source: 'fixed',
          id: commitment.id
        });
      }
    }
  });

  // Add smart commitment conflicts
  smartCommitments.forEach(commitment => {
    const sessionsForDate = commitment.suggestedSessions.filter(session => session.date === date);
    
    sessionsForDate.forEach((session, index) => {
      const override = commitment.manualOverrides?.[date];
      
      if (!override?.isDeleted) {
        const startTime = override?.startTime || session.startTime;
        const endTime = override?.endTime || session.endTime;

        conflicts.push({
          start: timeToMinutes(startTime),
          end: timeToMinutes(endTime),
          source: 'smart',
          id: `${commitment.id}-${index}`
        });
      }
    });
  });

  return conflicts;
};

/**
 * Update smart commitment with manual override
 */
export const updateSmartCommitmentOverride = (
  commitment: SmartCommitment,
  date: string,
  override: {
    startTime?: string;
    endTime?: string;
    isDeleted?: boolean;
  }
): SmartCommitment => {
  return {
    ...commitment,
    manualOverrides: {
      ...commitment.manualOverrides,
      [date]: override
    }
  };
};

/**
 * Check if a smart commitment needs re-optimization
 */
export const shouldReoptimizeSmartCommitment = (
  commitment: SmartCommitment,
  existingConflicts: Array<{ start: number; end: number }>
): boolean => {
  if (!commitment.allowTimeShifting) {
    return false;
  }

  // Check if any suggested sessions conflict with existing schedules
  return commitment.suggestedSessions.some(session => {
    const sessionStart = timeToMinutes(session.startTime);
    const sessionEnd = timeToMinutes(session.endTime);

    return existingConflicts.some(conflict => 
      (sessionStart < conflict.end && sessionEnd > conflict.start)
    );
  });
};

/**
 * Utility function to convert time string to minutes
 */
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Get weekly hours total for a smart commitment
 */
export const getSmartCommitmentWeeklyHours = (commitment: SmartCommitment): number => {
  const weeklyHours = commitment.suggestedSessions.reduce((total, session) => {
    // Skip manually deleted sessions
    if (commitment.manualOverrides?.[session.date]?.isDeleted) {
      return total;
    }
    return total + session.duration;
  }, 0);

  return weeklyHours;
};

/**
 * Validate smart commitment sessions against constraints
 */
export const validateSmartCommitmentSessions = (
  commitment: SmartCommitment
): {
  isValid: boolean;
  issues: string[];
  totalHours: number;
  targetHours: number;
} => {
  const issues: string[] = [];
  const totalHours = getSmartCommitmentWeeklyHours(commitment);
  const targetHours = commitment.totalHoursPerWeek;

  // Check if we're meeting the target hours
  const hoursDifference = Math.abs(totalHours - targetHours);
  if (hoursDifference > 0.5) {
    issues.push(`Total hours (${totalHours.toFixed(1)}) differs significantly from target (${targetHours})`);
  }

  // Check if sessions are within preferred time ranges
  const outOfRangeSessions = commitment.suggestedSessions.filter(session => {
    if (commitment.manualOverrides?.[session.date]?.isDeleted) {
      return false;
    }

    const sessionStart = timeToMinutes(session.startTime);
    const sessionEnd = timeToMinutes(session.endTime);

    return !commitment.preferredTimeRanges.some(range => {
      const rangeStart = timeToMinutes(range.start);
      const rangeEnd = timeToMinutes(range.end);
      return sessionStart >= rangeStart && sessionEnd <= rangeEnd;
    });
  });

  if (outOfRangeSessions.length > 0) {
    issues.push(`${outOfRangeSessions.length} sessions are outside preferred time ranges`);
  }

  // Check if sessions are on preferred days
  const wrongDaySessions = commitment.suggestedSessions.filter(session => {
    if (commitment.manualOverrides?.[session.date]?.isDeleted) {
      return false;
    }
    return !commitment.preferredDays.includes(session.dayOfWeek);
  });

  if (wrongDaySessions.length > 0) {
    issues.push(`${wrongDaySessions.length} sessions are on non-preferred days`);
  }

  return {
    isValid: issues.length === 0,
    issues,
    totalHours,
    targetHours
  };
};
