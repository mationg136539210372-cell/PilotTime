import React from 'react';
import { Calendar, Clock, Settings, BarChart3, Zap, Lightbulb, BookOpen, Target } from 'lucide-react';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
  action: 'observe' | 'click' | 'interact';
  requiresAction: boolean;
  customContent?: React.ReactNode;
  targetElement?: string;
}

export const advancedTutorialSteps: TutorialStep[] = [
  // Welcome
  {
    id: 'advanced-welcome',
    title: 'Advanced TimePilot Features 🚀',
    description: 'Perfect! You\'ve mastered the basics. Let\'s explore power-user features that will save you hours of planning time.',
    position: 'center',
    action: 'observe',
    requiresAction: false,
    customContent: (
      <div className="space-y-4 text-sm">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg">
          <p className="font-semibold text-purple-800 dark:text-purple-200 mb-3">🎯 Advanced Features You'll Learn:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Calendar className="text-blue-600 dark:text-blue-400" size={16} />
                <span className="font-medium">Smart Rescheduling</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="text-yellow-600 dark:text-yellow-400" size={16} />
                <span className="font-medium">Time Optimization</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <BarChart3 className="text-green-600 dark:text-green-400" size={16} />
                <span className="font-medium">Progress Analytics</span>
              </div>
              <div className="flex items-center space-x-2">
                <Settings className="text-gray-600 dark:text-gray-400" size={16} />
                <span className="font-medium">Pro Settings</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-300 text-xs">
          💡 These features typically save users 3+ hours per week in planning time!
        </p>
      </div>
    )
  },

  // Calendar Drag & Drop
  {
    id: 'calendar-mastery',
    title: 'Calendar Mastery: Drag & Drop Rescheduling 📅',
    description: 'Learn to effortlessly reschedule sessions by dragging them to new time slots.',
    position: 'center',
    action: 'observe',
    requiresAction: false,
    customContent: (
      <div className="space-y-3 text-sm">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🖱️ Drag & Drop Powers:</p>
          <ul className="space-y-1 text-blue-700 dark:text-blue-300">
            <li>• <strong>Drag sessions</strong> to different time slots</li>
            <li>• <strong>Automatic conflict detection</strong> - prevents overlaps</li>
            <li>• <strong>Visual feedback</strong> - see what works before dropping</li>
            <li>• <strong>Undo support</strong> - easily revert changes</li>
          </ul>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
          <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">⚡ Pro Tips:</p>
          <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
            <li>• Hold sessions only move within the same day</li>
            <li>• Green = valid drop zone, Red = conflict</li>
            <li>• Completed sessions can't be moved</li>
          </ul>
        </div>
      </div>
    )
  },

  // Time Optimization
  {
    id: 'time-optimization',
    title: 'Time Optimization Secrets ⚡',
    description: 'Discover how TimePilot intelligently optimizes your schedule for maximum efficiency.',
    position: 'center',
    action: 'observe',
    requiresAction: false,
    customContent: (
      <div className="space-y-3 text-sm">
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <p className="font-semibold text-green-800 dark:text-green-200 mb-2">🧠 Smart Scheduling Algorithm:</p>
          <ul className="space-y-1 text-green-700 dark:text-green-300 text-xs">
            <li>• <strong>Priority-based:</strong> Important tasks get best time slots</li>
            <li>• <strong>Deadline-aware:</strong> Urgent tasks scheduled first</li>
            <li>• <strong>Energy-optimized:</strong> Hard tasks in peak hours</li>
            <li>• <strong>Break-friendly:</strong> Automatic buffer time</li>
          </ul>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
          <p className="font-semibold text-purple-800 dark:text-purple-200 mb-1">🎯 Optimization Tips:</p>
          <ul className="text-xs text-purple-700 dark:text-purple-400 space-y-1">
            <li>• Mark important tasks as "High Priority"</li>
            <li>• Set realistic deadlines for better scheduling</li>
            <li>• Use study plan modes: Even vs Front-loaded</li>
            <li>• Adjust study window hours to match your energy</li>
          </ul>
        </div>
      </div>
    )
  },

  // Settings Mastery
  {
    id: 'settings-mastery',
    title: 'Settings Mastery: Customize Like a Pro ⚙️',
    description: 'Advanced settings that most users miss but can dramatically improve your schedule quality.',
    position: 'center',
    action: 'observe',
    requiresAction: false,
    customContent: (
      <div className="space-y-3 text-sm">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
          <p className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">🔧 Power User Settings:</p>
          <div className="space-y-2 text-xs">
            <div>
              <p className="font-medium text-indigo-700 dark:text-indigo-300">Study Plan Modes:</p>
              <ul className="text-indigo-600 dark:text-indigo-400 ml-4">
                <li>• <strong>Even:</strong> Spread work evenly across days</li>
                <li>• <strong>Front-loaded:</strong> Finish early, less stress</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-indigo-700 dark:text-indigo-300">Time Windows:</p>
              <ul className="text-indigo-600 dark:text-indigo-400 ml-4">
                <li>• <strong>Study Window:</strong> When you're most productive</li>
                <li>• <strong>Buffer Time:</strong> Breaks between sessions</li>
                <li>• <strong>Max Hours:</strong> Prevent burnout</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  },

  // Analytics Deep Dive
  {
    id: 'analytics-insights',
    title: 'Analytics: Track Your Success 📊',
    description: 'Use progress analytics to identify patterns and optimize your study habits.',
    position: 'center',
    action: 'observe',
    requiresAction: false,
    customContent: (
      <div className="space-y-3 text-sm">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
          <p className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">📈 Key Metrics to Watch:</p>
          <ul className="space-y-1 text-emerald-700 dark:text-emerald-300 text-xs">
            <li>• <strong>Session Completion Rate:</strong> Aim for 80%+ consistency</li>
            <li>• <strong>Time Estimation Accuracy:</strong> Improve over time</li>
            <li>• <strong>Deadline Performance:</strong> Track on-time completion</li>
            <li>• <strong>Study Streaks:</strong> Build momentum with consistency</li>
          </ul>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
          <p className="font-semibold text-orange-800 dark:text-orange-200 mb-1">🎯 Improvement Strategies:</p>
          <ul className="text-xs text-orange-700 dark:text-orange-400 space-y-1">
            <li>• Low completion rate? → Reduce daily hours or session length</li>
            <li>• Poor time estimates? → Break tasks into smaller chunks</li>
            <li>• Missing deadlines? → Use front-loaded study plan mode</li>
          </ul>
        </div>
      </div>
    )
  },

  // Expert Tips
  {
    id: 'expert-tips',
    title: 'Expert-Level Tips & Tricks 🎯',
    description: 'Secret techniques that power users swear by for maximum productivity.',
    position: 'center',
    action: 'observe',
    requiresAction: false,
    customContent: (
      <div className="space-y-3 text-sm">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-lg">
          <p className="font-semibold text-purple-800 dark:text-purple-200 mb-2">🏆 Expert Strategies:</p>
          <div className="space-y-2 text-xs">
            <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded">
              <p className="font-medium text-purple-700 dark:text-purple-300">📝 Task Management:</p>
              <ul className="text-purple-600 dark:text-purple-400 space-y-1">
                <li>• Break large tasks into 2-4 hour chunks</li>
                <li>• Use categories to color-code subjects</li>
                <li>• Add buffer time to your estimates (+20%)</li>
              </ul>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded">
              <p className="font-medium text-blue-700 dark:text-blue-300">⏱️ Timing Optimization:</p>
              <ul className="text-blue-600 dark:text-blue-400 space-y-1">
                <li>• Schedule hardest subjects during peak energy</li>
                <li>• Use shorter sessions (1-2h) for better focus</li>
                <li>• Plan review sessions closer to exams</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  },

  // Completion
  {
    id: 'advanced-complete',
    title: 'You\'re Now a TimePilot Power User! 🎉',
    description: 'Congratulations! You\'ve mastered advanced TimePilot features that will save you hours every week.',
    position: 'center',
    action: 'observe',
    requiresAction: false,
    customContent: (
      <div className="space-y-4 text-sm text-center">
        <div className="text-6xl">🎉</div>
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg">
          <p className="font-semibold text-green-800 dark:text-green-200 mb-3">🎯 You Now Know How To:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <ul className="space-y-1 text-green-700 dark:text-green-300">
              <li>✅ Master drag & drop rescheduling</li>
              <li>✅ Optimize time allocation</li>
              <li>✅ Use advanced settings</li>
            </ul>
            <ul className="space-y-1 text-blue-700 dark:text-blue-300">
              <li>✅ Interpret progress analytics</li>
              <li>✅ Apply expert strategies</li>
              <li>✅ Save 3+ hours/week on planning</li>
            </ul>
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
          <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">🚀 Next Steps:</p>
          <p className="text-yellow-700 dark:text-yellow-400 text-xs">
            Put these techniques into practice and watch your productivity soar!
            Remember: consistency beats perfection. 
          </p>
        </div>
      </div>
    )
  }
];
