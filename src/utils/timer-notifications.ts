/**
 * Timer notification utilities to handle timer completion in background
 */

interface TimerNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

/**
 * Request notification permission if not already granted
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

/**
 * Show a notification for timer completion
 */
export const showTimerCompletionNotification = async (taskTitle: string, timeSpent: number): Promise<void> => {
  const hasPermission = await requestNotificationPermission();
  
  if (!hasPermission) {
    console.log('Notification permission not granted');
    return;
  }

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  const options: TimerNotificationOptions = {
    title: '⏰ Timer Completed!',
    body: `Your study session for "${taskTitle}" is done! Time spent: ${formatTime(timeSpent)}`,
    icon: '/favicon.svg',
    tag: 'timer-completion',
  };

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon,
      tag: options.tag,
      requireInteraction: true, // Keep notification until user interacts
    });

    // Auto-close after 10 seconds if user doesn't interact
    setTimeout(() => {
      notification.close();
    }, 10000);

    // Handle notification click - focus the app
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

  } catch (error) {
    console.error('Failed to show notification:', error);
  }
};

/**
 * Show a notification for timer warnings (e.g., 5 minutes left)
 */
export const showTimerWarningNotification = async (taskTitle: string, timeLeft: number): Promise<void> => {
  const hasPermission = await requestNotificationPermission();
  
  if (!hasPermission) {
    return;
  }

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) {
      return `${m}m${s > 0 ? ` ${s}s` : ''}`;
    }
    return `${s}s`;
  };

  const options: TimerNotificationOptions = {
    title: '⚠️ Timer Warning',
    body: `${formatTime(timeLeft)} left for "${taskTitle}"`,
    icon: '/favicon.svg',
    tag: 'timer-warning',
  };

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon,
      tag: options.tag,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

  } catch (error) {
    console.error('Failed to show warning notification:', error);
  }
};

/**
 * Play an audio alert (as backup for notifications)
 */
export const playTimerAlert = (): void => {
  try {
    // Create a simple beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800 Hz tone
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Failed to play audio alert:', error);
  }
};

/**
 * Check if notifications are supported and allowed
 */
export const areNotificationsSupported = (): boolean => {
  return 'Notification' in window && Notification.permission === 'granted';
};

/**
 * Initialize notification permissions on app start
 */
export const initializeNotifications = async (): Promise<void> => {
  if ('Notification' in window && Notification.permission === 'default') {
    // Don't auto-request on initialization, let user trigger it
    console.log('Notifications available but not yet requested');
  }
};
