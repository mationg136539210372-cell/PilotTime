import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null; // Don't show anything when online
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 z-50">
      <WifiOff size={16} />
      <span>You're offline - Your data is saved locally</span>
    </div>
  );
}