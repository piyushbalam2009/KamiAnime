'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { getTrendingAnime, getPopularAnime } from '@/lib/api/anime'
import { getTrendingManga } from '@/lib/api/manga'
import { AnimeInfo } from '@/lib/api/anime'
import { MangaInfo } from '@/lib/api/manga'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import AnimeCard from '@/components/anime/AnimeCard'
import MangaCard from '@/components/manga/MangaCard'
import GamificationWidget from '@/components/gamification/GamificationWidget'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BannerAd } from '@/components/monetization/AdSenseAd'
import PremiumUpgrade from '@/components/monetization/PremiumUpgrade'
import { Badge } from '@/components/ui/badge'
import { Play, BookOpen, TrendingUp, Star, Users, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function HomePage() {
  const { user, userProfile, updateStreak } = useAuth()
  const [trendingAnime, setTrendingAnime] = useState<AnimeInfo[]>([])
  const [popularAnime, setPopularAnime] = useState<AnimeInfo[]>([])
  const [trendingManga, setTrendingManga] = useState<MangaInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trending, popular, manga] = await Promise.all([
          getTrendingAnime(),
          getPopularAnime(),
          getTrendingManga()
        ])
        
        setTrendingAnime(trending.slice(0, 10))
        setPopularAnime(popular.slice(0, 10))
        setTrendingManga(manga.slice(0, 10))
      } catch (error) {
        console.error('Error fetching homepage data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Update user streak if logged in
    if (user && userProfile) {
      updateStreak()
    }
  }, [user, userProfile, updateStreak])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />
      
      <main className="relative">
        {/* Hero Section */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 via-dark-bg to-neon-cyan/20" />
          <div className="absolute inset-0 bg-[url('/hero-pattern.svg')] opacity-10" />
          
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 text-center max-w-4xl mx-auto px-4"
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-6">
              <span className="gradient-text">KamiAnime</span>
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary mb-8 max-w-2xl mx-auto">
              Stream anime, read manga, and level up your otaku journey with our gamified platform
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link href="/anime">
                <Button size="lg" variant="neon" className="w-full sm:w-auto">
                  <Play className="w-5 h-5 mr-2" />
                  Start Watching
                </Button>
              </Link>
              <Link href="/manga">
                <Button size="lg" variant="glass" className="w-full sm:w-auto">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Start Reading
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="glass-effect rounded-lg p-4">
                <div className="text-2xl font-bold text-neon-purple">10K+</div>
                <div className="text-sm text-text-muted">Anime Episodes</div>
              </div>
              <div className="glass-effect rounded-lg p-4">
                <div className="text-2xl font-bold text-neon-cyan">5K+</div>
                <div className="text-sm text-text-muted">Manga Chapters</div>
              </div>
              <div className="glass-effect rounded-lg p-4">
                <div className="text-2xl font-bold text-neon-purple">1K+</div>
                <div className="text-sm text-text-muted">Active Users</div>
              </div>
              <div className="glass-effect rounded-lg p-4">
                <div className="text-2xl font-bold text-neon-cyan">24/7</div>
                <div className="text-sm text-text-muted">Streaming</div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Gamification Widget */}
        {user && userProfile && (
          <section className="py-8 px-4">
            <div className="max-w-7xl mx-auto">
              <GamificationWidget />
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold mb-4">Why Choose KamiAnime?</h2>
              <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                Experience anime and manga like never before with our unique gamification system
              </p>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-3 gap-8"
            >
              <motion.div variants={itemVariants}>
                <Card className="bg-dark-card border-dark-border hover:border-neon-purple/50 transition-all duration-300">
                  <CardHeader>
                    <div className="w-12 h-12 bg-neon-purple/20 rounded-lg flex items-center justify-center mb-4">
                      <Zap className="w-6 h-6 text-neon-purple" />
                    </div>
                    <CardTitle>Gamification System</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-text-secondary">
                      Earn XP, unlock badges, maintain streaks, and climb leaderboards as you watch and read
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="bg-dark-card border-dark-border hover:border-neon-cyan/50 transition-all duration-300">
                  <CardHeader>
                    <div className="w-12 h-12 bg-neon-cyan/20 rounded-lg flex items-center justify-center mb-4">
                      <Users className="w-6 h-6 text-neon-cyan" />
                    </div>
                    <CardTitle>Community Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-text-secondary">
                      Connect with fellow otaku through our Discord integration and community features
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="bg-dark-card border-dark-border hover:border-neon-purple/50 transition-all duration-300">
                  <CardHeader>
                    <div className="w-12 h-12 bg-neon-purple/20 rounded-lg flex items-center justify-center mb-4">
                      <Star className="w-6 h-6 text-neon-purple" />
                    </div>
                    <CardTitle>Premium Experience</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-text-secondary">
                      Ad-free streaming, early access to episodes, and exclusive premium features
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Trending Anime Section */}
        <section className="py-16 px-4 bg-dark-surface/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-6 h-6 text-neon-purple" />
                <h2 className="text-3xl font-bold">Trending Anime</h2>
                <Badge variant="neon">Hot</Badge>
              </div>
              <Link href="/anime/trending">
                <Button variant="ghost">View All</Button>
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="anime-card h-80 shimmer" />
                ))}
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-2 md:grid-cols-5 gap-4"
              >
                {trendingAnime.map((anime, index) => (
                  <motion.div key={anime.id} variants={itemVariants}>
                    <AnimeCard anime={anime} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>

        {/* Popular Anime Section */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <Star className="w-6 h-6 text-neon-cyan" />
                <h2 className="text-3xl font-bold">Popular Anime</h2>
              </div>
              <Link href="/anime/popular">
                <Button variant="ghost">View All</Button>
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="anime-card h-80 shimmer" />
                ))}
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-2 md:grid-cols-5 gap-4"
              >
                {popularAnime.map((anime, index) => (
                  <motion.div key={anime.id} variants={itemVariants}>
                    <AnimeCard anime={anime} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>

        {/* Trending Manga Section */}
        <section className="py-16 px-4 bg-dark-surface/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <BookOpen className="w-6 h-6 text-neon-purple" />
                <h2 className="text-3xl font-bold">Trending Manga</h2>
                <Badge variant="neon">New</Badge>
              </div>
              <Link href="/manga/trending">
                <Button variant="ghost">View All</Button>
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="anime-card h-80 shimmer" />
                ))}
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-2 md:grid-cols-5 gap-4"
              >
                {trendingManga.map((manga, index) => (
                  <motion.div key={manga.id} variants={itemVariants}>
                    <MangaCard manga={manga} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>

        {/* Premium CTA for non-premium users */}
        {!userProfile?.isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-center mb-12"
          >
            <Card className="max-w-2xl mx-auto bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">Unlock Premium Features</h3>
                <p className="text-text-muted mb-6">
                  Get ad-free experience, offline downloads, 2x XP boost, and exclusive badges!
                </p>
                <PremiumUpgrade />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <Card className="max-w-2xl mx-auto bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border-neon-purple/30">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Ready to Start Your Journey?</h3>
              <p className="text-text-muted mb-6">
                Join thousands of anime and manga fans. Create your account and start earning XP today!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/signup">
                  <Button size="lg" variant="neon">
                    <Users className="w-5 h-5 mr-2" />
                    Join KamiAnime
                  </Button>
                </Link>
                <Link href="/leaderboard">
                  <Button size="lg" variant="outline">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    View Leaderboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
