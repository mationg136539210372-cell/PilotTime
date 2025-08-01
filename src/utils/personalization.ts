import { 
  UserPersonalization, 
  PersonalizationPreset, 
  UserActivity, 
  PersonalizationSuggestion,
  ThemeSettings,
  LayoutSettings 
} from '../types-personalization';
import { StudyPlan, Task, UserSettings } from '../types';

// Default personalization settings
export const DEFAULT_PERSONALIZATION: UserPersonalization = {
  theme: {
    colorScheme: 'light',
    accentColor: 'purple',
    backgroundStyle: 'gradient',
    borderRadius: 'rounded',
    fontFamily: 'inter',
    fontSize: 'medium',
    compactMode: false,
    glassEffect: true,
    animations: 'full'
  },
  layout: {
    sidebarPosition: 'left',
    navigationStyle: 'tabs',
    dashboardLayout: 'grid',
    calendarView: 'week',
    showTaskProgress: true,
    showQuickStats: true,
    showUpcomingSessions: true,
    showStreakWidget: true,
    widgetOrder: ['stats', 'upcoming', 'progress', 'streak']
  },
  preferences: {
    greeting: {
      enabled: true,
      style: 'motivational',
      showTimeOfDay: true
    },
    notifications: {
      style: 'detailed',
      position: 'top-right',
      sound: false,
      celebration: 'normal'
    },
    quickActions: ['add-task', 'start-timer', 'view-calendar'],
    favoriteViews: ['dashboard', 'study-plan'],
    hiddenFeatures: []
  },
  customization: {
    avatar: {
      type: 'emoji',
      value: '🎯',
      backgroundColor: '#8b5cf6'
    },
    workspace: {
      name: 'My Study Space',
      description: 'Your personalized learning environment',
      icon: '📚'
    },
    shortcuts: {
      enabled: true,
      customShortcuts: {
        'add-task': 'Ctrl+N',
        'start-timer': 'Ctrl+Space',
        'settings': 'Ctrl+,'
      }
    },
    widgets: {
      enabled: ['quick-stats', 'upcoming-sessions', 'progress-overview'],
      positions: {}
    }
  }
};

// Predefined themes/presets
export const PERSONALIZATION_PRESETS: PersonalizationPreset[] = [
  {
    id: 'productivity-pro',
    name: 'Productivity Pro',
    description: 'Clean, focused interface for maximum productivity',
    icon: '⚡',
    preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    category: 'productivity',
    settings: {
      theme: {
        colorScheme: 'light' as const,
        accentColor: 'blue' as const,
        backgroundStyle: 'minimal' as const,
        borderRadius: 'sharp' as const,
        compactMode: true,
        glassEffect: false,
        animations: 'reduced' as const
      },
      layout: {
        navigationStyle: 'minimal' as const,
        dashboardLayout: 'list' as const,
        showTaskProgress: true,
        showQuickStats: true,
        showUpcomingSessions: false,
        showStreakWidget: false
      },
      preferences: {
        greeting: {
          enabled: false,
          style: 'minimal' as const,
          showTimeOfDay: false
        },
        notifications: {
          style: 'minimal' as const,
          celebration: 'subtle' as const
        }
      }
    }
  },
  {
    id: 'gaming-vibes',
    name: 'Gaming Vibes',
    description: 'Dark theme with gaming-inspired elements',
    icon: '🎮',
    preview: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    category: 'gaming',
    settings: {
      theme: {
        colorScheme: 'dark' as const,
        accentColor: 'green' as const,
        backgroundStyle: 'dynamic' as const,
        borderRadius: 'extra-rounded' as const,
        glassEffect: true,
        animations: 'full' as const
      },
      layout: {
        navigationStyle: 'tabs' as const,
        dashboardLayout: 'cards' as const,
        showStreakWidget: true,
        showQuickStats: true
      },
      preferences: {
        greeting: {
          enabled: true,
          style: 'playful' as const,
          showTimeOfDay: true
        },
        notifications: {
          celebration: 'enthusiastic' as const
        }
      },
      customization: {
        avatar: {
          type: 'emoji' as const,
          value: '🎮',
          backgroundColor: '#10b981'
        }
      }
    }
  },
  {
    id: 'minimalist-zen',
    name: 'Minimalist Zen',
    description: 'Clean, distraction-free environment',
    icon: '🧘',
    preview: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    category: 'minimal',
    settings: {
      theme: {
        colorScheme: 'light' as const,
        accentColor: 'indigo' as const,
        backgroundStyle: 'solid' as const,
        borderRadius: 'rounded' as const,
        compactMode: false,
        glassEffect: false,
        animations: 'reduced' as const
      },
      layout: {
        navigationStyle: 'pills' as const,
        dashboardLayout: 'compact' as const,
        showTaskProgress: false,
        showQuickStats: false,
        showUpcomingSessions: true,
        showStreakWidget: false
      },
      preferences: {
        greeting: {
          enabled: true,
          style: 'minimal' as const,
          showTimeOfDay: false
        },
        hiddenFeatures: ['gamification', 'suggestions']
      }
    }
  },
  {
    id: 'vibrant-energy',
    name: 'Vibrant Energy',
    description: 'Colorful, energetic theme to boost motivation',
    icon: '🌈',
    preview: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
    category: 'colorful',
    settings: {
      theme: {
        colorScheme: 'light' as const,
        accentColor: 'pink' as const,
        backgroundStyle: 'gradient' as const,
        borderRadius: 'extra-rounded' as const,
        glassEffect: true,
        animations: 'full' as const
      },
      layout: {
        navigationStyle: 'tabs' as const,
        dashboardLayout: 'cards' as const,
        showStreakWidget: true,
        showQuickStats: true
      },
      preferences: {
        greeting: {
          enabled: true,
          style: 'motivational' as const,
          showTimeOfDay: true
        },
        notifications: {
          celebration: 'enthusiastic' as const
        }
      }
    }
  },
  {
    id: 'dark-focus',
    name: 'Dark Focus',
    description: 'Dark mode optimized for long study sessions',
    icon: '🌙',
    preview: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
    category: 'dark',
    settings: {
      theme: {
        colorScheme: 'dark' as const,
        accentColor: 'blue' as const,
        backgroundStyle: 'gradient' as const,
        borderRadius: 'rounded' as const,
        compactMode: false,
        glassEffect: true,
        animations: 'reduced' as const
      },
      layout: {
        navigationStyle: 'tabs' as const,
        dashboardLayout: 'grid' as const
      },
      preferences: {
        greeting: {
          style: 'casual' as const
        }
      }
    }
  }
];

// Generate smart suggestions based on user activity
export function generatePersonalizationSuggestions(
  activity: UserActivity,
  currentSettings: UserPersonalization,
  studyData: { tasks: Task[], studyPlans: StudyPlan[] }
): PersonalizationSuggestion[] {
  const suggestions: PersonalizationSuggestion[] = [];

  // Suggest dark mode for night owls
  if (activity.studyPatterns.nightOwl && currentSettings.theme.colorScheme !== 'dark') {
    suggestions.push({
      id: 'dark-mode-suggestion',
      type: 'theme',
      title: 'Switch to Dark Mode',
      description: 'Based on your evening study patterns, dark mode might be easier on your eyes',
      reason: 'You study frequently in the evening',
      impact: 'medium',
      action: () => {
        // Will be implemented in component
      }
    });
  }

  // Suggest compact mode for power users
  if (activity.usageStats.totalLogins > 50 && !currentSettings.theme.compactMode) {
    suggestions.push({
      id: 'compact-mode-suggestion',
      type: 'layout',
      title: 'Try Compact Mode',
      description: 'Save screen space and see more information at once',
      reason: 'You\'re an active user who might benefit from efficiency',
      impact: 'high',
      action: () => {}
    });
  }

  // Suggest gamification if user completes many tasks
  const completedTasks = studyData.tasks.filter(t => t.status === 'completed').length;
  if (completedTasks > 10 && currentSettings.preferences.hiddenFeatures?.includes('gamification')) {
    suggestions.push({
      id: 'gamification-suggestion',
      type: 'feature',
      title: 'Enable Achievement System',
      description: 'Track your progress with achievements, streaks, and rewards',
      reason: 'You\'ve completed many tasks and might enjoy progress tracking',
      impact: 'high',
      action: () => {}
    });
  }

  // Suggest layout changes based on most used tabs
  const mostUsedTab = Object.entries(activity.mostUsedTabs)
    .sort(([,a], [,b]) => b - a)[0];
  
  if (mostUsedTab && mostUsedTab[0] === 'calendar' && currentSettings.layout.calendarView !== 'week') {
    suggestions.push({
      id: 'calendar-view-suggestion',
      type: 'layout',
      title: 'Optimize Calendar View',
      description: 'Switch to week view for better scheduling overview',
      reason: 'You use the calendar frequently',
      impact: 'medium',
      action: () => {}
    });
  }

  return suggestions;
}

// Analyze user activity and update patterns
export function analyzeUserActivity(
  currentActivity: UserActivity,
  sessionData: { tab: string, duration: number, time: Date }
): UserActivity {
  const hour = sessionData.time.getHours();
  const tab = sessionData.tab;

  return {
    ...currentActivity,
    mostUsedTabs: {
      ...currentActivity.mostUsedTabs,
      [tab]: (currentActivity.mostUsedTabs[tab] || 0) + 1
    },
    mostUsedTimes: {
      ...currentActivity.mostUsedTimes,
      [hour.toString()]: (currentActivity.mostUsedTimes[hour.toString()] || 0) + 1
    },
    studyPatterns: {
      ...currentActivity.studyPatterns,
      morningPerson: currentActivity.mostUsedTimes['6'] > 5 || currentActivity.mostUsedTimes['7'] > 5,
      nightOwl: currentActivity.mostUsedTimes['21'] > 5 || currentActivity.mostUsedTimes['22'] > 5,
    },
    usageStats: {
      ...currentActivity.usageStats,
      totalLogins: currentActivity.usageStats.totalLogins + 1,
      averageSessionTime: (currentActivity.usageStats.averageSessionTime + sessionData.duration) / 2
    }
  };
}

// Get personalized greeting based on settings and time
export function getPersonalizedGreeting(
  settings: UserPersonalization,
  userName?: string
): string {
  if (!settings.preferences.greeting.enabled) return '';

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const name = userName || 'there';

  if (settings.preferences.greeting.customMessage) {
    return settings.preferences.greeting.customMessage.replace('{name}', name);
  }

  const greetings = {
    formal: {
      morning: `Good morning, ${name}`,
      afternoon: `Good afternoon, ${name}`,
      evening: `Good evening, ${name}`
    },
    casual: {
      morning: `Hey ${name}! ☀️`,
      afternoon: `Hi ${name}! 👋`,
      evening: `Evening ${name}! 🌙`
    },
    motivational: {
      morning: `Rise and shine, ${name}! Ready to conquer your goals? 🚀`,
      afternoon: `Keep up the momentum, ${name}! 💪`,
      evening: `Evening focus time, ${name}! Let's make progress 🎯`
    },
    minimal: {
      morning: `Morning, ${name}`,
      afternoon: `Afternoon, ${name}`,
      evening: `Evening, ${name}`
    }
  };

  const style = settings.preferences.greeting.style;
  const greeting = greetings[style]?.[timeOfDay] || greetings.casual[timeOfDay];
  
  return settings.preferences.greeting.showTimeOfDay ? greeting : greeting.split('!')[0];
}

// Apply theme CSS variables
export function applyThemeSettings(settings: ThemeSettings): void {
  const root = document.documentElement;

  // Add visual feedback for theme change
  root.classList.add('theme-updated');
  setTimeout(() => root.classList.remove('theme-updated'), 500);

  // Color scheme
  if (settings.colorScheme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  } else {
    document.documentElement.classList.toggle('dark', settings.colorScheme === 'dark');
  }

  // Accent color with RGB values for opacity variants
  const accentColors = {
    blue: { hex: '#3b82f6', rgb: '59, 130, 246' },
    purple: { hex: '#8b5cf6', rgb: '139, 92, 246' },
    green: { hex: '#10b981', rgb: '16, 185, 129' },
    orange: { hex: '#f59e0b', rgb: '245, 158, 11' },
    pink: { hex: '#ec4899', rgb: '236, 72, 153' },
    indigo: { hex: '#6366f1', rgb: '99, 102, 241' },
    red: { hex: '#ef4444', rgb: '239, 68, 68' },
    yellow: { hex: '#eab308', rgb: '234, 179, 8' },
    teal: { hex: '#14b8a6', rgb: '20, 184, 166' }
  };

  const accentColor = accentColors[settings.accentColor];
  root.style.setProperty('--accent-color', accentColor.hex);
  root.style.setProperty('--accent-color-rgb', accentColor.rgb);

  // Border radius
  const radiusValues = {
    sharp: '0px',
    rounded: '0.5rem',
    'extra-rounded': '1rem'
  };

  root.style.setProperty('--border-radius', radiusValues[settings.borderRadius]);
  root.style.setProperty('--border-radius-sm', settings.borderRadius === 'sharp' ? '0px' : settings.borderRadius === 'rounded' ? '0.25rem' : '0.5rem');
  root.style.setProperty('--border-radius-lg', settings.borderRadius === 'sharp' ? '0px' : settings.borderRadius === 'rounded' ? '0.75rem' : '1.5rem');
  root.style.setProperty('--border-radius-xl', settings.borderRadius === 'sharp' ? '0px' : settings.borderRadius === 'rounded' ? '1rem' : '2rem');

  // Font family
  const fontFamilies = {
    inter: 'Inter, sans-serif',
    poppins: 'Poppins, sans-serif',
    roboto: 'Roboto, sans-serif',
    system: 'system-ui, sans-serif'
  };

  root.style.setProperty('--font-family', fontFamilies[settings.fontFamily]);

  // Font size scale
  const fontSizes = {
    small: { base: '14px', scale: '0.875' },
    medium: { base: '16px', scale: '1' },
    large: { base: '18px', scale: '1.125' }
  };

  const fontSize = fontSizes[settings.fontSize];
  root.style.setProperty('--base-font-size', fontSize.base);
  root.style.setProperty('--font-scale', fontSize.scale);

  // Animation preferences
  if (settings.animations === 'none') {
    root.style.setProperty('--animation-duration', '0s');
    root.style.setProperty('--animation-duration-fast', '0s');
    root.style.setProperty('--animation-duration-slow', '0s');
  } else if (settings.animations === 'reduced') {
    root.style.setProperty('--animation-duration', '0.1s');
    root.style.setProperty('--animation-duration-fast', '0.05s');
    root.style.setProperty('--animation-duration-slow', '0.15s');
  } else {
    root.style.setProperty('--animation-duration', '0.3s');
    root.style.setProperty('--animation-duration-fast', '0.15s');
    root.style.setProperty('--animation-duration-slow', '0.5s');
  }

  // Background style
  const backgroundStyles = {
    gradient: 'linear-gradient(135deg, rgba(var(--accent-color-rgb), 0.1) 0%, rgba(var(--accent-color-rgb), 0.05) 100%)',
    solid: 'rgb(249, 250, 251)',
    minimal: 'rgb(255, 255, 255)',
    dynamic: 'radial-gradient(circle at 50% 50%, rgba(var(--accent-color-rgb), 0.1) 0%, transparent 50%)'
  };

  root.style.setProperty('--background-pattern', backgroundStyles[settings.backgroundStyle]);

  // Compact mode spacing
  if (settings.compactMode) {
    root.style.setProperty('--spacing-scale', '0.75');
    root.style.setProperty('--padding-scale', '0.8');
  } else {
    root.style.setProperty('--spacing-scale', '1');
    root.style.setProperty('--padding-scale', '1');
  }
}

// Get CSS classes for current personalization
export function getPersonalizationClasses(settings: UserPersonalization): string {
  const classes: string[] = [];
  
  if (settings.theme.compactMode) classes.push('compact-mode');
  if (settings.theme.glassEffect) classes.push('glass-effect');
  if (settings.layout.navigationStyle) classes.push(`nav-${settings.layout.navigationStyle}`);
  if (settings.layout.dashboardLayout) classes.push(`dashboard-${settings.layout.dashboardLayout}`);
  
  return classes.join(' ');
}
