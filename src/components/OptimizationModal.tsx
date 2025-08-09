import React from 'react';
import { Lightbulb, AlertTriangle, Clock, Calendar, Settings, Target, Star, Zap, TrendingUp, Users, Calendar as CalendarIcon, X } from 'lucide-react';
import { getAccurateUnscheduledTasks, createNotificationSummary, UnscheduledTaskNotification } from '../utils/enhanced-notifications';
import { Task, StudyPlan, UserSettings, FixedCommitment } from '../types';

interface OptimizationModalProps {
  tasks: Task[];
  studyPlans: StudyPlan[];
  settings: UserSettings;
  fixedCommitments: FixedCommitment[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

const OptimizationModal: React.FC<OptimizationModalProps> = ({ 
  tasks, 
  studyPlans, 
  settings, 
  fixedCommitments,
  isOpen,
  onClose,
  onUpdateSettings
}) => {
  // Use enhanced notification system for accurate unscheduled detection
  const unscheduledTasks = getAccurateUnscheduledTasks(tasks, studyPlans, settings);
  const notificationSummary = createNotificationSummary(unscheduledTasks);

  // Helper function to convert minutes to hours and minutes
  const formatTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) {
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${m}m`;
  };

  const getUrgencyIcon = (urgencyLevel: UnscheduledTaskNotification['urgencyLevel']) => {
    switch (urgencyLevel) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Calendar className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Target className="w-4 h-4 text-blue-500" />;
      default:
        return <Lightbulb className="w-4 h-4 text-gray-500" />;
    }
  };

  const getUrgencyBg = (urgencyLevel: UnscheduledTaskNotification['urgencyLevel']) => {
    switch (urgencyLevel) {
      case 'critical':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800';
    }
  };

  // Don't show modal if not open or no unscheduled tasks
  if (!isOpen || unscheduledTasks.length === 0) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full dark:bg-blue-800/30">
                <Lightbulb className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  Study Plan Optimization
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {notificationSummary.totalUnscheduledTasks} task{notificationSummary.totalUnscheduledTasks > 1 ? 's' : ''} need attention • {formatTime(notificationSummary.totalUnscheduledMinutes)} unscheduled
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              {unscheduledTasks.map((taskNotification, index) => {
                const daysUntilDeadline = Math.ceil((new Date(taskNotification.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={taskNotification.taskId} className={`border rounded-lg p-4 ${getUrgencyBg(taskNotification.urgencyLevel)}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-1 rounded-full flex-shrink-0 ${
                        taskNotification.urgencyLevel === 'critical' ? 'bg-red-100 dark:bg-red-800/30' :
                        taskNotification.urgencyLevel === 'high' ? 'bg-orange-100 dark:bg-orange-800/30' :
                        taskNotification.urgencyLevel === 'medium' ? 'bg-yellow-100 dark:bg-yellow-800/30' :
                        'bg-blue-100 dark:bg-blue-800/30'
                      }`}>
                        {getUrgencyIcon(taskNotification.urgencyLevel)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                            {taskNotification.taskTitle}
                          </h4>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            taskNotification.urgencyLevel === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200' :
                            taskNotification.urgencyLevel === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200' :
                            taskNotification.urgencyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                          }`}>
                            {taskNotification.urgencyLevel.charAt(0).toUpperCase() + taskNotification.urgencyLevel.slice(1)} Priority
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span className="font-medium">{formatTime(taskNotification.unscheduledMinutes)}</span> unscheduled of {formatTime(taskNotification.estimatedHours * 60)} total
                          <span className="mx-2">•</span>
                          <span className={daysUntilDeadline <= 1 ? 'text-red-600 dark:text-red-400 font-medium' : 
                                         daysUntilDeadline <= 3 ? 'text-orange-600 dark:text-orange-400' : 
                                         'text-gray-600 dark:text-gray-400'}>
                            Due in {daysUntilDeadline} day{daysUntilDeadline !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                          {taskNotification.reason}
                        </div>
                        
                        {taskNotification.suggestedActions && taskNotification.suggestedActions.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200">Suggested Actions:</h5>
                            <div className="flex flex-wrap gap-2">
                              {taskNotification.suggestedActions.map((action, actionIndex) => (
                                <button
                                  key={actionIndex}
                                  onClick={() => {
                                    // Handle action based on type
                                    if (action.includes('daily available hours')) {
                                      const match = action.match(/to (\d+\.?\d*) hours/);
                                      if (match) {
                                        const newHours = parseFloat(match[1]);
                                        onUpdateSettings({ dailyAvailableHours: newHours });
                                      }
                                    } else if (action.includes('extend deadline')) {
                                      // Could trigger a deadline extension dialog
                                      console.log('Extend deadline action:', action);
                                    }
                                  }}
                                  className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-800 dark:text-blue-200 rounded-lg transition-colors"
                                >
                                  {action}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationModal;
