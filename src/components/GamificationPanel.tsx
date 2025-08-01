import React, { useState } from 'react';
import { 
  Trophy, 
  Target, 
  Flame, 
  Star, 
  Award, 
  TrendingUp, 
  Calendar,
  Clock,
  CheckCircle2,
  Zap,
  ChevronRight,
  Gift
} from 'lucide-react';
import { GamificationData, Achievement, DailyChallenge } from '../types-gamification';

interface GamificationPanelProps {
  gamificationData: GamificationData;
  onClosePanel?: () => void;
}

const GamificationPanel: React.FC<GamificationPanelProps> = ({ 
  gamificationData, 
  onClosePanel 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'stats' | 'challenges'>('overview');
  
  const { stats, level, streak, achievements, unlockedAchievements, dailyChallenge, recentUnlocks } = gamificationData;

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 dark:text-gray-400';
      case 'rare': return 'text-blue-600 dark:text-blue-400';
      case 'epic': return 'text-purple-600 dark:text-purple-400';
      case 'legendary': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getRarityBg = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 dark:bg-gray-700';
      case 'rare': return 'bg-blue-100 dark:bg-blue-900/30';
      case 'epic': return 'bg-purple-100 dark:bg-purple-900/30';
      case 'legendary': return 'bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'bg-gray-100 dark:bg-gray-700';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Level Progress */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Level {level.current}</h3>
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{level.title}</p>
          </div>
          <div className="text-3xl">🏆</div>
        </div>
        
        <div className="mb-3">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>{level.points} points</span>
            <span>{level.pointsToNext > 0 ? `${level.pointsToNext} to next level` : 'Max level!'}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: level.pointsToNext > 0 
                  ? `${((level.points % 1000) / (level.pointsToNext + (level.points % 1000))) * 100}%` 
                  : '100%' 
              }}
            ></div>
          </div>
        </div>
        
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Benefits: {level.benefits.join(', ')}
        </div>
      </div>

      {/* Current Streak */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-6 rounded-xl border border-orange-200 dark:border-orange-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Flame className="text-orange-500" size={24} />
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Study Streak</h3>
            </div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{streak.current} days</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Longest: {streak.longest} days</p>
          </div>
          <div className="text-right">
            <div className="text-3xl mb-2">🔥</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Keep it going!</p>
          </div>
        </div>
      </div>

      {/* Daily Challenge */}
      {dailyChallenge && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Target className="text-green-600 dark:text-green-400" size={20} />
              <h3 className="font-bold text-gray-800 dark:text-white">Daily Challenge</h3>
            </div>
            <span className="text-2xl">{dailyChallenge.icon}</span>
          </div>
          
          <h4 className="font-semibold text-gray-800 dark:text-white mb-1">{dailyChallenge.title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{dailyChallenge.description}</p>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {dailyChallenge.progress}/{dailyChallenge.target}
            </span>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              {dailyChallenge.points} points
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(dailyChallenge.progress / dailyChallenge.target) * 100}%` }}
            ></div>
          </div>
          
          {dailyChallenge.completed && (
            <div className="mt-2 flex items-center space-x-1 text-green-600 dark:text-green-400">
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">Completed!</span>
            </div>
          )}
        </div>
      )}

      {/* Recent Unlocks */}
      {recentUnlocks.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-center space-x-2 mb-4">
            <Gift className="text-yellow-600 dark:text-yellow-400" size={20} />
            <h3 className="font-bold text-gray-800 dark:text-white">Recent Achievements</h3>
          </div>
          
          <div className="space-y-2">
            {recentUnlocks.slice(0, 3).map(achievementId => {
              const achievement = achievements.find(a => a.id === achievementId);
              if (!achievement) return null;
              
              return (
                <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <span className="text-2xl">{achievement.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 dark:text-white">{achievement.title}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{achievement.description}</p>
                  </div>
                  <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    +{achievement.points}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="text-blue-500" size={18} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Hours</span>
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{stats.totalStudyHours.toFixed(1)}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle2 className="text-green-500" size={18} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tasks Done</span>
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{stats.totalTasksCompleted}</p>
        </div>
      </div>
    </div>
  );

  const renderAchievements = () => (
    <div className="space-y-4">
      {achievements.map((achievement) => {
        const isUnlocked = unlockedAchievements.includes(achievement.id);
        const progress = achievement.progress || 0;
        
        return (
          <div 
            key={achievement.id}
            className={`p-4 rounded-lg border transition-all duration-200 ${
              isUnlocked 
                ? `${getRarityBg(achievement.rarity)} border-current ${getRarityColor(achievement.rarity)}` 
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className={`text-3xl ${isUnlocked ? '' : 'grayscale'}`}>
                {achievement.icon}
              </span>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className={`font-medium ${isUnlocked ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {achievement.title}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRarityColor(achievement.rarity)} ${getRarityBg(achievement.rarity)}`}>
                    {achievement.rarity}
                  </span>
                </div>
                
                <p className={`text-sm ${isUnlocked ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-500'}`}>
                  {achievement.description}
                </p>
                
                {!isUnlocked && achievement.condition && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Progress: {progress}/{achievement.condition.target}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div 
                        className="bg-gray-400 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((progress / achievement.condition.target) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <span className={`text-sm font-medium ${isUnlocked ? getRarityColor(achievement.rarity) : 'text-gray-400'}`}>
                  {achievement.points} pts
                </span>
                {isUnlocked && achievement.unlockedAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderStats = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="text-blue-500" size={20} />
            <span className="font-medium text-gray-800 dark:text-white">Study Time</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalStudyHours.toFixed(1)}h</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total hours studied</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle2 className="text-green-500" size={20} />
            <span className="font-medium text-gray-800 dark:text-white">Tasks</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalTasksCompleted}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tasks completed</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="text-yellow-500" size={20} />
            <span className="font-medium text-gray-800 dark:text-white">Efficiency</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.efficiencyScore}%</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Estimation accuracy</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="text-purple-500" size={20} />
            <span className="font-medium text-gray-800 dark:text-white">Average Session</span>
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.averageSessionLength.toFixed(0)}m</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Minutes per session</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-800 dark:text-white mb-3">Study Patterns</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Favorite study time:</span>
            <span className="text-sm font-medium text-gray-800 dark:text-white capitalize">
              {stats.favoriteStudyTime}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Longest streak:</span>
            <span className="text-sm font-medium text-gray-800 dark:text-white">
              {stats.longestStreak} days
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Perfect weeks:</span>
            <span className="text-sm font-medium text-gray-800 dark:text-white">
              {stats.perfectWeeks}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Early finishes:</span>
            <span className="text-sm font-medium text-gray-800 dark:text-white">
              {stats.earlyFinishes}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trophy className="text-yellow-500" size={28} />
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Progress & Achievements</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track your study journey</p>
            </div>
          </div>
          {onClosePanel && (
            <button
              onClick={onClosePanel}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-4 bg-white/50 dark:bg-gray-800/50 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'achievements', label: 'Achievements', icon: Award },
            { id: 'stats', label: 'Statistics', icon: Star },
          ].map(tab => (
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
      <div className="p-6 max-h-96 overflow-y-auto">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'achievements' && renderAchievements()}
        {activeTab === 'stats' && renderStats()}
      </div>
    </div>
  );
};

export default GamificationPanel;
