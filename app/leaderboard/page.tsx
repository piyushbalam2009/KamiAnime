'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { 
  Trophy, 
  Medal, 
  Crown, 
  Star, 
  Flame, 
  TrendingUp,
  Calendar,
  Users
} from 'lucide-react'
import { motion } from 'framer-motion'

interface LeaderboardUser {
  uid: string
  displayName: string
  photoURL?: string
  xp: number
  level: number
  streak: number
  isPremium: boolean
  badges: string[]
}

export default function LeaderboardPage() {
  const { userProfile } = useAuth()
  const [globalLeaders, setGlobalLeaders] = useState<LeaderboardUser[]>([])
  const [weeklyLeaders, setWeeklyLeaders] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'global' | 'weekly'>('global')
  const [userRank, setUserRank] = useState<number | null>(null)

  useEffect(() => {
    fetchLeaderboards()
  }, [])

  const fetchLeaderboards = async () => {
    try {
      // Fetch global leaderboard
      const globalQuery = query(
        collection(db, 'users'),
        orderBy('xp', 'desc'),
        limit(50)
      )
      const globalSnapshot = await getDocs(globalQuery)
      const globalData: LeaderboardUser[] = []
      
      globalSnapshot.forEach((doc) => {
        const data = doc.data()
        globalData.push({
          uid: doc.id,
          displayName: data.displayName || 'Anonymous',
          photoURL: data.photoURL,
          xp: data.xp || 0,
          level: data.level || 1,
          streak: data.streak || 0,
          isPremium: data.isPremium || false,
          badges: data.badges || []
        })
      })
      
      setGlobalLeaders(globalData)

      // Find user's rank
      if (userProfile) {
        const userIndex = globalData.findIndex(user => user.uid === userProfile.uid)
        setUserRank(userIndex >= 0 ? userIndex + 1 : null)
      }

      // For weekly, we'll use the same data for now
      // In a real implementation, you'd track weekly XP separately
      setWeeklyLeaders(globalData.slice(0, 20))

    } catch (error) {
      console.error('Error fetching leaderboards:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-text-muted">#{rank}</span>
    }
  }

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/30'
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30'
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-600/30'
      default:
        return 'bg-dark-card border-dark-border hover:border-neon-purple/30'
    }
  }

  const currentLeaders = activeTab === 'global' ? globalLeaders : weeklyLeaders

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-4">
            <span className="gradient-text">Leaderboard</span>
          </h1>
          <p className="text-text-secondary text-lg">
            Compete with fellow otaku and climb the ranks!
          </p>
        </motion.div>

        {/* User's Rank Card */}
        {userProfile && userRank && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 border-neon-purple/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getRankIcon(userRank)}
                      <span className="text-2xl font-bold">#{userRank}</span>
                    </div>
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={userProfile.photoURL} />
                      <AvatarFallback>{userProfile.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{userProfile.displayName}</h3>
                      <p className="text-text-muted">Your current rank</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-neon-purple">
                      {userProfile.xp.toLocaleString()} XP
                    </div>
                    <div className="text-text-muted">Level {userProfile.level}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-dark-surface rounded-lg p-1 flex">
            <Button
              onClick={() => setActiveTab('global')}
              variant={activeTab === 'global' ? 'neon' : 'ghost'}
              className="flex items-center space-x-2"
            >
              <Trophy className="w-4 h-4" />
              <span>Global</span>
            </Button>
            <Button
              onClick={() => setActiveTab('weekly')}
              variant={activeTab === 'weekly' ? 'neon' : 'ghost'}
              className="flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Weekly</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-dark-card border-dark-border">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-neon-purple mx-auto mb-2" />
              <div className="text-2xl font-bold">{globalLeaders.length}</div>
              <div className="text-text-muted text-sm">Active Users</div>
            </CardContent>
          </Card>
          
          <Card className="bg-dark-card border-dark-border">
            <CardContent className="p-6 text-center">
              <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {globalLeaders[0]?.xp.toLocaleString() || '0'}
              </div>
              <div className="text-text-muted text-sm">Highest XP</div>
            </CardContent>
          </Card>

          <Card className="bg-dark-card border-dark-border">
            <CardContent className="p-6 text-center">
              <Flame className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {Math.max(...globalLeaders.map(u => u.streak), 0)}
              </div>
              <div className="text-text-muted text-sm">Longest Streak</div>
            </CardContent>
          </Card>

          <Card className="bg-dark-card border-dark-border">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-neon-cyan mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {Math.max(...globalLeaders.map(u => u.level), 0)}
              </div>
              <div className="text-text-muted text-sm">Highest Level</div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-dark-card border-dark-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-neon-purple" />
                <span>
                  {activeTab === 'global' ? 'Global Rankings' : 'Weekly Rankings'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6">
                  <div className="space-y-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4">
                        <div className="w-8 h-8 bg-dark-surface rounded animate-pulse" />
                        <div className="w-12 h-12 bg-dark-surface rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-dark-surface rounded animate-pulse" />
                          <div className="h-3 bg-dark-surface rounded w-1/2 animate-pulse" />
                        </div>
                        <div className="w-20 h-6 bg-dark-surface rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-dark-border">
                  {currentLeaders.map((user, index) => {
                    const rank = index + 1
                    const isCurrentUser = userProfile?.uid === user.uid
                    
                    return (
                      <motion.div
                        key={user.uid}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 transition-all duration-200 ${getRankBg(rank)} ${
                          isCurrentUser ? 'ring-2 ring-neon-purple/50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          {/* Rank */}
                          <div className="flex-shrink-0">
                            {getRankIcon(rank)}
                          </div>

                          {/* Avatar */}
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback>
                              {user.displayName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-white truncate">
                                {user.displayName}
                              </h3>
                              {user.isPremium && (
                                <Crown className="w-4 h-4 text-yellow-400" />
                              )}
                              {isCurrentUser && (
                                <Badge variant="neon" className="text-xs">You</Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-text-muted">
                              <span>Level {user.level}</span>
                              {user.streak > 0 && (
                                <div className="flex items-center space-x-1">
                                  <Flame className="w-3 h-3 text-orange-400" />
                                  <span>{user.streak}</span>
                                </div>
                              )}
                              <span>{user.badges.length} badges</span>
                            </div>
                          </div>

                          {/* XP */}
                          <div className="text-right">
                            <div className="font-bold text-lg text-neon-purple">
                              {user.xp.toLocaleString()}
                            </div>
                            <div className="text-xs text-text-muted">XP</div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Call to Action */}
        {!userProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-center"
          >
            <Card className="bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 border-neon-purple/30">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Join the Competition!</h3>
                <p className="text-text-secondary mb-6">
                  Sign up to start earning XP, unlocking badges, and climbing the leaderboard!
                </p>
                <Button variant="neon" size="lg">
                  Sign Up Now
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  )
}
