export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  category: 'anime' | 'manga' | 'community' | 'special' | 'streak'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  condition: {
    type: 'episodes_watched' | 'manga_chapters' | 'streak_days' | 'xp_earned' | 'community_activity' | 'special'
    value?: number
    metadata?: any
  }
  xpReward: number
  unlocked?: boolean
  unlockedAt?: string
}

export const BADGES: Badge[] = [
  // Anime Badges
  {
    id: 'first_episode',
    name: 'First Steps',
    description: 'Watch your first episode',
    icon: '🎬',
    category: 'anime',
    rarity: 'common',
    condition: { type: 'episodes_watched', value: 1 },
    xpReward: 50
  },
  {
    id: 'anime_explorer',
    name: 'Anime Explorer',
    description: 'Watch 10 episodes',
    icon: '🗺️',
    category: 'anime',
    rarity: 'common',
    condition: { type: 'episodes_watched', value: 10 },
    xpReward: 100
  },
  {
    id: 'binge_watcher',
    name: 'Binge Watcher',
    description: 'Watch 50 episodes',
    icon: '📺',
    category: 'anime',
    rarity: 'rare',
    condition: { type: 'episodes_watched', value: 50 },
    xpReward: 250
  },
  {
    id: 'anime_addict',
    name: 'Anime Addict',
    description: 'Watch 100 episodes',
    icon: '🎭',
    category: 'anime',
    rarity: 'epic',
    condition: { type: 'episodes_watched', value: 100 },
    xpReward: 500
  },
  {
    id: 'otaku_master',
    name: 'Otaku Master',
    description: 'Watch 500 episodes',
    icon: '👑',
    category: 'anime',
    rarity: 'legendary',
    condition: { type: 'episodes_watched', value: 500 },
    xpReward: 1000
  },

  // Manga Badges
  {
    id: 'first_chapter',
    name: 'Page Turner',
    description: 'Read your first manga chapter',
    icon: '📖',
    category: 'manga',
    rarity: 'common',
    condition: { type: 'manga_chapters', value: 1 },
    xpReward: 50
  },
  {
    id: 'manga_reader',
    name: 'Manga Reader',
    description: 'Read 25 chapters',
    icon: '📚',
    category: 'manga',
    rarity: 'common',
    condition: { type: 'manga_chapters', value: 25 },
    xpReward: 100
  },
  {
    id: 'bookworm',
    name: 'Bookworm',
    description: 'Read 100 chapters',
    icon: '🐛',
    category: 'manga',
    rarity: 'rare',
    condition: { type: 'manga_chapters', value: 100 },
    xpReward: 250
  },
  {
    id: 'manga_master',
    name: 'Manga Master',
    description: 'Read 500 chapters',
    icon: '📜',
    category: 'manga',
    rarity: 'epic',
    condition: { type: 'manga_chapters', value: 500 },
    xpReward: 500
  },

  // Streak Badges
  {
    id: 'daily_visitor',
    name: 'Daily Visitor',
    description: 'Visit KamiAnime for 3 consecutive days',
    icon: '🔥',
    category: 'streak',
    rarity: 'common',
    condition: { type: 'streak_days', value: 3 },
    xpReward: 75
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '⚡',
    category: 'streak',
    rarity: 'rare',
    condition: { type: 'streak_days', value: 7 },
    xpReward: 200
  },
  {
    id: 'month_master',
    name: 'Month Master',
    description: 'Maintain a 30-day streak',
    icon: '🌟',
    category: 'streak',
    rarity: 'epic',
    condition: { type: 'streak_days', value: 30 },
    xpReward: 750
  },
  {
    id: 'streak_legend',
    name: 'Streak Legend',
    description: 'Maintain a 100-day streak',
    icon: '💎',
    category: 'streak',
    rarity: 'legendary',
    condition: { type: 'streak_days', value: 100 },
    xpReward: 2000
  },

  // XP Badges
  {
    id: 'xp_collector',
    name: 'XP Collector',
    description: 'Earn 1,000 XP',
    icon: '⭐',
    category: 'special',
    rarity: 'common',
    condition: { type: 'xp_earned', value: 1000 },
    xpReward: 100
  },
  {
    id: 'xp_hunter',
    name: 'XP Hunter',
    description: 'Earn 5,000 XP',
    icon: '🎯',
    category: 'special',
    rarity: 'rare',
    condition: { type: 'xp_earned', value: 5000 },
    xpReward: 250
  },
  {
    id: 'xp_master',
    name: 'XP Master',
    description: 'Earn 25,000 XP',
    icon: '🏆',
    category: 'special',
    rarity: 'epic',
    condition: { type: 'xp_earned', value: 25000 },
    xpReward: 1000
  },

  // Community Badges
  {
    id: 'community_helper',
    name: 'Community Helper',
    description: 'Join the Discord server',
    icon: '🤝',
    category: 'community',
    rarity: 'common',
    condition: { type: 'special', metadata: { action: 'discord_join' } },
    xpReward: 100
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Watch anime between 12 AM - 6 AM',
    icon: '🦉',
    category: 'special',
    rarity: 'rare',
    condition: { type: 'special', metadata: { action: 'night_watch' } },
    xpReward: 150
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Watch anime between 5 AM - 8 AM',
    icon: '🐦',
    category: 'special',
    rarity: 'rare',
    condition: { type: 'special', metadata: { action: 'morning_watch' } },
    xpReward: 150
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Watch 10 episodes on weekends',
    icon: '⚔️',
    category: 'special',
    rarity: 'rare',
    condition: { type: 'special', metadata: { action: 'weekend_binge' } },
    xpReward: 200
  },
  {
    id: 'genre_explorer',
    name: 'Genre Explorer',
    description: 'Watch anime from 5 different genres',
    icon: '🌈',
    category: 'anime',
    rarity: 'rare',
    condition: { type: 'special', metadata: { action: 'genre_diversity' } },
    xpReward: 300
  }
]

export function getBadgesByCategory(category: Badge['category']) {
  return BADGES.filter(badge => badge.category === category)
}

export function getBadgesByRarity(rarity: Badge['rarity']) {
  return BADGES.filter(badge => badge.rarity === rarity)
}

export function getBadgeById(id: string) {
  return BADGES.find(badge => badge.id === id)
}

export function checkBadgeEligibility(badge: Badge, userStats: any): boolean {
  switch (badge.condition.type) {
    case 'episodes_watched':
      return userStats.episodesWatched >= (badge.condition.value || 0)
    case 'manga_chapters':
      return userStats.chaptersRead >= (badge.condition.value || 0)
    case 'streak_days':
      return userStats.streak >= (badge.condition.value || 0)
    case 'xp_earned':
      return userStats.xp >= (badge.condition.value || 0)
    case 'special':
      // Handle special conditions based on metadata
      return false // Implement specific logic as needed
    default:
      return false
  }
}
