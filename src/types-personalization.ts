export interface UserPersonalization {
  theme: ThemeSettings;
  layout: LayoutSettings;
  preferences: UserPreferences;
  customization: CustomizationSettings;
}

export interface ThemeSettings {
  colorScheme: 'light' | 'dark' | 'auto';
  accentColor: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'indigo' | 'red' | 'yellow' | 'teal';
  backgroundStyle: 'gradient' | 'solid' | 'minimal' | 'dynamic';
  borderRadius: 'sharp' | 'rounded' | 'extra-rounded';
  fontFamily: 'inter' | 'poppins' | 'roboto' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  glassEffect: boolean;
  animations: 'full' | 'reduced' | 'none';
}

export interface LayoutSettings {
  sidebarPosition: 'left' | 'right' | 'top' | 'bottom';
  navigationStyle: 'tabs' | 'sidebar' | 'pills' | 'minimal';
  dashboardLayout: 'grid' | 'list' | 'cards' | 'compact';
  calendarView: 'week' | 'day' | 'month' | 'agenda';
  showTaskProgress: boolean;
  showQuickStats: boolean;
  showUpcomingSessions: boolean;
  showStreakWidget: boolean;
  widgetOrder: string[];
}

export interface UserPreferences {
  greeting: {
    enabled: boolean;
    style: 'formal' | 'casual' | 'motivational' | 'minimal';
    showTimeOfDay: boolean;
    customMessage?: string;
  };
  notifications: {
    style: 'minimal' | 'detailed' | 'playful';
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
    sound: boolean;
    celebration: 'subtle' | 'normal' | 'enthusiastic';
  };
  quickActions: string[]; // IDs of frequently used actions
  favoriteViews: string[]; // Most used tab IDs
  hiddenFeatures: string[]; // Features user wants to hide
}

export interface CustomizationSettings {
  avatar: {
    type: 'emoji' | 'initials' | 'image' | 'none';
    value: string; // emoji, initials, or image URL
    backgroundColor: string;
  };
  workspace: {
    name: string;
    description?: string;
    icon: string;
  };
  shortcuts: {
    enabled: boolean;
    customShortcuts: Record<string, string>; // action -> key combination
  };
  widgets: {
    enabled: string[];
    positions: Record<string, { x: number; y: number; width: number; height: number }>;
  };
}

export interface PersonalizationPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  preview: string; // Base64 image or color
  settings: Partial<UserPersonalization>;
  category: 'productivity' | 'minimal' | 'colorful' | 'dark' | 'gaming';
}

export interface UserActivity {
  mostUsedTabs: Record<string, number>;
  mostUsedTimes: Record<string, number>; // hour -> usage count
  preferredSessionLength: number;
  studyPatterns: {
    morningPerson: boolean;
    nightOwl: boolean;
    weekendStudier: boolean;
    consistentSchedule: boolean;
  };
  usageStats: {
    totalLogins: number;
    averageSessionTime: number;
    favoriteFeatures: string[];
    strugglingAreas: string[];
  };
}

// Smart suggestions based on user behavior
export interface PersonalizationSuggestion {
  id: string;
  type: 'theme' | 'layout' | 'feature' | 'workflow';
  title: string;
  description: string;
  reason: string; // Why this suggestion is made
  impact: 'low' | 'medium' | 'high';
  action: () => void;
  previewImage?: string;
}
