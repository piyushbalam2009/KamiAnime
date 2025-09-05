'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Menu, 
  X, 
  User, 
  Settings, 
  LogOut, 
  Crown,
  Flame,
  Star
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Navbar() {
  const { user, userProfile, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to search page
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`
    }
  }

  return (
    <nav className="sticky top-0 z-50 glass-effect border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-neon-gradient rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="text-xl font-bold gradient-text">KamiAnime</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/anime" className="text-text-secondary hover:text-white transition-colors">
              Anime
            </Link>
            <Link href="/manga" className="text-text-secondary hover:text-white transition-colors">
              Manga
            </Link>
            <Link href="/leaderboard" className="text-text-secondary hover:text-white transition-colors">
              Leaderboard
            </Link>
            <Link href="/community" className="text-text-secondary hover:text-white transition-colors">
              Community
            </Link>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
              <input
                type="text"
                placeholder="Search anime, manga..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-white placeholder-text-muted focus:border-neon-purple focus:outline-none transition-colors"
              />
            </div>
          </form>

          {/* User Section */}
          <div className="flex items-center space-x-4">
            {user && userProfile ? (
              <div className="flex items-center space-x-3">
                {/* XP and Level */}
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium">{userProfile.xp}</span>
                  </div>
                  <Badge variant="neon" className="text-xs">
                    Lv.{userProfile.level}
                  </Badge>
                  {userProfile.streak > 0 && (
                    <div className="flex items-center space-x-1">
                      <Flame className="w-4 h-4 text-orange-400 streak-flame" />
                      <span className="text-sm font-medium">{userProfile.streak}</span>
                    </div>
                  )}
                </div>

                {/* Premium Badge */}
                {userProfile.isPremium && (
                  <Badge variant="warning" className="hidden sm:flex">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                )}

                {/* User Avatar */}
                <div className="relative group">
                  <Avatar className="w-8 h-8 cursor-pointer ring-2 ring-neon-purple/30 hover:ring-neon-purple/60 transition-all">
                    <AvatarImage src={userProfile.photoURL} />
                    <AvatarFallback className="bg-neon-purple text-white">
                      {userProfile.displayName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-dark-surface border border-dark-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="p-3 border-b border-dark-border">
                      <p className="font-medium text-white">{userProfile.displayName}</p>
                      <p className="text-sm text-text-muted">{userProfile.email}</p>
                    </div>
                    <div className="py-2">
                      <Link href="/profile" className="flex items-center px-3 py-2 text-sm text-text-secondary hover:text-white hover:bg-dark-card transition-colors">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Link>
                      <Link href="/settings" className="flex items-center px-3 py-2 text-sm text-text-secondary hover:text-white hover:bg-dark-card transition-colors">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Link>
                      {userProfile.isAdmin && (
                        <Link href="/admin" className="flex items-center px-3 py-2 text-sm text-text-secondary hover:text-white hover:bg-dark-card transition-colors">
                          <Crown className="w-4 h-4 mr-2" />
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={logout}
                        className="flex items-center w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-dark-card transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="neon" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-text-secondary hover:text-white transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/10 py-4"
            >
              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search anime, manga..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-white placeholder-text-muted focus:border-neon-purple focus:outline-none transition-colors"
                  />
                </div>
              </form>

              {/* Mobile Navigation Links */}
              <div className="space-y-2">
                <Link href="/anime" className="block py-2 text-text-secondary hover:text-white transition-colors">
                  Anime
                </Link>
                <Link href="/manga" className="block py-2 text-text-secondary hover:text-white transition-colors">
                  Manga
                </Link>
                <Link href="/leaderboard" className="block py-2 text-text-secondary hover:text-white transition-colors">
                  Leaderboard
                </Link>
                <Link href="/community" className="block py-2 text-text-secondary hover:text-white transition-colors">
                  Community
                </Link>
              </div>

              {/* Mobile User Stats */}
              {user && userProfile && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium">{userProfile.xp} XP</span>
                    </div>
                    <Badge variant="neon" className="text-xs">
                      Level {userProfile.level}
                    </Badge>
                  </div>
                  {userProfile.streak > 0 && (
                    <div className="flex items-center space-x-2 mt-2">
                      <Flame className="w-4 h-4 text-orange-400 streak-flame" />
                      <span className="text-sm font-medium">{userProfile.streak} day streak</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}
