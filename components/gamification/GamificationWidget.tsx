'use client'

import React from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  Star, 
  Flame, 
  Trophy, 
  Target, 
  Crown,
  TrendingUp,
  Award
} from 'lucide-react'
import { motion } from 'framer-motion'
import { getXPProgress, getXPForNextLevel } from '@/lib/utils'
import Link from 'next/link'

export default function GamificationWidget() {
  const { userProfile } = useAuth()

  if (!userProfile) return null

  const xpProgress = getXPProgress(userProfile.xp)
  const xpToNext = getXPForNextLevel(userProfile.xp)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-4 gap-4"
    >
      {/* XP and Level Card */}
      <Card className="bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border-neon-purple/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Star className="w-5 h-5 text-yellow-400" />
            <span>Level Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="neon" className="text-lg px-3 py-1">
                Level {userProfile.level}
              </Badge>
              <span className="text-2xl font-bold text-neon-purple">
                {userProfile.xp.toLocaleString()}
              </span>
            </div>
            <Progress value={xpProgress} className="h-3" />
            <p className="text-sm text-text-muted">
              {xpToNext} XP to Level {userProfile.level + 1}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Streak Card */}
      <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Flame className="w-5 h-5 text-orange-400 streak-flame" />
            <span>Daily Streak</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">
                {userProfile.streak}
              </div>
              <p className="text-sm text-text-muted">
                {userProfile.streak === 1 ? 'day' : 'days'}
              </p>
            </div>
            {userProfile.streak > 0 && (
              <div className="text-center">
                <Badge variant="warning" className="text-xs">
                  🔥 On Fire!
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Badges Card */}
      <Card className="bg-gradient-to-br from-green-500/20 to-blue-500/20 border-green-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Award className="w-5 h-5 text-green-400" />
            <span>Badges</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">
                {userProfile.badges.length}
              </div>
              <p className="text-sm text-text-muted">earned</p>
            </div>
            <Link href="/profile?tab=badges">
              <Button variant="ghost" size="sm" className="w-full">
                View All
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card className="bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border-neon-cyan/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Target className="w-5 h-5 text-neon-cyan" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Link href="/leaderboard">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Trophy className="w-4 h-4 mr-2" />
                Leaderboard
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Stats
              </Button>
            </Link>
            {userProfile.isPremium && (
              <Badge variant="warning" className="w-full justify-center">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
