'use client';

import { useState, useEffect, useCallback } from 'react';
import { websiteSyncClient } from '@/lib/sync-client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface GamificationData {
  xp: number;
  level: number;
  streak: number;
  badges: string[];
  questProgress: Record<string, any>;
}

interface SyncEvent {
  eventType: string;
  data: any;
  timestamp: Date;
}

export function useGamificationSync() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gamificationData, setGamificationData] = useState<GamificationData>({
    xp: 0,
    level: 1,
    streak: 0,
    badges: [],
    questProgress: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Initialize sync client when user is available
  useEffect(() => {
    if (user?.uid) {
      initializeSync();
    }

    return () => {
      websiteSyncClient.cleanup();
    };
  }, [user?.uid]);

  // Listen for sync updates
  useEffect(() => {
    const handleSyncUpdate = (event: CustomEvent) => {
      const { eventType, data } = event.detail;
      handleSyncEvent(eventType, data);
    };

    window.addEventListener('kamiSyncUpdate', handleSyncUpdate as EventListener);

    return () => {
      window.removeEventListener('kamiSyncUpdate', handleSyncUpdate as EventListener);
    };
  }, []);

  const initializeSync = async () => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      await websiteSyncClient.initialize(user.uid);
      await loadGamificationData();
    } catch (error) {
      console.error('Failed to initialize sync:', error);
      toast({
        title: 'Sync Error',
        description: 'Failed to initialize gamification sync',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadGamificationData = async () => {
    if (!user?.uid) return;

    try {
      // Load user's current gamification data
      const response = await fetch(`/api/user/gamification?userId=${user.uid}`);
      if (response.ok) {
        const data = await response.json();
        setGamificationData(data);
        setLastSync(new Date());
      }
    } catch (error) {
      console.error('Failed to load gamification data:', error);
    }
  };

  const handleSyncEvent = (eventType: string, data: any) => {
    switch (eventType) {
      case 'xpUpdate':
        setGamificationData(prev => ({
          ...prev,
          xp: data.xp,
          level: data.level
        }));
        
        if (data.xpGained > 0) {
          toast({
            title: 'XP Gained!',
            description: `+${data.xpGained} XP from Discord activity`,
          });
        }
        break;

      case 'levelUp':
        setGamificationData(prev => ({
          ...prev,
          level: data.newLevel
        }));
        
        toast({
          title: '🎉 Level Up!',
          description: `Congratulations! You reached level ${data.newLevel}!`,
        });
        break;

      case 'badgeUnlock':
        setGamificationData(prev => ({
          ...prev,
          badges: [...prev.badges, ...data.badges]
        }));
        
        toast({
          title: '🏆 Badge Unlocked!',
          description: `You earned a new badge from Discord!`,
        });
        break;

      case 'streakUpdate':
        setGamificationData(prev => ({
          ...prev,
          streak: data.streak
        }));
        
        if (data.streakBroken) {
          toast({
            title: 'Streak Broken',
            description: 'Your daily streak was reset',
            variant: 'destructive'
          });
        }
        break;

      case 'questProgress':
        setGamificationData(prev => ({
          ...prev,
          questProgress: {
            ...prev.questProgress,
            [data.questId]: {
              progress: data.progress,
              completed: data.completed
            }
          }
        }));
        
        if (data.completed) {
          toast({
            title: '✅ Quest Completed!',
            description: 'You completed a quest on Discord!',
          });
        }
        break;

      case 'accountLinked':
        toast({
          title: '🔗 Account Linked!',
          description: `Discord account @${data.discordUsername} linked successfully!`,
        });
        loadGamificationData(); // Reload data after linking
        break;

      case 'accountUnlinked':
        toast({
          title: 'Account Unlinked',
          description: 'Discord account has been unlinked',
          variant: 'destructive'
        });
        break;

      case 'profileUpdate':
        loadGamificationData(); // Reload data on profile updates
        break;
    }

    setLastSync(new Date());
  };

  const triggerWebhook = useCallback(async (eventType: string, data: any) => {
    if (!user?.uid) return;

    try {
      const response = await fetch('/api/webhooks/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          userId: user.uid,
          data,
          apiKey: process.env.NEXT_PUBLIC_WEBHOOK_API_KEY
        })
      });

      if (!response.ok) {
        throw new Error('Webhook failed');
      }
    } catch (error) {
      console.error('Webhook error:', error);
    }
  }, [user?.uid]);

  const awardXP = useCallback(async (action: string, amount: number, metadata: any = {}) => {
    await triggerWebhook('xp_gain', {
      xp: {
        amount,
        action,
        newTotal: gamificationData.xp + amount,
        newLevel: Math.floor(Math.sqrt((gamificationData.xp + amount) / 100)) + 1,
        oldLevel: gamificationData.level,
        ...metadata
      }
    });
  }, [triggerWebhook, gamificationData]);

  const trackAnimeWatch = useCallback(async (animeData: any, episodeData: any) => {
    await triggerWebhook('anime_watch', {
      anime: animeData,
      episode: episodeData
    });
  }, [triggerWebhook]);

  const trackMangaRead = useCallback(async (mangaData: any, chapterData: any) => {
    await triggerWebhook('manga_read', {
      manga: mangaData,
      chapter: chapterData
    });
  }, [triggerWebhook]);

  const trackQuestComplete = useCallback(async (questData: any) => {
    await triggerWebhook('quest_complete', {
      quest: questData
    });
  }, [triggerWebhook]);

  const trackBadgeUnlock = useCallback(async (badgeData: any) => {
    await triggerWebhook('badge_unlock', {
      badge: badgeData
    });
  }, [triggerWebhook]);

  const trackUserLogin = useCallback(async (loginData: any) => {
    await triggerWebhook('user_login', {
      login: {
        method: 'website',
        ipAddress: loginData.ipAddress,
        userAgent: navigator.userAgent,
        ...loginData
      }
    });
  }, [triggerWebhook]);

  const forceSync = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      await websiteSyncClient.forceSyncUser(user.uid);
      
      // Reload data after force sync
      setTimeout(loadGamificationData, 2000);
      
      toast({
        title: 'Sync Initiated',
        description: 'Your data is being synchronized with Discord',
      });
    } catch (error) {
      console.error('Force sync error:', error);
      toast({
        title: 'Sync Error',
        description: 'Failed to initiate sync',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, toast]);

  return {
    gamificationData,
    isLoading,
    lastSync,
    
    // Action tracking methods
    awardXP,
    trackAnimeWatch,
    trackMangaRead,
    trackQuestComplete,
    trackBadgeUnlock,
    trackUserLogin,
    
    // Sync management
    forceSync,
    loadGamificationData
  };
}
