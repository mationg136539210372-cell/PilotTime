import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Layout, 
  Settings, 
  User, 
  Monitor, 
  Smartphone, 
  Eye, 
  Zap,
  Home,
  Calendar,
  Clock,
  Star,
  Lightbulb,
  X,
  Check,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';
import { 
  UserPersonalization, 
  PersonalizationPreset, 
  PersonalizationSuggestion 
} from '../types-personalization';
import {
  PERSONALIZATION_PRESETS,
  DEFAULT_PERSONALIZATION,
  getPersonalizedGreeting,
  applyThemeSettings
} from '../utils/personalization';

interface PersonalizationPanelProps {
  currentSettings: UserPersonalization;
  suggestions: PersonalizationSuggestion[];
  onUpdateSettings: (settings: Partial<UserPersonalization>) => void;
  onClose: () => void;
  userName?: string;
}

const PersonalizationPanel: React.FC<PersonalizationPanelProps> = ({
  currentSettings,
  suggestions,
  onUpdateSettings,
  onClose,
  userName = 'User'
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'theme' | 'layout' | 'advanced' | 'suggestions'>('presets');
  const [previewSettings, setPreviewSettings] = useState<UserPersonalization>(currentSettings);

  // Apply current theme settings when component mounts
  useEffect(() => {
    applyThemeSettings(currentSettings.theme);
  }, []);

  const tabs = [
    { id: 'presets', label: 'Presets', icon: Star, desc: 'Quick themes' },
    { id: 'theme', label: 'Theme', icon: Palette, desc: 'Colors & style' },
    { id: 'layout', label: 'Layout', icon: Layout, desc: 'Organization' },
    { id: 'advanced', label: 'Advanced', icon: Settings, desc: 'Custom options' },
    { id: 'suggestions', label: 'Smart Tips', icon: Lightbulb, desc: 'AI suggestions' }
  ];

  // Function to determine if background is light or dark for better text contrast
  const getContrastTextColor = (background: string) => {
    // Check if background contains dark colors
    if (background.includes('#1a1a2e') || background.includes('#2c3e50') || background.includes('#34495e')) {
      return 'text-white drop-shadow-sm';
    }
    // Default to dark text for light backgrounds
    return 'text-gray-800 drop-shadow-sm';
  };

  const applyPreset = (preset: PersonalizationPreset) => {
    const newSettings = { ...currentSettings, ...preset.settings };
    setPreviewSettings(newSettings);
    // Apply theme immediately if preset includes theme settings
    if (preset.settings.theme) {
      applyThemeSettings({ ...currentSettings.theme, ...preset.settings.theme });
    }
    onUpdateSettings(preset.settings);
  };

  const updateTheme = (key: keyof UserPersonalization['theme'], value: any) => {
    const newTheme = { ...previewSettings.theme, [key]: value };
    const newSettings = { ...previewSettings, theme: newTheme };
    setPreviewSettings(newSettings);
    // Apply theme immediately
    applyThemeSettings(newTheme);
    onUpdateSettings({ theme: newTheme });
  };

  const updateLayout = (key: keyof UserPersonalization['layout'], value: any) => {
    const newLayout = { ...previewSettings.layout, [key]: value };
    const newSettings = { ...previewSettings, layout: newLayout };
    setPreviewSettings(newSettings);
    onUpdateSettings({ layout: newLayout });
  };

  const ColorPicker = ({ value, onChange, colors }: {
    value: string;
    onChange: (color: string) => void;
    colors: Record<string, string>;
  }) => (
    <div className="flex flex-wrap gap-2">
      {Object.entries(colors).map(([name, color]) => (
        <button
          key={name}
          onClick={() => onChange(name)}
          className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
            value === name ? 'border-gray-800 dark:border-white scale-110' : 'border-gray-300 dark:border-gray-600'
          }`}
          style={{ backgroundColor: color }}
          title={name.charAt(0).toUpperCase() + name.slice(1)}
        />
      ))}
    </div>
  );

  const renderPresets = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Choose Your Style</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Select a preset that matches your workflow and personality
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PERSONALIZATION_PRESETS.map((preset) => (
          <div
            key={preset.id}
            className="relative p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer group"
            onClick={() => applyPreset(preset)}
          >
            {/* Preview */}
            <div
              className="w-full h-20 rounded-lg mb-3 relative overflow-hidden"
              style={{ background: preset.preview }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl ${getContrastTextColor(preset.preview)}`}>{preset.icon}</span>
              </div>
              <div className={`absolute top-2 right-2 text-xs px-2 py-1 rounded shadow-lg font-medium ${getContrastTextColor(preset.preview)} bg-white/20 backdrop-blur-sm`}>
                Preview
              </div>
            </div>

            {/* Info */}
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-1">{preset.name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{preset.description}</p>
              <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                {preset.category}
              </span>
            </div>

            {/* Apply button on hover */}
            <div className="absolute inset-0 bg-black/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <button className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg font-medium text-gray-800 dark:text-white shadow-lg">
                Apply Theme
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTheme = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Theme Customization</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Customize colors, fonts, and visual style
        </p>
      </div>

      {/* Color Scheme */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Color Scheme
        </label>
        <div className="flex space-x-3">
          {[
            { value: 'light', label: 'Light', icon: '☀️' },
            { value: 'dark', label: 'Dark', icon: '🌙' },
            { value: 'auto', label: 'Auto', icon: '🔄' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => updateTheme('colorScheme', option.value)}
              className={`flex items-center space-x-2 px-4 py-3 border rounded-lg transition-all duration-200 ${
                previewSettings.theme.colorScheme === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Accent Color
        </label>
        <ColorPicker
          value={previewSettings.theme.accentColor}
          onChange={(color) => updateTheme('accentColor', color)}
          colors={{
            blue: '#3b82f6',
            purple: '#8b5cf6',
            green: '#10b981',
            orange: '#f59e0b',
            pink: '#ec4899',
            indigo: '#6366f1',
            red: '#ef4444',
            yellow: '#eab308',
            teal: '#14b8a6'
          }}
        />
      </div>

      {/* Background Style */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Background Style
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'gradient', label: 'Gradient', preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
            { value: 'solid', label: 'Solid', preview: '#f8fafc' },
            { value: 'minimal', label: 'Minimal', preview: 'linear-gradient(to bottom, #ffffff, #f1f5f9)' },
            { value: 'dynamic', label: 'Dynamic', preview: 'radial-gradient(circle, #667eea, #764ba2)' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => updateTheme('backgroundStyle', option.value)}
              className={`p-3 border rounded-lg transition-all duration-200 ${
                previewSettings.theme.backgroundStyle === option.value
                  ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div 
                className="w-full h-8 rounded mb-2" 
                style={{ background: option.preview }}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Toggle Options */}
      <div className="space-y-4">
        {[
          { key: 'compactMode', label: 'Compact Mode', desc: 'Reduce spacing for more content' },
          { key: 'glassEffect', label: 'Glass Effect', desc: 'Translucent elements with blur' }
        ].map((option) => (
          <div key={option.key} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {option.label}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {option.desc}
              </div>
            </div>
            <button
              onClick={() => updateTheme(option.key as any, !previewSettings.theme[option.key as keyof typeof previewSettings.theme])}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                previewSettings.theme[option.key as keyof typeof previewSettings.theme]
                  ? 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  previewSettings.theme[option.key as keyof typeof previewSettings.theme]
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLayout = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Layout Options</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Customize how information is organized and displayed
        </p>
      </div>

      {/* Navigation Style */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Navigation Style
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'tabs', label: 'Tabs', icon: '📑' },
            { value: 'pills', label: 'Pills', icon: '💊' },
            { value: 'minimal', label: 'Minimal', icon: '➖' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => updateLayout('navigationStyle', option.value)}
              className={`flex items-center space-x-3 p-3 border rounded-lg transition-all duration-200 ${
                previewSettings.layout.navigationStyle === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Layout */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Dashboard Layout
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'grid', label: 'Grid View', icon: '⊞' },
            { value: 'list', label: 'List View', icon: '☰' },
            { value: 'cards', label: 'Card View', icon: '🃏' },
            { value: 'compact', label: 'Compact', icon: '▦' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => updateLayout('dashboardLayout', option.value)}
              className={`flex items-center space-x-3 p-3 border rounded-lg transition-all duration-200 ${
                previewSettings.layout.dashboardLayout === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Widget Toggles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Dashboard Widgets
        </label>
        <div className="space-y-3">
          {[
            { key: 'showTaskProgress', label: 'Task Progress', icon: '📊' },
            { key: 'showQuickStats', label: 'Quick Stats', icon: '⚡' },
            { key: 'showUpcomingSessions', label: 'Upcoming Sessions', icon: '⏰' },
            { key: 'showStreakWidget', label: 'Study Streak', icon: '🔥' }
          ].map((widget) => (
            <div key={widget.key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{widget.icon}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {widget.label}
                </span>
              </div>
              <button
                onClick={() => updateLayout(widget.key as any, !previewSettings.layout[widget.key as keyof typeof previewSettings.layout])}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  previewSettings.layout[widget.key as keyof typeof previewSettings.layout]
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    previewSettings.layout[widget.key as keyof typeof previewSettings.layout]
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSuggestions = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Smart Suggestions</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Personalized recommendations based on your usage patterns
        </p>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">✨</div>
          <p className="text-gray-600 dark:text-gray-400">
            No suggestions right now. Keep using TimePilot and we'll provide personalized recommendations!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800 dark:text-white mb-1">
                    {suggestion.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {suggestion.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    💡 {suggestion.reason}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  suggestion.impact === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                  suggestion.impact === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                }`}>
                  {suggestion.impact} impact
                </span>
              </div>
              <button
                onClick={suggestion.action}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Apply Suggestion
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden max-w-6xl w-full max-h-[90vh]">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <User className="text-blue-600 dark:text-blue-400" size={28} />
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Personalization</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getPersonalizedGreeting(previewSettings, userName)}
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

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-4 bg-white/50 dark:bg-gray-800/50 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto max-h-96">
        {activeTab === 'presets' && renderPresets()}
        {activeTab === 'theme' && renderTheme()}
        {activeTab === 'layout' && renderLayout()}
        {activeTab === 'suggestions' && renderSuggestions()}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex space-x-3">
            <button
              onClick={() => onUpdateSettings(DEFAULT_PERSONALIZATION)}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <RefreshCw size={16} />
              <span>Reset to Default</span>
            </button>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Changes are saved automatically
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalizationPanel;
