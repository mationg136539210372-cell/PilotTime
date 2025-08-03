import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Info, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Task, UserSettings } from '../types';
import { checkFrequencyDeadlineConflict } from '../utils/scheduling';
import EnhancedEstimationHelper from './EnhancedEstimationHelper';

interface TaskInputProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
  userSettings: UserSettings;
}



// Task type-specific estimation helper config
const EST_HELPER_CONFIG = {
  Writing: {
    base: 3,
    complexity: [
      { key: 'simple', label: 'Simple/familiar topic (no adjustment)', percent: 0 },
      { key: 'complex', label: 'Complex topic (+30%)', percent: 30 },
      { key: 'research', label: 'Research required first (+50%)', percent: 50 },
    ],
    factors: [
      { key: 'sources', label: 'Need to find sources (+25%)', percent: 25 },
      { key: 'drafts', label: 'Multiple drafts expected (+40%)', percent: 40 },
      { key: 'citations', label: 'Citations/formatting required (+15%)', percent: 15 },
      { key: 'editing', label: 'Editing/proofreading (+20%)', percent: 20 },
    ],
  },
  Learning: {
    base: 4,
    complexity: [
      { key: 'review', label: 'Review familiar content (no adjustment)', percent: 0 },
      { key: 'related', label: 'New but related topic (+25%)', percent: 25 },
      { key: 'new', label: 'Completely new subject (+50%)', percent: 50 },
    ],
    factors: [
      { key: 'notes', label: 'Need to take notes (+20%)', percent: 20 },
      { key: 'practice', label: 'Practice problems included (+30%)', percent: 30 },
      { key: 'guides', label: 'Create study guides (+25%)', percent: 25 },
      { key: 'memorization', label: 'Memorization required (+35%)', percent: 35 },
    ],
  },
  Planning: {
    base: 2,
    complexity: [
      { key: 'simple', label: 'Simple planning (no adjustment)', percent: 0 },
      { key: 'multi', label: 'Multi-step process (+30%)', percent: 30 },
      { key: 'coordination', label: 'Involves coordination with others (+50%)', percent: 50 },
    ],
    factors: [
      { key: 'research', label: 'Research options needed (+40%)', percent: 40 },
      { key: 'budget', label: 'Budget calculations (+20%)', percent: 20 },
      { key: 'stakeholders', label: 'Multiple stakeholders (+35%)', percent: 35 },
      { key: 'docs', label: 'Documentation required (+25%)', percent: 25 },
    ],
  },
  Creating: {
    base: 5,
    complexity: [
      { key: 'template', label: 'Using existing templates (no adjustment)', percent: 0 },
      { key: 'original', label: 'Original design (+40%)', percent: 40 },
      { key: 'newconcept', label: 'Completely new concept (+60%)', percent: 60 },
    ],
    factors: [
      { key: 'iterations', label: 'Multiple iterations expected (+50%)', percent: 50 },
      { key: 'feedback', label: 'Feedback rounds included (+30%)', percent: 30 },
      { key: 'learning', label: 'Technical learning needed (+40%)', percent: 40 },
      { key: 'approval', label: 'Client approval process (+25%)', percent: 25 },
    ],
  },
  Administrative: {
    base: 1,
    complexity: [
      { key: 'routine', label: 'Routine process (no adjustment)', percent: 0 },
      { key: 'unfamiliar', label: 'Unfamiliar forms/systems (+40%)', percent: 40 },
      { key: 'multi', label: 'Multiple steps/approvals (+60%)', percent: 60 },
    ],
    factors: [
      { key: 'waiting', label: 'Waiting time for responses (+100%)', percent: 100 },
      { key: 'docs', label: 'Document gathering needed (+50%)', percent: 50 },
      { key: 'calls', label: 'Phone calls required (+30%)', percent: 30 },
      { key: 'locations', label: 'Multiple locations/websites (+25%)', percent: 25 },
    ],
  },
};

// Map UI dropdown values to config keys
const TASK_TYPE_MAP: Record<string, keyof typeof EST_HELPER_CONFIG> = {
  Writing: 'Writing',
  Learning: 'Learning',
  Planning: 'Planning',
  Creating: 'Creating',
  'Deep Focus Work': 'Learning', // treat as Learning for now
  Administrative: 'Administrative',
  Communicating: 'Administrative', // treat as Administrative for now
};

const TaskInput: React.FC<TaskInputProps> = ({ onAddTask, onCancel, userSettings }) => {
  const [showEstimationHelper, setShowEstimationHelper] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    estimatedHours: '',
    estimatedMinutes: '0', // Add minutes field
    category: '',
    customCategory: '',
    impact: '', // 'high' or 'low'
    taskType: '',
    // New fields for deadline flexibility
    deadlineType: 'hard' as 'hard' | 'soft' | 'none',
    schedulingPreference: 'consistent' as 'consistent' | 'opportunistic' | 'intensive',
    targetFrequency: 'daily' as 'daily' | 'weekly' | '3x-week' | 'flexible', // Default to daily for all tasks
    respectFrequencyForDeadlines: true, // Default to respecting frequency preference
    preferredTimeSlots: [] as ('morning' | 'afternoon' | 'evening')[],
    minWorkBlock: 30, // Default 30 minutes
    isOneTimeTask: false, // New field for one-time tasks
  });
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showTimePresets, setShowTimePresets] = useState(false);
  const [showTaskTimeline, setShowTaskTimeline] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showImportanceHelpModal, setShowImportanceHelpModal] = useState(false);
  const [estBase, setEstBase] = useState(formData.estimatedHours || '1');
  // Remove estAdjusted state, use only local let estAdjusted
  const estimationHelperRef = useRef<HTMLDivElement>(null);

  // Estimation Helper state
  const [estComplexity, setEstComplexity] = useState('');
  const [estFactors, setEstFactors] = useState<string[]>([]);

  // When task type changes, reset helper state
  useEffect(() => {
    setEstComplexity('');
    setEstFactors([]);
  }, [formData.taskType, showEstimationHelper]);

  // Get config for selected type
  const estConfig = EST_HELPER_CONFIG[TASK_TYPE_MAP[formData.taskType] || 'Writing'];

  // Calculate adjusted estimate
  let estAdjusted = Number(estBase) || 1;
  const selectedComplexity = estConfig?.complexity.find(opt => opt.key === estComplexity) || estConfig?.complexity[0];
  if (selectedComplexity) {
    estAdjusted = estAdjusted * (1 + selectedComplexity.percent / 100);
  }
  estFactors.forEach(key => {
    const factor = estConfig?.factors.find(f => f.key === key);
    if (factor) {
      estAdjusted = estAdjusted * (1 + factor.percent / 100);
    }
  });

  // Helper function to convert hours and minutes to decimal hours
  const convertToDecimalHours = (hours: string, minutes: string): number => {
    const h = parseFloat(hours) || 0;
    const m = parseFloat(minutes) || 0;
    return h + (m / 60);
  };

  // Helper function to format time display
  const formatTimeDisplay = (hours: string, minutes: string): string => {
    const h = parseFloat(hours) || 0;
    const m = parseFloat(minutes) || 0;
    const totalMinutes = h * 60 + m;
    
    if (totalMinutes === 0) return '0 minutes';
    if (totalMinutes < 60) return `${totalMinutes} minutes`;
    
    const displayHours = Math.floor(totalMinutes / 60);
    const displayMinutes = totalMinutes % 60;
    
    if (displayMinutes === 0) return `${displayHours} hour${displayHours !== 1 ? 's' : ''}`;
    return `${displayHours}h ${displayMinutes}m`;
  };

  // Helper function to convert decimal hours back to hours and minutes
  const convertFromDecimalHours = (decimalHours: number): { hours: string, minutes: string } => {
    const totalMinutes = Math.round(decimalHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours: hours.toString(), minutes: minutes.toString() };
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];
  
  // Handle category custom
  const showCustomCategory = formData.category === 'Custom...';

  // Check for deadline conflict with frequency preference
  const deadlineConflict = useMemo(() => {
    if (!formData.deadline || formData.deadlineType === 'none') {
      return { hasConflict: false };
    }
    
    const taskForCheck = {
      deadline: formData.deadline,
      estimatedHours: convertToDecimalHours(formData.estimatedHours, formData.estimatedMinutes),
      targetFrequency: formData.targetFrequency,
      deadlineType: formData.deadlineType,
      minWorkBlock: formData.minWorkBlock
    };
    
    return checkFrequencyDeadlineConflict(taskForCheck, userSettings);
  }, [formData.deadline, formData.estimatedHours, formData.estimatedMinutes, formData.targetFrequency, formData.deadlineType, formData.minWorkBlock, userSettings]);

  // Enhanced validation with better error messages
  const isTitleValid = formData.title.trim().length > 0;
  const isTitleLengthValid = formData.title.trim().length <= 100; // Max 100 characters
  // Deadline is always optional now
  const isDeadlineValid = true; // Always valid since deadline is optional
  const isDeadlineNotPast = formData.deadline ? formData.deadline >= today : true;
  const totalTime = convertToDecimalHours(formData.estimatedHours, formData.estimatedMinutes);
  const isEstimatedValid = totalTime > 0;
  const isEstimatedReasonable = totalTime <= 24; // Max 24 hours per task
  const isImpactValid = formData.impact !== '';
  const isCustomCategoryValid = !showCustomCategory || (formData.customCategory && formData.customCategory.trim().length > 0 && formData.customCategory.trim().length <= 50);

  const isFormValid = isTitleValid && isTitleLengthValid && isDeadlineValid && isDeadlineNotPast && 
                     isEstimatedValid && isEstimatedReasonable && isImpactValid && isCustomCategoryValid;

  // Enhanced validation messages
  const getValidationErrors = () => {
    const errors = [];
    
    if (!isTitleValid) {
      errors.push('Task title');
    } else if (!isTitleLengthValid) {
      errors.push('Task title must be 100 characters or less');
    }
    
    if (!isDeadlineNotPast) {
      errors.push('Date cannot be in the past');
    }
    
    if (!isEstimatedValid) {
      errors.push('Estimated time must be greater than 0');
    } else if (!isEstimatedReasonable) {
      errors.push('Estimated time cannot exceed 24 hours');
    }
    
    if (!isImpactValid) {
      errors.push('Priority level');
    }
    
    if (showCustomCategory && !isCustomCategoryValid) {
      errors.push('Custom category must be between 1-50 characters');
    }
    
    return errors;
  };

  // --- Add warning for low-priority urgent tasks ---
  const isLowPriorityUrgent = useMemo(() => {
    if (formData.impact !== 'low' || !formData.deadline) return false;
    const deadlineDate = new Date(formData.deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline <= 3;
  }, [formData.impact, formData.deadline]);

  // When estimation helper is shown, expand more options and scroll to helper
  const handleShowEstimationHelper = () => {
    setShowMoreOptions(true);
    setShowEstimationHelper(true);
    setTimeout(() => {
      estimationHelperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    const category = showCustomCategory ? formData.customCategory : formData.category;
    const decimalHours = convertToDecimalHours(formData.estimatedHours, formData.estimatedMinutes);
    onAddTask({
      title: formData.title,
      description: formData.description,
      deadline: formData.deadline || '', // Use empty string if no deadline provided
      estimatedHours: decimalHours,
      category,
      impact: formData.impact,
      taskType: formData.taskType,
      status: 'pending',
      importance: formData.impact === 'high',
      // New fields for deadline flexibility
      deadlineType: formData.deadline ? formData.deadlineType : 'none',
      schedulingPreference: formData.schedulingPreference,
      targetFrequency: formData.targetFrequency,
      respectFrequencyForDeadlines: formData.respectFrequencyForDeadlines,
      preferredTimeSlots: formData.preferredTimeSlots,
      minWorkBlock: formData.minWorkBlock,
      isOneTimeTask: formData.isOneTimeTask,
    });
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
      targetFrequency: 'daily', // Reset to daily default
      respectFrequencyForDeadlines: true,
      preferredTimeSlots: [],
      minWorkBlock: 30,
      isOneTimeTask: false,
    });
    setShowEstimationHelper(false);
    setShowMoreOptions(false);
  };

  // Time preset buttons
  const timePresets = [
    { label: '15m', hours: '0', minutes: '15' },
    { label: '30m', hours: '0', minutes: '30' },
    { label: '45m', hours: '0', minutes: '45' },
    { label: '1h', hours: '1', minutes: '0' },
    { label: '1h 30m', hours: '1', minutes: '30' },
    { label: '2h', hours: '2', minutes: '0' },
    { label: '3h', hours: '3', minutes: '0' },
  ];

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
        {/* Task Title & Deadline Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Task Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formData.title}
              onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
              className={`w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-black/20 border border-white/30 dark:border-white/20 rounded-xl text-base focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:text-white transition-all duration-300`}
              placeholder="e.g., Write project report"
            />
          </div>
            <div>
            {/* Simple deadline input with one-time task option */}
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Deadline <span className="text-gray-400">(Optional)</span></label>
            <input
              type="date"
              min={today}
              value={formData.deadline}
              onChange={e => setFormData(f => ({ ...f, deadline: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:text-white ${!isDeadlineNotPast && formData.deadline ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Select deadline (optional)"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave empty for flexible tasks, or set a deadline for time-sensitive work</div>
            {!isDeadlineNotPast && formData.deadline && (
              <div className="text-red-600 text-xs mt-1">Deadline cannot be in the past. Please select today or a future date.</div>
            )}

            {/* One-time task option */}
            <div className="mt-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isOneTimeTask}
                  onChange={e => setFormData(f => ({ ...f, isOneTimeTask: e.target.checked }))}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">Complete this task in one sitting (don't divide into sessions)</span>
              </label>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Check this for short tasks or tasks that need to be done all at once
                {formData.isOneTimeTask && formData.deadline && (
                  <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border-l-2 border-blue-300 dark:border-blue-600">
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>📅 Scheduling Note:</strong>
                      {formData.impact === 'high' ? (
                        <span> High-impact one-sitting tasks are scheduled as early as possible for maximum priority.</span>
                      ) : (
                        <span> Low-impact one-sitting tasks are scheduled on their deadline day (respecting buffer days), or the closest available day.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Task Timeline Toggle Button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowTaskTimeline(!showTaskTimeline)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
              >
                {showTaskTimeline ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Advanced Timeline Options
              </button>

              {/* Task Timeline Section - Collapsible */}
              {showTaskTimeline && (
                <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Task Timeline Options</span>
                    <button
                      type="button"
                      onClick={() => setShowHelpModal(true)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Help & Information"
                    >
                      <HelpCircle size={16} />
                    </button>
                  </div>

                  {/* Deadline Type Selection */}
                  <div className="space-y-2 mb-4">
                    <label className="flex items-center gap-3 p-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="deadlineType"
                        value="hard"
                        checked={formData.deadlineType === 'hard'}
                        onChange={() => setFormData(f => ({ ...f, deadlineType: 'hard' }))}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-white">Hard deadline (must finish by date)</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="deadlineType"
                        value="soft"
                        checked={formData.deadlineType === 'soft'}
                        onChange={() => setFormData(f => ({ ...f, deadlineType: 'soft' }))}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-white">Flexible target date</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="deadlineType"
                        value="none"
                        checked={formData.deadlineType === 'none'}
                        onChange={() => setFormData(f => ({ ...f, deadlineType: 'none' }))}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-white">No deadline (work when time allows)</div>
                      </div>
                    </label>
                  </div>

                  {/* Work frequency preference - now applies to ALL tasks */}
                  <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Work frequency preference</label>
                      <select
                        value={formData.targetFrequency}
                        onChange={e => setFormData(f => ({ ...f, targetFrequency: e.target.value as any }))}
                        className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-800 dark:text-white"
                      >
                        <option value="daily">Daily progress (default)</option>
                        <option value="3x-week">Few times per week</option>
                        <option value="weekly">Weekly sessions</option>
                        <option value="flexible">When I have time</option>
                      </select>
                      
                      {/* Show warning if frequency conflicts with deadline */}
                      {deadlineConflict.hasConflict && (
                        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded text-xs text-amber-700 dark:text-amber-200">
                          <div className="flex items-start gap-1">
                            <span className="text-amber-600 dark:text-amber-400">⚠️</span>
                            <div>
                              <div className="font-medium">Frequency preference may not allow completion before deadline</div>
                              <div className="mt-1">{deadlineConflict.reason}</div>
                              {deadlineConflict.recommendedFrequency && (
                                <div className="mt-1">
                                  <strong>Recommended:</strong> Switch to "{deadlineConflict.recommendedFrequency}" frequency, or daily scheduling will be used instead.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional preferences for no-deadline tasks */}
                    {formData.deadlineType === 'none' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Preferred time</label>
                          <div className="flex gap-2">
                            {['morning', 'afternoon', 'evening'].map(timeSlot => (
                              <label key={timeSlot} className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={formData.preferredTimeSlots.includes(timeSlot as any)}
                                  onChange={e => {
                                    const timeSlots = formData.preferredTimeSlots;
                                    if (e.target.checked) {
                                      setFormData(f => ({ ...f, preferredTimeSlots: [...timeSlots, timeSlot as any] }));
                                    } else {
                                      setFormData(f => ({ ...f, preferredTimeSlots: timeSlots.filter(t => t !== timeSlot) }));
                                    }
                                  }}
                                />
                                <span className="capitalize text-xs text-gray-700 dark:text-gray-300">{timeSlot}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Minimum session</label>
                          <select
                            value={formData.minWorkBlock}
                            onChange={e => setFormData(f => ({ ...f, minWorkBlock: parseInt(e.target.value) }))}
                            className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-800 dark:text-white"
                          >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={90}>1.5 hours</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
              </div>
            </div>
        {/* Description */}
            <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Description <span className="text-gray-400">(Optional)</span></label>
          <textarea
            value={formData.description}
            onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-20 border-gray-300 bg-white dark:bg-gray-800 dark:text-white"
            placeholder="Describe the task..."
              />
            </div>
        {/* Estimated Time - New Dual Input System */}
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Estimated Time <span className="text-red-500">*</span></label>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  value={formData.estimatedHours}
                  onChange={e => {
                    const value = e.target.value;
                    if (value === '' || /^\d*$/.test(value)) {
                      setFormData(f => ({ ...f, estimatedHours: value }));
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:text-white"
                  placeholder="0"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hours</div>
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-lg font-bold">:</div>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={formData.estimatedMinutes}
                  onChange={e => {
                    const value = e.target.value;
                    if (value === '' || /^\d*$/.test(value)) {
                      const numValue = parseInt(value) || 0;
                      if (numValue <= 59) {
                        setFormData(f => ({ ...f, estimatedMinutes: value }));
                      }
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:text-white"
                  placeholder="0"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minutes</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {totalTime > 0 && (
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {formatTimeDisplay(formData.estimatedHours, formData.estimatedMinutes)} 
                  {totalTime !== Math.round(totalTime) && ` (${totalTime.toFixed(1)} hours)`}
                </span>
              )}
            </div>
            
            {/* Time Presets - Hidden by default */}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowTimePresets(!showTimePresets)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showTimePresets ? 'Hide quick presets' : 'Show quick presets'}
              </button>
              {showTimePresets && (
                <div className="mt-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quick presets:</div>
                  <div className="flex flex-wrap gap-1">
                    {timePresets.map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setFormData(f => ({ 
                          ...f, 
                          estimatedHours: preset.hours, 
                          estimatedMinutes: preset.minutes 
                        }))}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded border transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="text-blue-600 underline text-sm mt-2 md:mt-6 md:ml-4 whitespace-nowrap"
            onClick={handleShowEstimationHelper}
          >
            Need help estimating?
          </button>
        </div>
        {/* Impact */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">How much will this impact your goals?<span className="text-red-500">*</span></label>
            <button
              type="button"
              onClick={() => setShowImportanceHelpModal(true)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              title="Learn how importance affects scheduling"
            >
              <HelpCircle size={16} />
            </button>
          </div>
          <div className="flex flex-col md:flex-row gap-4 mt-2">
            <label className="flex items-center gap-2 text-base font-normal text-gray-700 dark:text-gray-100">
              <input
                type="radio"
                name="impact"
                value="high"
                checked={formData.impact === 'high'}
                onChange={() => setFormData(f => ({ ...f, impact: 'high' }))}
                required
              />
              <span>High impact (significantly affects your success/commitments)</span>
            </label>
            <label className="flex items-center gap-2 text-base font-normal text-gray-700 dark:text-gray-100">
              <input
                type="radio"
                name="impact"
                value="low"
                checked={formData.impact === 'low'}
                onChange={() => setFormData(f => ({ ...f, impact: 'low' }))}
                required
              />
              <span>Low impact (standard task, manageable if delayed)</span>
            </label>
          </div>
        </div>
        {/* More Options Collapsible */}
        <div className="border-t pt-4 mt-2">
          <button
            type="button"
            className="text-blue-600 font-medium underline focus:outline-none mb-2"
            onClick={() => setShowMoreOptions(v => !v)}
          >
            {showMoreOptions ? 'Hide More Options' : '▼ More Options'}
          </button>
          {showMoreOptions && (
            <div className="space-y-4 transition-all">
            
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Category <span className="text-gray-400">(Optional)</span></label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(f => ({ ...f, category: e.target.value, customCategory: '' }))}
                  className="w-full border rounded-lg px-3 py-2 text-base bg-white dark:bg-gray-800 dark:text-white"
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
                    className="w-full border rounded-lg px-3 py-2 mt-2 text-base bg-white dark:bg-gray-800 dark:text-white"
                    placeholder="Enter custom category"
                  />
                )}
              </div>
              {/* Task Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Task Type</label>
                <select
                  value={formData.taskType}
                  onChange={e => setFormData(f => ({ ...f, taskType: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-base bg-white dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select task type...</option>
                  {['Planning', 'Creating', 'Learning', 'Administrative', 'Communicating', 'Deep Focus Work'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              {/* Modifiers: only show if estimation helper is enabled AND task type is selected */}
              {showEstimationHelper && formData.taskType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Modifiers (contextual)</label>
                </div>
              )}
              {/* Enhanced Estimation Helper */}
              <EnhancedEstimationHelper
                taskType={formData.taskType || ''}
                category={formData.category || ''}
                initialEstimate={convertToDecimalHours(formData.estimatedHours, formData.estimatedMinutes)}
                onEstimateUpdate={(hours) => {
                  const { hours: h, minutes: m } = convertFromDecimalHours(hours);
                  setFormData(f => ({
                    ...f,
                    estimatedHours: h.toString(),
                    estimatedMinutes: m.toString()
                  }));
                  setShowEstimationHelper(false);
                }}
                onClose={() => setShowEstimationHelper(false)}
                deadline={formData.deadline}
                isVisible={showEstimationHelper}
              />
            </div>
          )}
          </div>
        {/* Enhanced Validation Feedback */}
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
        {/* Low-priority urgent warning */}
        {isLowPriorityUrgent && (
          <div className="text-yellow-600 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded mt-2 flex items-start gap-2 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-600">
            <Info className="mt-0.5" size={18} />
            <span>
              <strong>Warning:</strong> This task is <span className="font-semibold">low priority</span> but has an <span className="font-semibold">urgent deadline</span>. It may not be scheduled if you have more important urgent tasks.
            </span>
          </div>
        )}
        {/* Buttons */}
        <div className="flex space-x-3 mt-4 justify-end">
            <button
              type="submit"
            className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 text-lg shadow add-task-button"
            disabled={!isFormValid}
            >
              <Plus size={20} />
              <span>Add Task</span>
            </button>
            <button
              type="button"
            onClick={() => {
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
                targetFrequency: 'weekly',
                preferredTimeSlots: [],
                minWorkBlock: 30,
                isOneTimeTask: false,
              });
              setShowEstimationHelper(false);
              setShowMoreOptions(false);
              if (onCancel) onCancel();
            }}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 text-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl max-h-96 overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Task Timeline Help</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">Timeline Options Explained:</h4>

                <div className="space-y-3">
                  <div>
                    <strong className="text-blue-600 dark:text-blue-400">Hard Deadline:</strong>
                    <p>Task must be completed by the specified date. The app will prioritize these tasks and schedule them with urgency.</p>
                  </div>

                  <div>
                    <strong className="text-green-600 dark:text-green-400">Flexible Target:</strong>
                    <p>You have a goal date but it's not critical. The app will try to finish by this date but may extend if needed.</p>
                  </div>

                  <div>
                    <strong className="text-purple-600 dark:text-purple-400">No Deadline:</strong>
                    <p>Perfect for learning, hobbies, and personal development. The app schedules these tasks in available time slots without pressure.</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">How No-Deadline Tasks Work:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Fill available time:</strong> Scheduled after deadline tasks are placed</li>
                  <li><strong>Consistent progress:</strong> Spread across days based on your frequency preference</li>
                  <li><strong>Flexible scheduling:</strong> Can be moved or skipped without affecting critical deadlines</li>
                  <li><strong>Respect preferences:</strong> Uses your preferred time slots and session lengths</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">One-Time Tasks:</h4>
                <p>Check "Complete in one sitting" for tasks that shouldn't be divided into multiple sessions. Perfect for short tasks, meetings, or work that needs to be done all at once.</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">Task Importance & Scheduling Priority:</h4>
                <div className="space-y-2">
                  <div>
                    <strong className="text-red-600 dark:text-red-400">High Impact Tasks:</strong>
                    <p>Always scheduled first, regardless of deadline type. These tasks significantly affect your success and commitments.</p>
                  </div>
                  <div>
                    <strong className="text-gray-600 dark:text-gray-400">Low Impact Tasks:</strong>
                    <p>Scheduled after high impact tasks. Will be moved or postponed if schedule becomes tight.</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded text-sm">
                    <strong>Smart Scheduling Order:</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>High impact + hard deadline (urgent & important)</li>
                      <li>High impact + flexible/no deadline (important but not urgent)</li>
                      <li>Low impact + hard deadline (urgent but not important)</li>
                      <li>Low impact + flexible/no deadline (neither urgent nor important)</li>
                    </ol>
                  </div>
                  <div className="text-sm">
                    <strong>One-time tasks</strong> maintain their importance level but are scheduled as single, uninterrupted sessions:
                    <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                      <li><strong>High-impact one-sitting tasks:</strong> Scheduled as early as possible for maximum priority</li>
                      <li><strong>Regular one-sitting tasks:</strong> Scheduled on their deadline day (respecting buffer days), or the closest available day</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                <p className="text-blue-800 dark:text-blue-200">
                  <strong>Tip:</strong> Use high impact for tasks that significantly affect your goals, and low impact for routine or optional tasks. The app will automatically prioritize your schedule!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Importance Help Modal */}
      {showImportanceHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">How Task Importance Affects Scheduling</h3>
              <button
                onClick={() => setShowImportanceHelpModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 text-sm text-gray-600 dark:text-gray-300">
              {/* Overview */}
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🎯 Quick Summary</h4>
                <p className="text-blue-700 dark:text-blue-300">
                  Task importance determines scheduling priority. <strong>High impact tasks</strong> are always scheduled first, 
                  while <strong>low impact tasks</strong> fill remaining time slots and may be postponed if your schedule becomes tight.
                </p>
              </div>

              {/* Scheduling Priority System */}
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-white mb-3">📊 Scheduling Priority Order</h4>
                <div className="space-y-3">
                  <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg border-l-4 border-red-500">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-red-600 dark:text-red-400 font-bold">1st Priority:</span>
                      <span className="font-semibold">High Impact + Hard Deadline</span>
                    </div>
                    <p className="text-sm">Urgent AND important - scheduled immediately with maximum priority</p>
                  </div>
                  
                  <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded-lg border-l-4 border-orange-500">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-orange-600 dark:text-orange-400 font-bold">2nd Priority:</span>
                      <span className="font-semibold">High Impact + Flexible/No Deadline</span>
                    </div>
                    <p className="text-sm">Important but not urgent - scheduled early to prevent becoming urgent</p>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg border-l-4 border-yellow-500">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-yellow-600 dark:text-yellow-400 font-bold">3rd Priority:</span>
                      <span className="font-semibold">Low Impact + Hard Deadline</span>
                    </div>
                    <p className="text-sm">Urgent but not important - scheduled when high-priority tasks allow</p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border-l-4 border-gray-400">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-600 dark:text-gray-400 font-bold">4th Priority:</span>
                      <span className="font-semibold">Low Impact + Flexible/No Deadline</span>
                    </div>
                    <p className="text-sm">Neither urgent nor important - fills available time, easily postponed</p>
                  </div>
                </div>
              </div>

              {/* How Settings Affect Scheduling */}
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-white mb-3">⚙️ How Your Settings Interact with Importance</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                      <h5 className="font-medium text-green-800 dark:text-green-200 mb-1">Buffer Days</h5>
                      <p className="text-sm">High impact tasks get extra buffer time before deadlines. Low impact tasks may use minimal buffer if schedule is tight.</p>
                    </div>
                    
                    <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg">
                      <h5 className="font-medium text-purple-800 dark:text-purple-200 mb-1">Daily Hours</h5>
                      <p className="text-sm">High impact tasks get first claim on your daily available hours. Low impact tasks fill remaining time.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg">
                      <h5 className="font-medium text-indigo-800 dark:text-indigo-200 mb-1">Study Plan Mode</h5>
                      <p className="text-sm"><strong>Eisenhower:</strong> Strict importance-based priority<br/>
                      <strong>Balanced:</strong> Considers both importance and deadlines<br/>
                      <strong>Even:</strong> More equal distribution</p>
                    </div>
                    
                    <div className="bg-teal-50 dark:bg-teal-900/30 p-3 rounded-lg">
                      <h5 className="font-medium text-teal-800 dark:text-teal-200 mb-1">Frequency Preferences</h5>
                      <p className="text-sm">High impact tasks maintain consistent frequency even with tight schedules. Low impact tasks may have reduced frequency.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* One-Time Tasks */}
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-white mb-3">⏱️ One-Time Tasks & Importance</h4>
                <div className="space-y-3">
                  <div className="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg">
                    <h5 className="font-medium text-amber-800 dark:text-amber-200 mb-2">High Impact One-Time Tasks</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Scheduled as early as possible for maximum priority</li>
                      <li>• Get the best available time slots</li>
                      <li>• Protected from being moved or interrupted</li>
                      <li>• Example: Important presentation, critical exam</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                    <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Low Impact One-Time Tasks</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Scheduled on deadline day (respecting buffer days)</li>
                      <li>• May be moved to accommodate higher priority tasks</li>
                      <li>• Placed in less optimal time slots if needed</li>
                      <li>• Example: Routine administrative tasks, optional activities</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Examples */}
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-white mb-3">💡 Real-World Examples</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-red-600 dark:text-red-400 mb-2">🔥 High Impact Tasks</h5>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Final exam preparation</li>
                      <li>Job interview preparation</li>
                      <li>Critical project deliverables</li>
                      <li>Important presentations</li>
                      <li>Thesis/dissertation work</li>
                      <li>Professional certification exams</li>
                      <li>Client deliverables with consequences</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-600 dark:text-gray-400 mb-2">📝 Low Impact Tasks</h5>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Regular homework assignments</li>
                      <li>Routine reading</li>
                      <li>Optional skill development</li>
                      <li>Administrative tasks</li>
                      <li>Personal hobby projects</li>
                      <li>Extra credit work</li>
                      <li>Nice-to-have learning</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Do's and Don'ts */}
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-white mb-3">✅❌ Do's and Don'ts</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                    <h5 className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                      <span>✅</span> Do
                    </h5>
                    <ul className="text-sm space-y-2">
                      <li>• Mark tasks as high impact if failure significantly affects your goals</li>
                      <li>• Consider long-term consequences, not just immediate effort</li>
                      <li>• Use high impact for tasks with cascading effects</li>
                      <li>• Be honest about what truly matters to your success</li>
                      <li>• Mark career-defining or grade-critical tasks as high impact</li>
                      <li>• Consider high impact for tasks that unlock future opportunities</li>
                    </ul>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
                    <h5 className="font-medium text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                      <span>❌</span> Don't
                    </h5>
                    <ul className="text-sm space-y-2">
                      <li>• Mark everything as high impact (dilutes the system)</li>
                      <li>• Base importance solely on difficulty or time required</li>
                      <li>• Use high impact for tasks you simply prefer to do first</li>
                      <li>• Confuse urgency with importance</li>
                      <li>• Mark routine/repeatable tasks as high impact</li>
                      <li>• Let emotions override objective importance assessment</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Warning Scenarios */}
              <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">⚠️ What Happens When Schedule Gets Tight</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>High Impact Tasks:</strong> Always protected and scheduled, even if it means working longer hours or rearranging other commitments.</p>
                  <p><strong>Low Impact Tasks:</strong> May be postponed, have reduced session frequency, or be moved to less optimal time slots to make room for high-priority items.</p>
                  <p><strong>System Notifications:</strong> You'll receive warnings when low-priority tasks with deadlines can't be scheduled due to high-priority task conflicts.</p>
                </div>
              </div>

              {/* Quick Decision Guide */}
              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg">
                <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-3">🤔 Quick Decision Guide</h4>
                <div className="text-sm">
                  <p className="mb-2"><strong>Ask yourself:</strong></p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Would failing this task significantly impact my grades, career, or major goals?</li>
                    <li>Are there serious consequences if this isn't done well or on time?</li>
                    <li>Does this task unlock or block other important opportunities?</li>
                    <li>Would I rather sacrifice other tasks to ensure this one succeeds?</li>
                  </ul>
                  <p className="mt-3 font-medium">If you answered "yes" to most questions, choose <span className="text-red-600 dark:text-red-400">High Impact</span>. Otherwise, <span className="text-gray-600 dark:text-gray-400">Low Impact</span> is appropriate.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskInput;
