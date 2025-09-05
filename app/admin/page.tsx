'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { collection, query, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Users, 
  Crown, 
  Ban, 
  Shield, 
  TrendingUp, 
  Star,
  Activity,
  DollarSign,
  Eye,
  AlertTriangle
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface AdminUser {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  xp: number
  level: number
  isPremium: boolean
  isAdmin: boolean
  createdAt: string
  lastActive: string
  watchlist: string[]
  badges: string[]
}

export default function AdminDashboard() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    activeUsers: 0,
    totalXP: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userProfile?.isAdmin) {
      router.push('/')
      return
    }
    fetchAdminData()
  }, [userProfile, router])

  const fetchAdminData = async () => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(100)
      )
      const usersSnapshot = await getDocs(usersQuery)
      const usersData: AdminUser[] = []
      
      let totalXP = 0
      let premiumCount = 0
      let activeCount = 0
      
      usersSnapshot.forEach((doc) => {
        const data = doc.data()
        const user: AdminUser = {
          uid: doc.id,
          displayName: data.displayName || 'Anonymous',
          email: data.email || '',
          photoURL: data.photoURL,
          xp: data.xp || 0,
          level: data.level || 1,
          isPremium: data.isPremium || false,
          isAdmin: data.isAdmin || false,
          createdAt: data.createdAt || '',
          lastActive: data.lastActive || '',
          watchlist: data.watchlist || [],
          badges: data.badges || []
        }
        
        usersData.push(user)
        totalXP += user.xp
        if (user.isPremium) premiumCount++
        
        // Check if active in last 7 days
        const lastActive = new Date(user.lastActive)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        if (lastActive > weekAgo) activeCount++
      })
      
      setUsers(usersData)
      setStats({
        totalUsers: usersData.length,
        premiumUsers: premiumCount,
        activeUsers: activeCount,
        totalXP
      })
    } catch (error) {
      console.error('Error fetching admin data:', error)
      toast.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const togglePremium = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isPremium: !currentStatus
      })
      
      setUsers(users.map(user => 
        user.uid === userId 
          ? { ...user, isPremium: !currentStatus }
          : user
      ))
      
      toast.success(`User ${!currentStatus ? 'granted' : 'removed'} premium status`)
    } catch (error) {
      console.error('Error updating premium status:', error)
      toast.error('Failed to update premium status')
    }
  }

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isAdmin: !currentStatus
      })
      
      setUsers(users.map(user => 
        user.uid === userId 
          ? { ...user, isAdmin: !currentStatus }
          : user
      ))
      
      toast.success(`User ${!currentStatus ? 'granted' : 'removed'} admin privileges`)
    } catch (error) {
      console.error('Error updating admin status:', error)
      toast.error('Failed to update admin status')
    }
  }

  if (!userProfile?.isAdmin) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-text-muted">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-8 h-8 text-neon-purple" />
            <h1 className="text-4xl font-bold gradient-text">Admin Dashboard</h1>
          </div>
          <p className="text-text-secondary">Manage users, content, and platform analytics</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border-neon-purple/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-muted text-sm">Total Users</p>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-neon-purple" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-muted text-sm">Premium Users</p>
                  <p className="text-3xl font-bold">{stats.premiumUsers}</p>
                </div>
                <Crown className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-muted text-sm">Active Users</p>
                  <p className="text-3xl font-bold">{stats.activeUsers}</p>
                </div>
                <Activity className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-muted text-sm">Total XP</p>
                  <p className="text-3xl font-bold">{stats.totalXP.toLocaleString()}</p>
                </div>
                <Star className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <Card className="bg-dark-card border-dark-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>User Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 animate-pulse">
                    <div className="w-12 h-12 bg-dark-surface rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-dark-surface rounded w-1/4" />
                      <div className="h-3 bg-dark-surface rounded w-1/3" />
                    </div>
                    <div className="w-20 h-8 bg-dark-surface rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.uid} className="flex items-center justify-between p-4 bg-dark-surface rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user.photoURL} />
                        <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{user.displayName}</h3>
                          {user.isPremium && <Crown className="w-4 h-4 text-yellow-400" />}
                          {user.isAdmin && <Shield className="w-4 h-4 text-neon-purple" />}
                        </div>
                        <p className="text-sm text-text-muted">{user.email}</p>
                        <div className="flex items-center space-x-4 text-xs text-text-muted mt-1">
                          <span>Level {user.level}</span>
                          <span>{user.xp.toLocaleString()} XP</span>
                          <span>{user.badges.length} badges</span>
                          <span>{user.watchlist.length} watchlist</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => togglePremium(user.uid, user.isPremium)}
                        variant={user.isPremium ? "secondary" : "outline"}
                        size="sm"
                      >
                        <Crown className="w-4 h-4 mr-1" />
                        {user.isPremium ? 'Remove Premium' : 'Grant Premium'}
                      </Button>
                      
                      <Button
                        onClick={() => toggleAdmin(user.uid, user.isAdmin)}
                        variant={user.isAdmin ? "secondary" : "outline"}
                        size="sm"
                        disabled={user.uid === userProfile?.uid}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  )
}
