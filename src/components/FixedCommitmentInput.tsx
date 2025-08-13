import React, { useState } from 'react';
import { Plus, Clock, MapPin, User, AlertTriangle, Calendar } from 'lucide-react';
import { FixedCommitment } from '../types';
import { checkCommitmentConflicts } from '../utils/scheduling';

interface FixedCommitmentInputProps {
  onAddCommitment: (commitment: Omit<FixedCommitment, 'id' | 'createdAt'>) => void;
  existingCommitments: FixedCommitment[];
}

const FixedCommitmentInput: React.FC<FixedCommitmentInputProps> = ({ onAddCommitment, existingCommitments }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    recurring: true,
    daysOfWeek: [] as number[],
    specificDates: [] as string[],
    category: 'Academics',
    location: '',
    description: '',
    isAllDay: false,
    isFixed: false,
    dateRange: {
      startDate: '',
      endDate: ''
    }
  });
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Enhanced validation
  const isTitleValid = formData.title.trim().length > 0;
  const isTitleLengthValid = formData.title.trim().length <= 100;
  const isStartTimeValid = formData.isAllDay || formData.startTime.trim().length > 0;
  const isEndTimeValid = formData.isAllDay || formData.endTime.trim().length > 0;
  const isDaysValid = formData.recurring ? formData.daysOfWeek.length > 0 : true;
  const isDatesValid = !formData.recurring ? formData.specificDates.length > 0 : true;
  const isTimeRangeValid = formData.isAllDay || !formData.startTime || !formData.endTime || 
    formData.startTime < formData.endTime;
  const isLocationValid = !formData.location || formData.location.trim().length <= 200;
  const isDateRangeValid = !formData.recurring || !formData.dateRange.startDate || !formData.dateRange.endDate || 
    formData.dateRange.startDate <= formData.dateRange.endDate;

  const isFormValid = isTitleValid && isTitleLengthValid && isDaysValid && 
                     isDatesValid && isTimeRangeValid && isLocationValid && isDateRangeValid &&
                     (formData.isAllDay || (isStartTimeValid && isEndTimeValid));



  const daysOfWeekOptions = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 0, label: 'Sun' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    // Clear any previous validation errors
    setConflictError(null);
    
    // Check for conflicts
    const conflictCheck = checkCommitmentConflicts(formData, existingCommitments);
    
    if (conflictCheck.hasConflict) {
      const conflictingCommitment = conflictCheck.conflictingCommitment!;
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let conflictDescription = '';
      
      if (conflictingCommitment.recurring) {
        const conflictingDays = conflictingCommitment.daysOfWeek.map(day => dayNames[day]).join(', ');
        conflictDescription = `(${conflictingDays}, ${conflictingCommitment.startTime}-${conflictingCommitment.endTime})`;
      } else {
        const conflictingDates = conflictingCommitment.specificDates?.map(date => new Date(date).toLocaleDateString()).join(', ') || '';
        conflictDescription = `(${conflictingDates}, ${conflictingCommitment.startTime}-${conflictingCommitment.endTime})`;
      }
      
      if (conflictCheck.conflictType === 'strict') {
        setConflictError(
          `Time conflict with "${conflictingCommitment.title}" ${conflictDescription}. Please adjust your schedule.`
        );
        return;
      } else if (conflictCheck.conflictType === 'override') {
        // For override conflicts, show a different message
        if (!formData.recurring) {
          setConflictError(
            `This one-time commitment will override the recurring commitment "${conflictingCommitment.title}" on the selected dates.`
          );
          // Don't return - allow the override to proceed
        } else {
          const conflictingDates = conflictCheck.conflictingDates?.map(date => new Date(date).toLocaleDateString()).join(', ') || '';
          setConflictError(
            `This recurring commitment conflicts with one-time commitments on: ${conflictingDates}. These dates will be excluded from the recurring schedule.`
          );
          // Don't return - allow the override to proceed
        }
      }
    }

    // Clear any previous conflict errors
    setConflictError(null);
    
    // Prepare commitment data
    const commitmentData = {
      ...formData,
      // Only include startTime and endTime if not an all-day event
      startTime: formData.isAllDay ? undefined : formData.startTime,
      endTime: formData.isAllDay ? undefined : formData.endTime,
      // Only include dateRange if it has valid values
      dateRange: (formData.recurring && formData.dateRange.startDate && formData.dateRange.endDate) 
        ? formData.dateRange 
        : undefined
    };
    
    onAddCommitment(commitmentData);
    setFormData({
      title: '',
      startTime: '',
      endTime: '',
      recurring: true,
      daysOfWeek: [],
      specificDates: [],
      category: 'Academics',
      location: '',
      description: '',
      isAllDay: false,
      isFixed: false,
      dateRange: {
        startDate: '',
        endDate: ''
      }
    });
    setIsOpen(false);
  };

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort()
    }));
  };


  return (
    <div className="bg-white rounded-xl shadow-lg p-6 dark:bg-gray-900 dark:shadow-gray-900">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Add Fixed Commitment</h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 add-commitment-button"
        >
          <Plus size={20} />
          <span>Add Commitment</span>
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
                Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                placeholder="e.g., Linear Algebra Lecture"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
                Category
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value
                    })
                  }
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="Academics">Academics</option>
                  <option value="Work">Work</option>
                  <option value="Personal">Personal</option>
                  <option value="Health">Health</option>
                  <option value="Learning">Learning</option>
                  <option value="Finance">Finance</option>
                  <option value="Home">Home</option>
                  <option value="Organization">Organization</option>
                  <option value="Routine">Routine</option>
                  <option value="Buffer">Buffer</option>
                </select>
              </div>
                      </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Recurrence Pattern
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="recurring"
                  checked={formData.recurring}
                  onChange={() => setFormData({ ...formData, recurring: true, specificDates: [] })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">Recurring</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="recurring"
                  checked={!formData.recurring}
                  onChange={() => setFormData({ ...formData, recurring: false, daysOfWeek: [] })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">One-time</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={formData.isAllDay}
              onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked, isFixed: e.target.checked ? formData.isFixed : false })}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span>All-day event (no specific time)</span>
          </label>

          {formData.isAllDay && (
            <div className="mt-2 ml-6">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={formData.isFixed}
                  onChange={(e) => setFormData({ ...formData, isFixed: e.target.checked })}
                  className="text-red-600 focus:ring-red-500"
                />
                <span>Fixed commitment (no tasks will be scheduled on this day)</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6 dark:text-gray-400">
                When enabled, the scheduling system will not assign any study tasks on days with this commitment.
              </p>
            </div>
          )}
        </div>

        {!formData.isAllDay && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
                Start Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <input
                  type="time"
                  required={!formData.isAllDay}
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
                End Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <input
                  type="time"
                  required={!formData.isAllDay}
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

                  {formData.recurring ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
                Days of Week
              </label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeekOptions.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      formData.daysOfWeek.includes(day.value)
                        ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
                Date Range (Optional)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 dark:text-gray-400">
                    Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={20} />
                    <input
                      type="date"
                      value={formData.dateRange.startDate}
                      onChange={(e) => setFormData({
                        ...formData,
                        dateRange: {
                          ...formData.dateRange,
                          startDate: e.target.value
                        }
                      })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 dark:text-gray-400">
                    End Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={20} />
                    <input
                      type="date"
                      value={formData.dateRange.endDate}
                      onChange={(e) => setFormData({
                        ...formData,
                        dateRange: {
                          ...formData.dateRange,
                          endDate: e.target.value
                        }
                      })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                If no date range is specified, the commitment will recur indefinitely.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
              Specific Dates
            </label>
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="text-blue-500 dark:text-blue-400" size={20} />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Select dates for this commitment</span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Choose each date when this commitment occurs.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Type date (YYYY-MM-DD) or use calendar below"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const dateValue = (e.target as HTMLInputElement).value;
                          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                          if (dateRegex.test(dateValue)) {
                            const date = new Date(dateValue);
                            if (!isNaN(date.getTime()) && date >= new Date(new Date().toDateString()) && !formData.specificDates.includes(dateValue)) {
                              setFormData({
                                ...formData,
                                specificDates: [...formData.specificDates, dateValue].sort()
                              });
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Press Enter to add</span>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                    Or select from calendar:
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    onClick={(e) => {
                      // Store the current value to compare later
                      (e.target as HTMLInputElement).dataset.previousValue = (e.target as HTMLInputElement).value;
                    }}
                    onChange={(e) => {
                      const currentValue = e.target.value;
                      const previousValue = e.target.dataset.previousValue || '';

                      // Only add if the user actually selected a date (not just navigating)
                      if (currentValue && currentValue !== previousValue && !formData.specificDates.includes(currentValue)) {
                        setFormData({
                          ...formData,
                          specificDates: [...formData.specificDates, currentValue].sort()
                        });
                        // Clear the input
                        e.target.value = '';
                        e.target.dataset.previousValue = '';
                      }
                    }}
                  />
                </div>
              </div>
              
              {formData.specificDates.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Selected Dates ({formData.specificDates.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, specificDates: [] })}
                      className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {formData.specificDates.map((date) => (
                      <div
                        key={date}
                        className="flex items-center justify-between bg-blue-100 text-blue-800 px-3 py-2 rounded-lg dark:bg-blue-900/20 dark:text-blue-300"
                      >
                        <span className="text-sm font-medium">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            specificDates: formData.specificDates.filter(d => d !== date)
                          })}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-bold text-lg leading-none"
                          title="Remove this date"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

          <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Location (Optional)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 text-gray-400" size={20} />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                placeholder="e.g., Room 101, Main Building"
              />
            </div>
          </div>

          <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              rows={2}
              placeholder="Additional notes about this commitment..."
            />
          </div>

          {/* Conflict Error Display */}
          {conflictError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-700">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="text-red-500 mt-0.5" size={16} />
                <span className="text-sm text-red-700 dark:text-red-300">{conflictError}</span>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="submit"
              className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Add Commitment</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default FixedCommitmentInput;
