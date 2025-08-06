import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle, Info, Clock, Calendar, Settings, BookOpen, Users, AlertTriangle, Target, Lightbulb, TrendingUp, Zap } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetTab?: "tasks" | "dashboard" | "plan" | "timer" | "calendar" | "commitments" | "settings";
  targetElement?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'observe' | 'wait-for-action';
  waitFor?: 'task-added' | 'session-clicked' | 'tab-changed' | 'settings-changed' | 'study-plan-mode-changed' | 'timer-session-active' | 'commitment-added';
  customContent?: React.ReactNode;
  highlightTab?: boolean;
  requiresAction?: boolean;
}

interface InteractiveTutorialProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  currentTab: string;
  onTabChange: (tab: "tasks" | "dashboard" | "plan" | "timer" | "calendar" | "commitments" | "settings") => void;
  tasksCount?: number;
  commitmentsCount?: number;
  onHighlightTab?: (tabId: string | null) => void;
  onHighlightStudyPlanMode?: (highlight: boolean) => void;
  currentStudyPlanMode?: string;
  hasActiveTimerSession?: boolean;
}

const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  isActive,
  onComplete,
  onSkip,
  currentTab,
  tasksCount = 0,
  commitmentsCount = 0,
  onHighlightTab,
  onHighlightStudyPlanMode,
  currentStudyPlanMode,
  hasActiveTimerSession = false
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [, setActionCompleted] = useState(false);
  const [initialTasksCount, setInitialTasksCount] = useState(tasksCount);
  const [initialCommitmentsCount, setInitialCommitmentsCount] = useState(commitmentsCount);
  const [initialStudyPlanMode, setInitialStudyPlanMode] = useState<string | null>(null);

  const tutorialSteps: TutorialStep[] = [
    // Welcome & Overview
    {
      id: 'welcome',
      title: 'Welcome to TimePilot! 🚀',
      description: 'TimePilot is an intelligent study planning app that automatically creates optimized schedules based on your tasks, deadlines, and commitments. Let\'s learn how to use it effectively!',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-3 text-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">What TimePilot Does:</p>
            <ul className="space-y-1 text-blue-700 dark:text-blue-300">
              <li>• Automatically schedules study sessions</li>
              <li>• Considers your existing commitments</li>
              <li>• Adapts to deadline priorities</li>
              <li>• Tracks your study progress</li>
            </ul>
          </div>
        </div>
      )
    },

    // Core Concepts Explanation
    {
      id: 'core-concepts',
      title: 'Understanding: Tasks vs Commitments',
      description: 'Before we start, let\'s clarify the difference between these two core concepts in TimePilot.',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border-l-4 border-green-500">
              <div className="flex items-center space-x-2 mb-2">
                <BookOpen className="text-green-600 dark:text-green-400" size={16} />
                <span className="font-semibold text-green-800 dark:text-green-200">TASKS</span>
              </div>
              <p className="text-green-700 dark:text-green-300 mb-2">Work you need to accomplish (flexible timing)</p>
              <ul className="text-xs text-green-600 dark:text-green-400 space-y-1">
                <li>• Study for Math exam</li>
                <li>• Write essay for English</li>
                <li>• Complete programming assignment</li>
              </ul>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border-l-4 border-orange-500">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="text-orange-600 dark:text-orange-400" size={16} />
                <span className="font-semibold text-orange-800 dark:text-orange-200">COMMITMENTS</span>
              </div>
              <p className="text-orange-700 dark:text-orange-300 mb-2">Fixed appointments (cannot be moved)</p>
              <ul className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
                <li>• Class lectures at 9:00 AM</li>
                <li>• Work shifts</li>
                <li>• Doctor appointments</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },

    // Tasks Section
    {
      id: 'task-input-intro',
      title: 'Step 1: Adding Your Tasks',
      description: 'Let\'s start by adding your study tasks. Navigate to the "Tasks" tab to begin.',
      targetTab: 'tasks',
      position: 'center',
      action: 'observe',
      highlightTab: true,
      requiresAction: false,
      customContent: (
        <div className="space-y-2 text-sm">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={16} />
              <span className="font-semibold text-yellow-800 dark:text-yellow-200">Pro Tips for Tasks:</span>
            </div>
            <ul className="text-yellow-700 dark:text-yellow-300 space-y-1 text-xs">
              <li>✅ <strong>DO:</strong> Break large tasks into smaller chunks (2-4 hours max)</li>
              <li>✅ <strong>DO:</strong> Be realistic with time estimates</li>
              <li>✅ <strong>DO:</strong> Mark truly important tasks as "Important"</li>
              <li>❌ <strong>DON'T:</strong> Add recurring events as tasks (use commitments instead)</li>
              <li>❌ <strong>DON'T:</strong> Underestimate time - add 25% buffer</li>
            </ul>
          </div>
        </div>
      )
    },

    {
      id: 'task-input-demo',
      title: 'Try Adding Your First Task',
      description: 'Click the "Add Task" button and create a study task. Include a realistic time estimate and deadline.',
      targetTab: 'tasks',
      targetElement: '.add-task-button',
      position: 'bottom',
      action: 'wait-for-action',
      waitFor: 'task-added',
      requiresAction: true,
      customContent: (
        <div className="space-y-2 text-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
            <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Example Task:</p>
            <ul className="text-blue-700 dark:text-blue-300 text-xs space-y-1">
              <li><strong>Title:</strong> "Study Chapter 5 - Physics"</li>
              <li><strong>Estimated Hours:</strong> 3 hours</li>
              <li><strong>Deadline:</strong> Next Friday</li>
              <li><strong>Category:</strong> Physics (optional)</li>
            </ul>
          </div>
        </div>
      )
    },

    {
      id: 'task-input-complete',
      title: 'Excellent! Task Added Successfully ✅',
      description: 'Great! Notice how your task appears in the list with its estimated time and deadline. TimePilot will use this information to create your study schedule.',
      position: 'center',
      action: 'observe',
      requiresAction: false
    },

    // Commitments Section
    {
      id: 'commitments-intro',
      title: 'Step 2: Adding Your Fixed Commitments',
      description: 'Now let\'s add your fixed commitments - things like classes, work, or appointments that happen at specific times.',
      targetTab: 'commitments',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'tab-changed',
      highlightTab: true,
      requiresAction: true,
      customContent: (
        <div className="space-y-2 text-sm">
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Info className="text-purple-600 dark:text-purple-400" size={16} />
              <span className="font-semibold text-purple-800 dark:text-purple-200">Why Commitments Matter:</span>
            </div>
            <p className="text-purple-700 dark:text-purple-300 text-xs">
              TimePilot schedules your study sessions AROUND your commitments, ensuring no conflicts with classes, work, or important appointments.
            </p>
          </div>
        </div>
      )
    },

    {
      id: 'commitment-patterns-explanation',
      title: 'Understanding Commitment Patterns',
      description: 'TimePilot supports different recurrence patterns for flexible scheduling.',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-3 text-sm">
          <div className="space-y-2">
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
              <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">📅 <strong>One-time:</strong></p>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Doctor appointment, job interview</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
              <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">🔄 <strong>Recurring:</strong></p>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Weekly classes, work shifts, gym sessions</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
              <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">🌙 <strong>Block scheduling:</strong></p>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Sleep time, meals, commute time</p>
            </div>
          </div>
        </div>
      )
    },

    {
      id: 'commitment-input-demo',
      title: 'Try Adding a Commitment',
      description: 'Click "Add Commitment" and create a recurring commitment like a class or work schedule.',
      targetTab: 'commitments',
      targetElement: '.add-commitment-button',
      position: 'bottom',
      action: 'wait-for-action',
      waitFor: 'commitment-added',
      requiresAction: true,
      customContent: (
        <div className="space-y-2 text-sm">
          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
            <p className="font-medium text-green-800 dark:text-green-200 mb-1">Example Commitment:</p>
            <ul className="text-green-700 dark:text-green-300 text-xs space-y-1">
              <li><strong>Title:</strong> "Physics Lecture"</li>
              <li><strong>Time:</strong> Monday 9:00 AM - 10:30 AM</li>
              <li><strong>Frequency:</strong> Weekly</li>
              <li><strong>Location:</strong> Room 101 (optional)</li>
            </ul>
          </div>
        </div>
      )
    },

    {
      id: 'commitment-input-complete',
      title: 'Perfect! Commitment Added ✅',
      description: 'Excellent! Your commitment is now saved. TimePilot will automatically avoid scheduling study sessions during this time.',
      position: 'center',
      action: 'observe',
      requiresAction: false
    },

    // Study Plan Generation
    {
      id: 'study-plan-intro',
      title: 'Step 3: Intelligent Study Plan Generation',
      description: 'Now let\'s see the magic! Navigate to "Study Plan" to see how TimePilot automatically creates your personalized schedule.',
      targetTab: 'plan',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'tab-changed',
      highlightTab: true,
      requiresAction: true
    },

    {
      id: 'study-plan-explanation',
      title: 'How Smart Scheduling Works',
      description: 'TimePilot analyzes your tasks, deadlines, commitments, and preferences to create an optimal study schedule.',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-3 text-sm">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
            <p className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">🧠 Smart Algorithm Considers:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-indigo-700 dark:text-indigo-300">Deadline urgency</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-indigo-700 dark:text-indigo-300">Task importance</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-indigo-700 dark:text-indigo-300">Available time slots</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-indigo-700 dark:text-indigo-300">Your commitments</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-indigo-700 dark:text-indigo-300">Study preferences</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                <span className="text-indigo-700 dark:text-indigo-300">Buffer time</span>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Suggestions Panel Explanation
    {
      id: 'suggestions-panel-intro',
      title: 'Understanding the Suggestions Panel',
      description: 'The suggestions panel appears when TimePilot detects scheduling conflicts or optimization opportunities.',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-3 text-sm">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Lightbulb className="text-yellow-600 dark:text-yellow-400" size={16} />
              <span className="font-semibold text-yellow-800 dark:text-yellow-200">Suggestions Panel Shows:</span>
            </div>
            <ul className="text-yellow-700 dark:text-yellow-300 space-y-1 text-xs">
              <li>🟡 <strong>Unscheduled Hours:</strong> Tasks that couldn't fit in your schedule</li>
              <li>🔴 <strong>Conflicts:</strong> Overlapping commitments or impossible deadlines</li>
              <li>💡 <strong>Recommendations:</strong> Ways to optimize your schedule</li>
              <li>⚡ <strong>Quick Fixes:</strong> One-click solutions to common problems</li>
            </ul>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
            <p className="text-red-700 dark:text-red-300 text-xs">
              <strong>Note:</strong> If you see unscheduled hours after redistributing missed sessions, this indicates sessions that still need time allocation.
            </p>
          </div>
        </div>
      )
    },

    // Calendar View
    {
      id: 'calendar-intro',
      title: 'Step 4: Visual Calendar Overview',
      description: 'Navigate to "Calendar" to see your complete schedule - study sessions, commitments, and free time - all in one view.',
      targetTab: 'calendar',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'tab-changed',
      highlightTab: true,
      requiresAction: true
    },

    {
      id: 'calendar-features',
      title: 'Calendar Features & Best Practices',
      description: 'The calendar is your command center for schedule management.',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-3 text-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">📅 Calendar Features:</p>
            <ul className="text-blue-700 dark:text-blue-300 space-y-1 text-xs">
              <li>• Switch between day/week/month views</li>
              <li>• Color-coded events (study sessions vs commitments)</li>
              <li>• Drag-and-drop to reschedule (where possible)</li>
              <li>• Click on events for details and actions</li>
            </ul>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
            <p className="font-semibold text-green-800 dark:text-green-200 mb-1">✅ Best Practices:</p>
            <ul className="text-green-700 dark:text-green-300 space-y-1 text-xs">
              <li>• Review your weekly schedule every Sunday</li>
              <li>• Check for overloaded days and redistribute</li>
              <li>• Leave 1-2 hours buffer for unexpected tasks</li>
            </ul>
          </div>
        </div>
      )
    },

    // Settings Deep Dive
    {
      id: 'settings-intro',
      title: 'Step 5: Personalizing Your Settings',
      description: 'Navigate to "Settings" to customize TimePilot to match your study habits and preferences.',
      targetTab: 'settings',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'tab-changed',
      highlightTab: true,
      requiresAction: true
    },

    {
      id: 'study-plan-modes-explanation',
      title: 'Understanding Study Plan Modes',
      description: 'TimePilot offers different scheduling strategies. Each mode distributes your study time differently.',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-3 text-sm">
          <div className="space-y-2">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border-l-4 border-purple-500">
              <p className="font-semibold text-purple-800 dark:text-purple-200 mb-1">🎯 <strong>Eisenhower Matrix</strong></p>
              <p className="text-purple-700 dark:text-purple-300 text-xs mb-2">Smart prioritization based on importance + urgency</p>
              <p className="text-purple-600 dark:text-purple-400 text-xs"><strong>Best for:</strong> Mixed workload with varying priorities</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border-l-4 border-blue-500">
              <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">⚖️ <strong>Evenly Distributed</strong></p>
              <p className="text-blue-700 dark:text-blue-300 text-xs mb-2">Equal time allocation across all tasks</p>
              <p className="text-blue-600 dark:text-blue-400 text-xs"><strong>Best for:</strong> Similar priority tasks or maintaining balance</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border-l-4 border-green-500">
              <p className="font-semibold text-green-800 dark:text-green-200 mb-1">🎯 <strong>Balanced Priority</strong></p>
              <p className="text-green-700 dark:text-green-300 text-xs mb-2">Weighted distribution favoring important tasks</p>
              <p className="text-green-600 dark:text-green-400 text-xs"><strong>Best for:</strong> When some tasks are more critical than others</p>
            </div>
          </div>
        </div>
      )
    },

    {
      id: 'study-window-settings',
      title: 'Try Switching Study Plan Mode',
      description: 'Experiment with different study plan modes to see how they affect your schedule distribution.',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'study-plan-mode-changed',
      requiresAction: true,
      customContent: (
        <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg text-sm">
          <p className="text-orange-800 dark:text-orange-200 text-xs">
            💡 <strong>Tip:</strong> Try switching between modes and check the calendar to see how session distribution changes!
          </p>
        </div>
      )
    },

    {
      id: 'other-settings-explanation',
      title: 'Other Important Settings',
      description: 'Let\'s review other key settings that affect your study planning.',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
              <p className="font-medium text-gray-800 dark:text-gray-200 text-xs mb-1">⏰ <strong>Daily Available Hours</strong></p>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Maximum hours you want to study per day (excluding commitments)</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
              <p className="font-medium text-gray-800 dark:text-gray-200 text-xs mb-1">📅 <strong>Work Days</strong></p>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Which days you're available to study (weekends optional)</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
              <p className="font-medium text-gray-800 dark:text-gray-200 text-xs mb-1">🛡️ <strong>Buffer Days</strong></p>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Extra days before deadlines for safety (recommended: 1-2 days)</p>
            </div>
          </div>
        </div>
      )
    },

    // Missed Sessions & Redistribution
    {
      id: 'missed-sessions-explanation',
      title: 'Handling Missed Sessions',
      description: 'Life happens! Here\'s how TimePilot helps you recover when you miss study sessions.',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-3 text-sm">
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            <p className="font-semibold text-red-800 dark:text-red-200 mb-2">🔄 When Sessions Are Missed:</p>
            <ul className="text-red-700 dark:text-red-300 space-y-1 text-xs">
              <li>• TimePilot automatically detects missed sessions</li>
              <li>• Shows redistribution options in the suggestions panel</li>
              <li>• Offers both Enhanced and Legacy redistribution modes</li>
              <li>• Reschedules missed work around your existing commitments</li>
            </ul>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
            <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">💡 <strong>Pro Tip:</strong></p>
            <p className="text-blue-700 dark:text-blue-300 text-xs">
              Use Enhanced mode first - it's smarter about finding optimal time slots. Fall back to Legacy mode if needed.
            </p>
          </div>
        </div>
      )
    },

    // Timer and Session Management
    {
      id: 'session-interaction-intro',
      title: 'Step 6: Starting Study Sessions',
      description: 'Navigate back to "Study Plan" to learn how to start and manage your study sessions.',
      targetTab: 'plan',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'tab-changed',
      highlightTab: true,
      requiresAction: true
    },

    {
      id: 'session-management-explanation',
      title: 'Study Session Best Practices',
      description: 'Here\'s how to effectively manage your study sessions for maximum productivity.',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-3 text-sm">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <p className="font-semibold text-green-800 dark:text-green-200 mb-2">✅ Session Management:</p>
            <ul className="text-green-700 dark:text-green-300 space-y-1 text-xs">
              <li>• Click on any session to start the timer</li>
              <li>• Mark sessions "Complete" when finished</li>
              <li>• Mark "Skipped" if you intentionally skip</li>
              <li>• Sessions missed entirely will auto-detect</li>
            </ul>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg">
            <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">⚠️ <strong>Important:</strong></p>
            <p className="text-yellow-700 dark:text-yellow-300 text-xs">
              Always mark sessions appropriately - this helps TimePilot track your progress and suggest better schedules!
            </p>
          </div>
        </div>
      )
    },

    {
      id: 'click-session',
      title: 'Try Starting a Session',
      description: 'Click on any study session to activate the timer and start tracking your progress.',
      targetTab: 'timer',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'timer-session-active',
      highlightTab: false,
      requiresAction: true
    },

    // Timer Features
    {
      id: 'timer-intro',
      title: 'Step 7: Study Timer Features ⏱️',
      description: 'Perfect! The timer is now active. Navigate to "Timer" to see all the timer features.',
      position: 'center',
      action: 'observe',
      requiresAction: false
    },

    {
      id: 'timer-features',
      title: 'Timer Controls & Features',
      description: 'Your study timer includes powerful features to help you stay focused and track progress.',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-3 text-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">⏰ Timer Features:</p>
            <ul className="text-blue-700 dark:text-blue-300 space-y-1 text-xs">
              <li>• Pause/Resume during breaks</li>
              <li>• Skip session if you can't continue</li>
              <li>• Mark complete when finished early</li>
              <li>• Automatic progress tracking</li>
              <li>• Session completion history</li>
            </ul>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg">
            <p className="font-semibold text-purple-800 dark:text-purple-200 mb-1">🎯 <strong>Focus Tips:</strong></p>
            <ul className="text-purple-700 dark:text-purple-300 text-xs space-y-1">
              <li>• Put phone in another room</li>
              <li>• Use noise-canceling headphones</li>
              <li>• Take short breaks every 45-60 minutes</li>
            </ul>
          </div>
        </div>
      )
    },

    // Advanced Features & Tips
    {
      id: 'advanced-tips',
      title: 'Advanced Tips for Success',
      description: 'Here are some pro tips to get the most out of TimePilot.',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-3 text-sm">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="text-indigo-600 dark:text-indigo-400" size={16} />
              <span className="font-semibold text-indigo-800 dark:text-indigo-200">Pro Success Strategies:</span>
            </div>
            <ul className="text-indigo-700 dark:text-indigo-300 space-y-1 text-xs">
              <li>🔄 <strong>Weekly Review:</strong> Check progress every Sunday and adjust</li>
              <li>📊 <strong>Track Patterns:</strong> Notice when you're most productive</li>
              <li>⚡ <strong>Batch Similar Tasks:</strong> Group reading, writing, problem-solving</li>
              <li>🎯 <strong>Start Small:</strong> Begin with 2-3 tasks, then scale up</li>
              <li>🏆 <strong>Celebrate Wins:</strong> Acknowledge completed sessions</li>
            </ul>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
            <p className="font-semibold text-red-800 dark:text-red-200 mb-1">⚠️ <strong>Common Mistakes to Avoid:</strong></p>
            <ul className="text-red-700 dark:text-red-300 text-xs space-y-1">
              <li>• Overestimating daily study capacity</li>
              <li>• Not updating progress regularly</li>
              <li>• Ignoring the suggestions panel</li>
              <li>• Scheduling back-to-back sessions without breaks</li>
            </ul>
          </div>
        </div>
      )
    },

    // Dashboard Overview
    {
      id: 'dashboard-intro',
      title: 'Your Progress Dashboard',
      description: 'Finally, navigate to "Dashboard" to see your progress overview and analytics.',
      targetTab: 'dashboard',
      position: 'center',
      action: 'wait-for-action',
      waitFor: 'tab-changed',
      highlightTab: true,
      requiresAction: true,
      customContent: (
        <div className="space-y-2 text-sm">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
            <p className="text-emerald-800 dark:text-emerald-200 text-xs">
              📊 <strong>Dashboard shows:</strong> Completion rates, time tracking, upcoming deadlines, and productivity insights.
            </p>
          </div>
        </div>
      )
    },

    // Final Step
    {
      id: 'tutorial-complete',
      title: 'Congratulations! You\'re Now a TimePilot Expert! 🎉',
      description: 'You\'ve mastered all the core features. You\'re ready to take control of your study schedule!',
      position: 'center',
      action: 'observe',
      requiresAction: false,
      customContent: (
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <CheckCircle className="text-green-500" size={48} />
          </div>
          <div className="text-center space-y-3">
            <p className="font-semibold text-gray-800 dark:text-gray-200">🎯 Your Action Plan:</p>
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-3 rounded-lg">
              <ol className="text-sm space-y-2 text-left">
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span className="text-gray-700 dark:text-gray-300">Add all your current tasks with realistic time estimates</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span className="text-gray-700 dark:text-gray-300">Input your recurring commitments (classes, work, etc.)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span className="text-gray-700 dark:text-gray-300">Customize settings to match your study preferences</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span className="text-gray-700 dark:text-gray-300">Start your first study session and track progress!</span>
                </li>
              </ol>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-200 text-xs">
                💡 <strong>Remember:</strong> Check the suggestions panel regularly for optimization tips and schedule improvements!
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStep = tutorialSteps[currentStepIndex];

  // Initialize initial tasks count when tutorial starts
  useEffect(() => {
    if (isActive && currentStepIndex === 0) {
      setInitialTasksCount(tasksCount);
      setInitialCommitmentsCount(commitmentsCount);
      setActionCompleted(false);
    }
  }, [isActive, currentStepIndex, tasksCount, commitmentsCount]);

  // Initialize initial study plan mode when tutorial starts
  useEffect(() => {
    if (isActive && currentStepIndex === 0 && currentStudyPlanMode) {
      setInitialStudyPlanMode(currentStudyPlanMode);
    }
  }, [isActive, currentStepIndex, currentStudyPlanMode]);

  // Enhanced task detection with better logic
  useEffect(() => {
    if (currentStep.waitFor === 'task-added') {
      // Check if user has added at least one task since tutorial started
      const hasAddedTask = tasksCount > initialTasksCount;
      
      if (hasAddedTask) {
        setActionCompleted(true);
        // Don't auto-advance, let user click Next
      }
    }
  }, [tasksCount, initialTasksCount, currentStep.waitFor]);

  // Commitment detection logic
  useEffect(() => {
    if (currentStep.waitFor === 'commitment-added') {
      // Check if user has added at least one commitment since tutorial started
      const hasAddedCommitment = commitmentsCount > initialCommitmentsCount;
      
      if (hasAddedCommitment) {
        setActionCompleted(true);
        // Don't auto-advance, let user click Next
      }
    }
  }, [commitmentsCount, initialCommitmentsCount, currentStep.waitFor]);

  // Detect when user changes to the target tab
  useEffect(() => {
    if (currentStep.waitFor === 'tab-changed' && currentStep.targetTab && currentTab === currentStep.targetTab) {
      setActionCompleted(true);
      // Don't auto-advance, let user click Next
    }
  }, [currentTab, currentStep.waitFor, currentStep.targetTab]);

  // Reset action completed when step changes
  useEffect(() => {
    setActionCompleted(false);
  }, [currentStepIndex]);

  // Communicate which tab should be highlighted
  useEffect(() => {
    if (onHighlightTab && currentStep.highlightTab && currentStep.targetTab) {
      onHighlightTab(currentStep.targetTab);
    } else if (onHighlightTab) {
      onHighlightTab(null); // Clear highlighting when not needed
    }
  }, [currentStepIndex, currentStep.highlightTab, currentStep.targetTab, onHighlightTab]);

  // Communicate when study plan mode should be highlighted
  useEffect(() => {
    if (onHighlightStudyPlanMode) {
      // Highlight study plan mode during the study plan mode step
      const shouldHighlight = currentStep.id === 'study-window-settings';
      onHighlightStudyPlanMode(shouldHighlight);
    }
  }, [currentStepIndex, currentStep.id, onHighlightStudyPlanMode]);

  const handleNext = () => {
    if (currentStepIndex < tutorialSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setActionCompleted(false);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setActionCompleted(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  // Check if Next button should be enabled
  const canProceed = () => {
    if (!currentStep.requiresAction) return true;
    
    switch (currentStep.waitFor) {
      case 'task-added':
        return tasksCount > initialTasksCount;
      case 'commitment-added':
        return commitmentsCount > initialCommitmentsCount;
      case 'tab-changed':
        return currentStep.targetTab && currentTab === currentStep.targetTab;
      case 'study-plan-mode-changed':
        return initialStudyPlanMode && currentStudyPlanMode && initialStudyPlanMode !== currentStudyPlanMode;
      case 'timer-session-active':
        return currentStep.targetTab && currentTab === currentStep.targetTab && hasActiveTimerSession;
      default:
        return true;
    }
  };

  const isNextButtonEnabled = canProceed();

  if (!isActive) return null;

  const getTooltipPosition = () => {
    // Always position in the bottom right corner for non-blocking experience
    return 'fixed bottom-4 right-4 z-50';
  };

  return (
    <>
      {/* Tutorial tooltip - positioned in right corner */}
      <div className={getTooltipPosition()}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-80 p-4 relative border border-gray-200 dark:border-gray-700">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>

          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex space-x-1">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full ${
                    index <= currentStepIndex ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {currentStepIndex + 1} of {tutorialSteps.length}
            </span>
          </div>

          {/* Content */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0">
                {currentStep.id.includes('welcome') && <Zap className="text-blue-500" size={20} />}
                {currentStep.id.includes('core-concepts') && <Target className="text-purple-500" size={20} />}
                {currentStep.id.includes('task') && <BookOpen className="text-green-500" size={20} />}
                {currentStep.id.includes('commitment') && <Users className="text-orange-500" size={20} />}
                {currentStep.id.includes('study-plan') && <Calendar className="text-purple-500" size={20} />}
                {currentStep.id.includes('suggestions') && <Lightbulb className="text-yellow-500" size={20} />}
                {currentStep.id.includes('calendar') && <Calendar className="text-blue-500" size={20} />}
                {currentStep.id.includes('settings') && <Settings className="text-orange-500" size={20} />}
                {currentStep.id.includes('missed') && <AlertTriangle className="text-red-500" size={20} />}
                {currentStep.id.includes('session') && <BookOpen className="text-green-500" size={20} />}
                {currentStep.id.includes('timer') && <Clock className="text-red-500" size={20} />}
                {currentStep.id.includes('advanced') && <TrendingUp className="text-indigo-500" size={20} />}
                {currentStep.id.includes('dashboard') && <TrendingUp className="text-emerald-500" size={20} />}
                {currentStep.id.includes('complete') && <CheckCircle className="text-green-500" size={20} />}
              </div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                {currentStep.title}
              </h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              {currentStep.description}
            </p>

            {currentStep.customContent && (
              <div className="mt-3">
                {currentStep.customContent}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-between pt-3">
              <button
                onClick={handlePrevious}
                disabled={currentStepIndex === 0}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <ArrowLeft size={12} />
                <span>Previous</span>
              </button>

              <div className="flex space-x-1">
                <button
                  onClick={handleSkip}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Skip
                </button>
                <button
                  onClick={handleNext}
                  disabled={!isNextButtonEnabled}
                  className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    isNextButtonEnabled 
                      ? 'text-white bg-blue-600 hover:bg-blue-700' 
                      : 'text-gray-400 bg-gray-300 cursor-not-allowed dark:bg-gray-600 dark:text-gray-500'
                  }`}
                >
                  <span>{currentStepIndex === tutorialSteps.length - 1 ? 'Finish' : 'Next'}</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Action required indicator */}
            {currentStep.requiresAction && !isNextButtonEnabled && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-700">
                <div className="flex items-center space-x-2 text-xs text-yellow-700 dark:text-yellow-300">
                  <span>⚠️</span>
                  <span>
                    {currentStep.waitFor === 'task-added' && 'Please add a task to continue'}
                    {currentStep.waitFor === 'commitment-added' && 'Please add a commitment to continue'}
                    {currentStep.waitFor === 'tab-changed' && `Please navigate to the "${currentStep.targetTab}" tab to continue`}
                    {currentStep.waitFor === 'study-plan-mode-changed' && 'Please switch the study plan mode to continue'}
                    {currentStep.waitFor === 'timer-session-active' && 'Please click on a study session to start the timer'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InteractiveTutorial;
