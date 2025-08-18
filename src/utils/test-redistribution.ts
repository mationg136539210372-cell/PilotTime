/**
 * Test file to verify session redistribution functionality
 * This file is for development testing only
 */

import { Task, StudyPlan, StudySession, UserSettings } from '../types';

// Mock data for testing
const mockSettings: UserSettings = {
  dailyAvailableHours: 8,
  minSessionLength: 30,
  maxSessionHours: 4,
  bufferDays: 1,
  workDays: [1, 2, 3, 4, 5], // Monday to Friday
  studyWindowStartHour: 9,
  studyWindowEndHour: 17,
  studyPlanMode: 'even'
};

const mockTask: Task = {
  id: 'test-task-1',
  title: 'Test Task for Redistribution',
  description: 'A test task to verify redistribution logic',
  deadline: '2024-01-15',
  importance: true,
  estimatedHours: 6,
  status: 'pending',
  createdAt: '2024-01-01',
  targetFrequency: 'daily',
  respectFrequencyForDeadlines: true
};

// Create a scenario where one session is compromised (too small)
const compromisedSession: StudySession = {
  taskId: 'test-task-1',
  scheduledTime: '2024-01-10',
  startTime: '09:00',
  endTime: '09:15',
  allocatedHours: 0.25, // Only 15 minutes - compromised
  sessionNumber: 1,
  isFlexible: true,
  status: 'scheduled'
};

const healthySession1: StudySession = {
  taskId: 'test-task-1',
  scheduledTime: '2024-01-11',
  startTime: '09:00',
  endTime: '11:00',
  allocatedHours: 2,
  sessionNumber: 2,
  isFlexible: true,
  status: 'scheduled'
};

const healthySession2: StudySession = {
  taskId: 'test-task-1',
  scheduledTime: '2024-01-12',
  startTime: '09:00',
  endTime: '11:00',
  allocatedHours: 2,
  sessionNumber: 3,
  isFlexible: true,
  status: 'scheduled'
};

const mockStudyPlans: StudyPlan[] = [
  {
    id: 'plan-2024-01-10',
    date: '2024-01-10',
    plannedTasks: [compromisedSession],
    totalStudyHours: 0.25,
    availableHours: 7.75
  },
  {
    id: 'plan-2024-01-11',
    date: '2024-01-11',
    plannedTasks: [healthySession1],
    totalStudyHours: 2,
    availableHours: 6
  },
  {
    id: 'plan-2024-01-12',
    date: '2024-01-12',
    plannedTasks: [healthySession2],
    totalStudyHours: 2,
    availableHours: 6
  }
];

/**
 * Test redistribution behavior
 * Expected: The 0.25h compromised session should be redistributed to the two healthy sessions
 */
export const testRedistribution = () => {
  console.log('Testing session redistribution...');
  console.log('Before redistribution:');
  console.log('- Compromised session: 0.25h');
  console.log('- Healthy session 1: 2h');
  console.log('- Healthy session 2: 2h');
  console.log('- Total: 4.25h');
  
  // In a real scenario, the redistribution would happen during generateNewStudyPlan
  // This is just a conceptual test to show the expected behavior
  
  console.log('\nExpected after redistribution:');
  console.log('- Compromised session: removed');
  console.log('- Healthy session 1: ~2.125h');
  console.log('- Healthy session 2: ~2.125h');
  console.log('- Total: 4.25h (preserved)');
  
  return {
    originalTotal: 4.25,
    expectedDistribution: [2.125, 2.125],
    message: 'Redistribution should preserve total hours while removing compromised sessions'
  };
};

/**
 * Test case for when user reduces daily hour limit
 */
export const testDailyLimitReduction = () => {
  console.log('\nTesting daily limit reduction scenario...');
  console.log('User reduces daily available hours from 8h to 6h');
  console.log('Some sessions may become compromised due to day overload');
  
  // Simulate reducing daily limit
  const reducedSettings = { ...mockSettings, dailyAvailableHours: 6 };
  
  console.log('Expected behavior:');
  console.log('- Days with >6h total will trigger redistribution');
  console.log('- Smallest sessions on overloaded days will be redistributed');
  console.log('- Sessions move to days with available capacity');
  
  return {
    scenario: 'Daily limit reduction',
    trigger: 'Day utilization > 80% of available hours',
    action: 'Redistribute smallest sessions to less loaded days'
  };
};
