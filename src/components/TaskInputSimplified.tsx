import React, { useState, useEffect } from 'react';
import { Plus, Info, HelpCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Task, UserSettings } from '../types';
import { checkFrequencyDeadlineConflict } from '../utils/scheduling';
import TimeEstimationModal from './TimeEstimationModal';

interface TaskInputProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
  userSettings: UserSettings;
}

const TaskInputSimplified: React.FC<TaskInputProps> = ({ onAddTask, onCancel, userSettings }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    estimatedHours: '',
    estimatedMinutes: '0',
    category: '',
    customCategory: '',
    impact: '',
    taskType: '',
    deadlineType: 'hard' as 'hard' | 'soft' | 'none',
    schedulingPreference: 'consistent' as 'consistent' | 'opportunistic' | 'intensive',
    targetFrequency: 'daily' as 'daily' | 'weekly' | '3x-week' | 'flexible',
    respectFrequencyForDeadlines: true,
    preferredTimeSlots: [] as ('morning' | 'afternoon' | 'evening')[],
    minWorkBlock: 30,
    isOneTimeTask: false,
  });

  const [showTimeEstimationModal, setShowTimeEstimationModal] = useState(false);
  const [showTaskTimeline, setShowTaskTimeline] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Auto-detect deadline type based on whether deadline is set
  useEffect(() => {
    if (formData.deadline && formData.deadline.trim() !== '') {
      // User set a deadline - keep current deadlineType or default to 'hard'
      if (formData.deadlineType === 'none') {
        setFormData(f => ({ ...f, deadlineType: 'hard' }));
      }
    } else {
      // No deadline set - automatically set to 'none'
      setFormData(f => ({ ...f, deadlineType: 'none' }));
    }
  }, [formData.deadline]);

  // Reset conflicting options when one-sitting task is toggled
  useEffect(() => {
    if (formData.isOneTimeTask) {
      // One-sitting tasks don't need frequency preferences
      setFormData(f => ({ ...f, targetFrequency: 'daily' }));
    }
  }, [formData.isOneTimeTask]);

  // Validation functions
  const convertToDecimalHours = (hours: string, minutes: string): number => {
    return parseInt(hours || '0') + parseInt(minutes || '0') / 60;
  };

  const convertFromDecimalHours = (decimalHours: number): { hours: string; minutes: string } => {
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return { hours: h.toString(), minutes: m.toString() };
  };

  const formatTimeDisplay = (hours: string, minutes: string): string => {
    const h = parseInt(hours || '0');
    const m = parseInt(minutes || '0');
    if (h === 0 && m === 0) return '0m';
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  // Handle category custom
  const showCustomCategory = formData.category === 'Custom...';

  // Validation
  const isTitleValid = formData.title.trim().length > 0;
  const isTitleLengthValid = formData.title.trim().length <= 100;
  const isDeadlineValid = !formData.deadline || new Date(formData.deadline) >= new Date(today);
  const totalTime = convertToDecimalHours(formData.estimatedHours, formData.estimatedMinutes);
  const isEstimatedValid = totalTime > 0;
  const isEstimatedReasonable = totalTime <= 100;
  const isImpactValid = formData.impact !== '';
  const isCustomCategoryValid = !showCustomCategory || (formData.customCategory && formData.customCategory.trim().length > 0 && formData.customCategory.trim().length <= 50);

  const isFormValid = isTitleValid && isTitleLengthValid && isDeadlineValid && 
                     isEstimatedValid && isEstimatedReasonable && isImpactValid && isCustomCategoryValid;

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (!isTitleValid) errors.push('Task title is required');
    if (!isTitleLengthValid) errors.push('Task title must be 100 characters or less');
    if (!isDeadlineValid) errors.push('Deadline cannot be in the past');
    if (!isEstimatedValid) errors.push('Estimated time must be greater than 0');
    if (!isEstimatedReasonable) errors.push('Estimated time seems unreasonably high (over 100 hours)');
    if (!isImpactValid) errors.push('Please select task importance');
    if (!isCustomCategoryValid) errors.push('Custom category must be between 1-50 characters');
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    const category = showCustomCategory ? formData.customCategory : formData.category;
    const decimalHours = convertToDecimalHours(formData.estimatedHours, formData.estimatedMinutes);
    
    onAddTask({
      title: formData.title.trim(),
      description: formData.description.trim(),
      deadline: formData.deadline || '',
      estimatedHours: decimalHours,
      category,
      impact: formData.impact,
      status: 'pending',
      priority: formData.impact === 'high',
      importance: formData.impact === 'high',
      deadlineType: formData.deadlineType,
      schedulingPreference: formData.schedulingPreference,
      targetFrequency: formData.targetFrequency,
      respectFrequencyForDeadlines: formData.respectFrequencyForDeadlines,
      preferredTimeSlots: formData.preferredTimeSlots,
      minWorkBlock: formData.minWorkBlock,
      isOneTimeTask: formData.isOneTimeTask,
    });
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      deadline: '',
      estimatedHours: '',
      estimatedMinutes: '0',
      category: '',
      customCategory: '',
      impact: '',
      taskType: '',
      deadlineType: 'hard',
      schedulingPreference: 'consistent',
      targetFrequency: 'daily',
      respectFrequencyForDeadlines: true,
      preferredTimeSlots: [],
      minWorkBlock: 30,
      isOneTimeTask: false,
    });
  };

  const handleTimeEstimationUpdate = (hours: string, minutes: string, taskType: string) => {
    setFormData(f => ({ 
      ...f, 
      estimatedHours: hours, 
      estimatedMinutes: minutes,
      taskType: taskType 
    }));
  };

  return (
    <div className="backdrop-blur-md bg-white/80 dark:bg-black/40 rounded-3xl shadow-2xl shadow-purple-500/10 p-8 border border-white/20 dark:border-white/10 max-w-2xl mx-auto task-input-section relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-400/20 to-purple-500/20 rounded-full blur-xl"></div>
      <div className="relative">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-6 flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Plus className="text-white" size={18} />
          </div>
          <span>Add New Task</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Title & Description - Compact Layout */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-black/20 border border-white/30 dark:border-white/20 rounded-xl text-base focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:text-white transition-all duration-300"
                placeholder="e.g., Write project report"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Description <span className="text-gray-400">(Optional)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 backdrop-blur-sm bg-white/70 dark:bg-black/20 border border-white/30 dark:border-white/20 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:text-white transition-all duration-300 resize-none"
                placeholder="Add any additional details..."
                rows={2}
              />
            </div>
          </div>

          {/* Category & Deadline - Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Category <span className="text-gray-400">(Optional)</span>
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData(f => ({ ...f, category: e.target.value, customCategory: '' }))}
                className="w-full border border-white/30 dark:border-white/20 rounded-xl px-3 py-2 text-sm bg-white/70 dark:bg-black/20 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Select category...</option>
                {['Academics', 'Org', 'Work', 'Personal', 'Health', 'Learning', 'Finance', 'Home', 'Custom...'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {showCustomCategory && (
                <input
                  type="text"
                  value={formData.customCategory}
                  onChange={e => setFormData(f => ({ ...f, customCategory: e.target.value }))}
                  className="w-full border border-white/30 dark:border-white/20 rounded-xl px-3 py-2 mt-2 text-sm bg-white/70 dark:bg-black/20 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Enter custom category"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Deadline <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="date"
                min={today}
                value={formData.deadline}
                onChange={e => setFormData(f => ({ ...f, deadline: e.target.value }))}
                className="w-full px-3 py-2 border border-white/30 dark:border-white/20 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white/70 dark:bg-black/20 dark:text-white"
                placeholder="Select deadline (optional)"
              />
              {!isDeadlineValid && formData.deadline && (
                <div className="text-red-600 text-xs mt-1">
                  Deadline cannot be in the past. Please select today or a future date.
                </div>
              )}
            </div>
          </div>

          {/* Time Estimation - Simplified Display */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              Time Estimation <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-3">
              <div className="flex-1 p-3 border border-white/30 dark:border-white/20 rounded-xl bg-white/70 dark:bg-black/20">
                <div className="text-lg font-medium text-gray-800 dark:text-white">
                  {totalTime > 0 ? formatTimeDisplay(formData.estimatedHours, formData.estimatedMinutes) : 'Not set'}
                </div>
                {formData.taskType && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Task type: {formData.taskType}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowTimeEstimationModal(true)}
                className="flex items-center space-x-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors"
              >
                <Clock size={18} />
                <span>Estimate</span>
              </button>
            </div>
          </div>

          {/* One-time task option */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isOneTimeTask}
                onChange={e => setFormData(f => ({ ...f, isOneTimeTask: e.target.checked }))}
                className="text-violet-600 rounded focus:ring-violet-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">
                Complete this task in one sitting (don't divide into sessions)
              </span>
            </label>
            {formData.isOneTimeTask && (
              <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border-l-2 border-blue-300 dark:border-blue-600">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  💡 One-sitting tasks will be scheduled as single blocks. Work frequency settings won't apply.
                </p>
              </div>
            )}
          </div>

          {/* Task Impact */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              Task Importance <span className="text-red-500">*</span>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="text-gray-400 hover:text-violet-600 transition-colors"
                title="Help & Information"
              >
                <HelpCircle size={14} />
              </button>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 border border-white/30 dark:border-white/20 rounded-xl hover:bg-white/50 dark:hover:bg-black/30 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="impact"
                  value="high"
                  checked={formData.impact === 'high'}
                  onChange={() => setFormData(f => ({ ...f, impact: 'high' }))}
                  className="text-violet-600"
                />
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-white">🔥 Important</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">High priority, scheduled first</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-white/30 dark:border-white/20 rounded-xl hover:bg-white/50 dark:hover:bg-black/30 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="impact"
                  value="low"
                  checked={formData.impact === 'low'}
                  onChange={() => setFormData(f => ({ ...f, impact: 'low' }))}
                  className="text-violet-600"
                />
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-white">📋 Standard</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Normal priority</div>
                </div>
              </label>
            </div>
          </div>

          {/* Work Frequency Preference */}
          {!formData.isOneTimeTask && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                How often would you like to work on this?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'daily', label: '📅 Daily progress', desc: 'Work a bit each day' },
                  { value: '3x-week', label: '🗓️ Few times per week', desc: 'Every 2-3 days' },
                  { value: 'weekly', label: '📆 Weekly sessions', desc: 'Once per week' },
                  { value: 'flexible', label: '⏰ When I have time', desc: 'Flexible scheduling' }
                ].map(option => (
                  <label key={option.value} className={`flex flex-col p-3 border border-white/30 dark:border-white/20 rounded-xl hover:bg-white/50 dark:hover:bg-black/30 cursor-pointer transition-colors ${
                    formData.targetFrequency === option.value ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-600' : ''
                  }`}>
                    <input
                      type="radio"
                      name="targetFrequency"
                      value={option.value}
                      checked={formData.targetFrequency === option.value}
                      onChange={() => setFormData(f => ({ ...f, targetFrequency: option.value as any }))}
                      className="sr-only"
                    />
                    <div className="text-sm font-medium text-gray-800 dark:text-white">{option.label}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{option.desc}</div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Timeline Options */}
          <div>
            <button
              type="button"
              onClick={() => setShowTaskTimeline(!showTaskTimeline)}
              className="flex items-center gap-2 text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 text-sm font-medium transition-colors"
            >
              {showTaskTimeline ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Advanced Options
            </button>

            {showTaskTimeline && (
              <div className="mt-3 p-4 bg-white/30 dark:bg-black/20 rounded-xl border border-white/20 dark:border-white/10">
                {/* Deadline Type - Only show if deadline is set */}
                {formData.deadline && formData.deadline.trim() !== '' && (
                  <div className="space-y-2 mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Deadline Type</label>
                    <div className="space-y-2">
                      {[
                        { value: 'hard', label: 'Hard deadline (must finish by date)' },
                        { value: 'soft', label: 'Flexible target date' }
                      ].map(option => (
                        <label key={option.value} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="deadlineType"
                            value={option.value}
                            checked={formData.deadlineType === option.value}
                            onChange={() => setFormData(f => ({ ...f, deadlineType: option.value as any }))}
                            className="text-violet-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-200">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scheduling Preference */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Scheduling Style</label>
                  <div className="space-y-2">
                    {[
                      { value: 'consistent', label: 'Consistent sessions (recommended)' },
                      { value: 'opportunistic', label: 'Fill available time slots' },
                      { value: 'intensive', label: 'Intensive bursts when possible' }
                    ].map(option => (
                      <label key={option.value} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="schedulingPreference"
                          value={option.value}
                          checked={formData.schedulingPreference === option.value}
                          onChange={() => setFormData(f => ({ ...f, schedulingPreference: option.value as any }))}
                          className="text-violet-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-200">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation Feedback */}
          {!isFormValid && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2 dark:bg-red-900/20 dark:border-red-700">
              <div className="text-red-800 dark:text-red-200 font-medium mb-2">Please fill in the required fields:</div>
              <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                {getValidationErrors().map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={!isFormValid}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 ${
                isFormValid
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Add Task
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Time Estimation Modal */}
        <TimeEstimationModal
          isOpen={showTimeEstimationModal}
          onClose={() => setShowTimeEstimationModal(false)}
          taskType={formData.taskType}
          category={formData.category}
          initialHours={formData.estimatedHours}
          initialMinutes={formData.estimatedMinutes}
          deadline={formData.deadline}
          onEstimateUpdate={handleTimeEstimationUpdate}
        />
      </div>
    </div>
  );
};

export default TaskInputSimplified;
