import { StudyPlan, StudySession, Task } from '../types';

/**
 * Creates test data with missed sessions for testing the enhanced redistribution system
 */
export const createTestDataWithMissedSessions = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBeforeYesterday = new Date(today);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
  
  const testTasks: Task[] = [
    {
      id: 'test-task-1',
      title: 'Math Homework',
      description: 'Complete algebra exercises',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      importance: true,
      estimatedHours: 3,
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: 'Mathematics'
    },
    {
      id: 'test-task-2', 
      title: 'Reading Assignment',
      description: 'Read chapter 5-7',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      importance: false,
      estimatedHours: 2,
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: 'Literature'
    },
    {
      id: 'test-task-3',
      title: 'Project Research',
      description: 'Research for final project',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
      importance: true,
      estimatedHours: 4,
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: 'Research'
    }
  ];

  const testStudyPlans: StudyPlan[] = [
    // Yesterday's plan with missed sessions
    {
      id: `plan-${yesterday.toISOString().split('T')[0]}`,
      date: yesterday.toISOString().split('T')[0],
      plannedTasks: [
        {
          taskId: 'test-task-1',
          scheduledTime: `${yesterday.toISOString().split('T')[0]} 09:00`,
          startTime: '09:00',
          endTime: '10:30',
          allocatedHours: 1.5,
          sessionNumber: 1,
          isFlexible: true,
          status: 'missed' // This will be detected as missed
        },
        {
          taskId: 'test-task-2',
          scheduledTime: `${yesterday.toISOString().split('T')[0]} 14:00`,
          startTime: '14:00',
          endTime: '15:30',
          allocatedHours: 1.5,
          sessionNumber: 1,
          isFlexible: true,
          status: 'missed' // This will be detected as missed
        }
      ],
      totalStudyHours: 3,
      availableHours: 8
    },
    // Day before yesterday with mixed sessions
    {
      id: `plan-${dayBeforeYesterday.toISOString().split('T')[0]}`,
      date: dayBeforeYesterday.toISOString().split('T')[0],
      plannedTasks: [
        {
          taskId: 'test-task-3',
          scheduledTime: `${dayBeforeYesterday.toISOString().split('T')[0]} 10:00`,
          startTime: '10:00',
          endTime: '12:00',
          allocatedHours: 2,
          sessionNumber: 1,
          isFlexible: true,
          status: 'missed' // This will be detected as missed
        },
        {
          taskId: 'test-task-1',
          scheduledTime: `${dayBeforeYesterday.toISOString().split('T')[0]} 15:00`,
          startTime: '15:00',
          endTime: '16:00',
          allocatedHours: 1,
          sessionNumber: 2,
          isFlexible: true,
          done: true,
          status: 'completed' // This one was completed
        }
      ],
      totalStudyHours: 3,
      availableHours: 8
    },
    // Today's plan (current)
    {
      id: `plan-${today.toISOString().split('T')[0]}`,
      date: today.toISOString().split('T')[0],
      plannedTasks: [
        {
          taskId: 'test-task-2',
          scheduledTime: `${today.toISOString().split('T')[0]} 09:00`,
          startTime: '09:00',
          endTime: '10:00',
          allocatedHours: 1,
          sessionNumber: 2,
          isFlexible: true,
          status: 'scheduled'
        }
      ],
      totalStudyHours: 1,
      availableHours: 8
    }
  ];

  return { testTasks, testStudyPlans };
};

/**
 * Creates more realistic test data with various scenarios
 */
export const createRealisticTestData = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  const getLocalDateString = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const testTasks: Task[] = [
    // Task 1: Math with mixed completion status
    {
      id: 'realistic-math',
      title: 'Advanced Calculus Study',
      description: 'Prepare for upcoming calculus exam',
      deadline: nextWeek.toISOString(),
      importance: true,
      estimatedHours: 6, // Total 6 hours
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: 'Mathematics'
    },
    // Task 2: Nearly completed task 
    {
      id: 'realistic-physics',
      title: 'Physics Lab Report',
      description: 'Complete lab report on motion physics',
      deadline: tomorrow.toISOString(),
      importance: true,
      estimatedHours: 4, // Total 4 hours
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: 'Physics'
    },
    // Task 3: Overdue task
    {
      id: 'realistic-english',
      title: 'English Essay',
      description: 'Write essay on Shakespeare',
      deadline: yesterday.toISOString(), // Overdue
      importance: false,
      estimatedHours: 3,
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: 'Literature'
    },
    // Task 4: Future task
    {
      id: 'realistic-history',
      title: 'History Research Project',
      description: 'Research project on World War II',
      deadline: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
      importance: true,
      estimatedHours: 8,
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: 'History'
    },
    // Task 5: Completed task (should not appear in sessions)
    {
      id: 'realistic-chemistry',
      title: 'Chemistry Lab',
      description: 'Complete chemistry experiment',
      deadline: tomorrow.toISOString(),
      importance: false,
      estimatedHours: 2,
      status: 'completed', // This task is completed
      createdAt: new Date().toISOString(),
      category: 'Chemistry'
    }
  ];

  const testStudyPlans: StudyPlan[] = [
    // Last week - some completed sessions
    {
      id: `plan-${getLocalDateString(lastWeek)}`,
      date: getLocalDateString(lastWeek),
      plannedTasks: [
        {
          taskId: 'realistic-math',
          scheduledTime: `${getLocalDateString(lastWeek)} 09:00`,
          startTime: '09:00',
          endTime: '11:00',
          allocatedHours: 2,
          sessionNumber: 1,
          isFlexible: true,
          done: true,
          status: 'completed'
        },
        {
          taskId: 'realistic-physics',
          scheduledTime: `${getLocalDateString(lastWeek)} 14:00`,
          startTime: '14:00',
          endTime: '16:00',
          allocatedHours: 2,
          sessionNumber: 1,
          isFlexible: true,
          done: true,
          status: 'completed'
        }
      ],
      totalStudyHours: 4,
      availableHours: 8
    },
    // Yesterday - mixed results
    {
      id: `plan-${getLocalDateString(yesterday)}`,
      date: getLocalDateString(yesterday),
      plannedTasks: [
        {
          taskId: 'realistic-math',
          scheduledTime: `${getLocalDateString(yesterday)} 10:00`,
          startTime: '10:00',
          endTime: '12:00',
          allocatedHours: 2,
          sessionNumber: 2,
          isFlexible: true,
          done: true,
          status: 'completed'
        },
        {
          taskId: 'realistic-physics',
          scheduledTime: `${getLocalDateString(yesterday)} 15:00`,
          startTime: '15:00',
          endTime: '16:30',
          allocatedHours: 1.5,
          sessionNumber: 2,
          isFlexible: true,
          status: 'missed' // Missed session
        },
        {
          taskId: 'realistic-english',
          scheduledTime: `${getLocalDateString(yesterday)} 18:00`,
          startTime: '18:00',
          endTime: '19:30',
          allocatedHours: 1.5,
          sessionNumber: 1,
          isFlexible: true,
          status: 'missed' // Missed session for overdue task
        }
      ],
      totalStudyHours: 5,
      availableHours: 8
    },
    // Today - current sessions (only for active tasks)
    {
      id: `plan-${getLocalDateString(today)}`,
      date: getLocalDateString(today),
      plannedTasks: [
        {
          taskId: 'realistic-math',
          scheduledTime: `${getLocalDateString(today)} 09:00`,
          startTime: '09:00',
          endTime: '11:00',
          allocatedHours: 2,
          sessionNumber: 3,
          isFlexible: true,
          status: 'scheduled'
        },
        {
          taskId: 'realistic-physics',
          scheduledTime: `${getLocalDateString(today)} 14:00`,
          startTime: '14:00',
          endTime: '14:30',
          allocatedHours: 0.5,
          sessionNumber: 3,
          isFlexible: true,
          status: 'scheduled'
        },
        {
          taskId: 'realistic-history',
          scheduledTime: `${getLocalDateString(today)} 16:00`,
          startTime: '16:00',
          endTime: '18:00',
          allocatedHours: 2,
          sessionNumber: 1,
          isFlexible: true,
          status: 'scheduled'
        }
        // Note: No session for 'realistic-chemistry' since it's completed
        // Note: No session for 'realistic-english' since it's overdue
      ],
      totalStudyHours: 4.5,
      availableHours: 8
    },
    // Tomorrow - future sessions
    {
      id: `plan-${getLocalDateString(tomorrow)}`,
      date: getLocalDateString(tomorrow),
      plannedTasks: [
        {
          taskId: 'realistic-history',
          scheduledTime: `${getLocalDateString(tomorrow)} 10:00`,
          startTime: '10:00',
          endTime: '13:00',
          allocatedHours: 3,
          sessionNumber: 2,
          isFlexible: true,
          status: 'scheduled'
        }
      ],
      totalStudyHours: 3,
      availableHours: 8
    }
  ];

  return { testTasks, testStudyPlans };
};

/**
 * Sets up realistic test data in localStorage
 */
export const setupRealisticTestData = () => {
  const { testTasks, testStudyPlans } = createRealisticTestData();

  localStorage.setItem('timepilot-tasks', JSON.stringify(testTasks));
  localStorage.setItem('timepilot-studyPlans', JSON.stringify(testStudyPlans));

  console.log('Realistic test data setup complete!');
  console.log('Tasks created:', testTasks.length);
  console.log('- Active tasks:', testTasks.filter(t => t.status === 'pending').length);
  console.log('- Completed tasks:', testTasks.filter(t => t.status === 'completed').length);
  console.log('Study plans created:', testStudyPlans.length);

  const missedSessions = testStudyPlans.reduce((count, plan) =>
    count + plan.plannedTasks.filter(session => session.status === 'missed').length, 0
  );
  const overdueMissedSessions = testStudyPlans.reduce((count, plan) =>
    count + plan.plannedTasks.filter(session => {
      if (session.status === 'missed') {
        const task = testTasks.find(t => t.id === session.taskId);
        return task && new Date(task.deadline) < new Date();
      }
      return false;
    }).length, 0
  );

  console.log('Missed sessions created:', missedSessions);
  console.log('- Redistributable missed sessions:', missedSessions - overdueMissedSessions);
  console.log('- Overdue missed sessions:', overdueMissedSessions);
  console.log('Completed sessions:',
    testStudyPlans.reduce((count, plan) =>
      count + plan.plannedTasks.filter(session => session.done || session.status === 'completed').length, 0
    )
  );

  console.log('\n🎯 Test the SIMPLIFIED missed session handling:');
  console.log('1. Go to Study Plan view');
  console.log('2. Click "Create Fresh Study Plan"');
  console.log('3. ✅ Fresh plan created using full task estimates');
  console.log('4. ✅ ALL missed sessions stay in Missed Sessions section');
  console.log('5. ✅ No complex redistribution - simple fresh start');
  console.log('6. ✅ User manually handles missed sessions (Start/Skip/Mark Done)');
  console.log('7. ✅ No edge cases or duplication bugs!');

  // Reload the page to reflect changes
  window.location.reload();
};

/**
 * Sets up test data in localStorage for testing
 */
export const setupTestData = () => {
  const { testTasks, testStudyPlans } = createTestDataWithMissedSessions();
  
  localStorage.setItem('timepilot-tasks', JSON.stringify(testTasks));
  localStorage.setItem('timepilot-studyPlans', JSON.stringify(testStudyPlans));
  
  console.log('Test data setup complete!');
  console.log('Tasks created:', testTasks.length);
  console.log('Study plans created:', testStudyPlans.length);
  console.log('Missed sessions created:', 
    testStudyPlans.reduce((count, plan) => 
      count + plan.plannedTasks.filter(session => session.status === 'missed').length, 0
    )
  );
  
  // Reload the page to reflect changes
  window.location.reload();
};

/**
 * Creates test data specifically for demonstrating balanced priority mode
 */
export const createBalancedPriorityTestData = () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextMonth = new Date(today);
  nextMonth.setDate(nextMonth.getDate() + 30);

  const testTasks: Task[] = [
    // Q1: Important & Urgent
    {
      id: 'urgent-important-1',
      title: 'Final Exam Prep',
      description: 'Prepare for tomorrow\'s final exam',
      deadline: tomorrow.toISOString(),
      importance: true,
      estimatedHours: 4,
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: 'Study'
    },
    {
      id: 'urgent-important-2',
      title: 'Project Deadline',
      description: 'Complete urgent project due soon',
      deadline: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      importance: true,
      estimatedHours: 6,
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: 'Work'
    },

    // Q2: Important but Not Urgent
    {
      id: 'important-1',
      title: 'Research Paper',
      description: 'Work on important research paper',
      deadline: nextWeek.toISOString(),
      importance: true,
      estimatedHours: 8,
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: 'Study'
    },
    {
      id: 'important-2',
      title: 'Skill Development',
      description: 'Learn new programming language',
      deadline: nextMonth.toISOString(),
      importance: true,
      estimatedHours: 12,
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: 'Personal'
    },

    // Q3: Urgent but Not Important
    {
      id: 'urgent-1',
      title: 'Administrative Task',
      description: 'Complete urgent paperwork',
      deadline: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      importance: false,
      estimatedHours: 2,
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: 'Administrative'
    },

    // Q4: Neither Urgent nor Important
    {
      id: 'regular-1',
      title: 'Organize Files',
      description: 'Clean up computer files',
      deadline: nextMonth.toISOString(),
      importance: false,
      estimatedHours: 3,
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: 'Personal'
    },
    {
      id: 'regular-2',
      title: 'Read Articles',
      description: 'Catch up on reading',
      deadline: nextMonth.toISOString(),
      importance: false,
      estimatedHours: 4,
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: 'Personal'
    }
  ];

  return { testTasks, testStudyPlans: [] };
};

export const setupBalancedPriorityTest = () => {
  const { testTasks } = createBalancedPriorityTestData();

  // Save to localStorage
  localStorage.setItem('timepilot-tasks', JSON.stringify(testTasks));
  localStorage.setItem('timepilot-studyPlans', JSON.stringify([]));

  // Also set balanced priority mode in settings
  const currentSettings = JSON.parse(localStorage.getItem('timepilot-settings') || '{}');
  const updatedSettings = {
    ...currentSettings,
    studyPlanMode: 'balanced'
  };
  localStorage.setItem('timepilot-settings', JSON.stringify(updatedSettings));

  console.log('Balanced priority test data loaded:');
  console.log('Tasks:', testTasks);
  console.log('Mode set to: balanced');

  // Trigger a page reload to apply the new data
  window.location.reload();
};

// Expose functions globally for easy access in browser console
(window as any).setupTestData = setupTestData;
(window as any).setupBalancedPriorityTest = setupBalancedPriorityTest;
(window as any).setupRealisticTestData = setupRealisticTestData;
