import { Task, UserSettings, StudyPlan, FixedCommitment } from '../types';
import { generateNewStudyPlanWithPreservation } from './scheduling';

export interface AddTaskFeasibility {
  blocksNewTask: boolean;
  reason: string;
  scheduledHours: number;
  totalHours: number;
  scheduledPercentage: number;
  plans: StudyPlan[];
}

/**
 * Assess feasibility of adding a task by generating a plan and checking scheduled vs. total hours.
 * Blocks if the task is completely unscheduled OR if more than 50% is unscheduled.
 * Preserves manual schedules by default.
 */
export function assessAddTaskFeasibility(
  newTask: Task,
  updatedTasks: Task[],
  settings: UserSettings,
  fixedCommitments: FixedCommitment[],
  existingStudyPlans: StudyPlan[],
  precomputedPlans?: StudyPlan[]
): AddTaskFeasibility {
  const plansToUse = precomputedPlans || generateNewStudyPlanWithPreservation(updatedTasks, settings, fixedCommitments, existingStudyPlans).plans;

  // Compute scheduled hours for the new task, excluding skipped sessions
  const scheduledHoursMap: Record<string, number> = {};
  plansToUse.forEach(plan => {
    plan.plannedTasks.forEach(session => {
      if (session.status !== 'skipped') {
        scheduledHoursMap[session.taskId] = (scheduledHoursMap[session.taskId] || 0) + session.allocatedHours;
      }
    });
  });

  const scheduled = scheduledHoursMap[newTask.id] || 0;
  const total = newTask.estimatedHours;
  const scheduledPercentage = total > 0 ? (scheduled / total) * 100 : 0;
  const isCompletelyUnscheduled = scheduled === 0;
  const isMostlyUnscheduled = scheduledPercentage < 50;
  const blocksNewTask = isCompletelyUnscheduled || isMostlyUnscheduled;

  const reason = isCompletelyUnscheduled
    ? 'cannot be scheduled at all'
    : `can only be ${scheduledPercentage.toFixed(0)}% scheduled`;

  return {
    blocksNewTask,
    reason,
    scheduledHours: scheduled,
    totalHours: total,
    scheduledPercentage,
    plans: plansToUse,
  };
}
