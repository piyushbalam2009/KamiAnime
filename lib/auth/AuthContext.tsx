'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import toast from 'react-hot-toast'

interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  isAdmin: boolean
  isPremium: boolean
  xp: number
  level: number
  streak: number
  lastActive: string
  badges: string[]
  watchlist: string[]
  mangaLibrary: string[]
  discordId?: string
  createdAt: string
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>
  addXP: (amount: number, reason?: string) => Promise<void>
  updateStreak: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        await loadUserProfile(user.uid)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const loadUserProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const createUserProfile = async (user: User, additionalData: any = {}) => {
    const userRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      const { displayName, email, photoURL } = user
      const profile: UserProfile = {
        uid: user.uid,
        email: email || '',
        displayName: displayName || '',
        photoURL: photoURL || '',
        isAdmin: false,
        isPremium: false,
        xp: 0,
        level: 1,
        streak: 0,
        lastActive: new Date().toISOString(),
        badges: [],
        watchlist: [],
        mangaLibrary: [],
        createdAt: new Date().toISOString(),
        ...additionalData
      }

      try {
        await setDoc(userRef, profile)
        setUserProfile(profile)
        toast.success('Welcome to KamiAnime!')
      } catch (error) {
        console.error('Error creating user profile:', error)
        toast.error('Failed to create profile')
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      await updateLastActive(result.user.uid)
      toast.success('Welcome back!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in')
      throw error
    }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName })
      await createUserProfile(result.user, { displayName })
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account')
      throw error
    }
  }

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      await createUserProfile(result.user)
      await updateLastActive(result.user.uid)
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google')
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      setUserProfile(null)
      toast.success('Signed out successfully')
    } catch (error: any) {
      toast.error('Failed to sign out')
    }
  }

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return

    try {
      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, updates)
      setUserProfile(prev => prev ? { ...prev, ...updates } : null)
    } catch (error) {
      console.error('Error updating user profile:', error)
      toast.error('Failed to update profile')
    }
  }

  const updateLastActive = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid)
      await updateDoc(userRef, { lastActive: new Date().toISOString() })
    } catch (error) {
      console.error('Error updating last active:', error)
    }
  }

  const addXP = async (amount: number, reason?: string) => {
    if (!userProfile) return

    const newXP = userProfile.xp + amount
    const newLevel = Math.floor(newXP / 1000) + 1
    const leveledUp = newLevel > userProfile.level

    await updateUserProfile({ 
      xp: newXP, 
      level: newLevel 
    })

    if (leveledUp) {
      toast.success(`Level up! You're now level ${newLevel}!`, {
        duration: 5000,
        icon: '🎉'
      })
    } else if (reason) {
      toast.success(`+${amount} XP - ${reason}`, {
        duration: 3000,
        icon: '⭐'
      })
    }
  }

  const updateStreak = async () => {
    if (!userProfile) return

    const today = new Date().toDateString()
    const lastActive = new Date(userProfile.lastActive).toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    let newStreak = userProfile.streak

    if (lastActive === today) {
      // Already active today, no change
      return
    } else if (lastActive === yesterday) {
      // Consecutive day, increment streak
      newStreak += 1
    } else {
      // Streak broken, reset to 1
      newStreak = 1
    }

    await updateUserProfile({ 
      streak: newStreak,
      lastActive: new Date().toISOString()
    })

    if (newStreak > 1) {
      toast.success(`${newStreak} day streak! 🔥`, {
        duration: 4000
      })
    }
  }

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    updateUserProfile,
    addXP,
    updateStreak
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
