'use client'

import React from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumUpgrade from '@/components/monetization/PremiumUpgrade'
import { BannerAd } from '@/components/monetization/AdSenseAd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Crown, 
  Star, 
  Zap, 
  Shield, 
  Download,
  PlayCircle,
  Users,
  Check,
  Sparkles
} from 'lucide-react'
import { motion } from 'framer-motion'

const premiumBenefits = [
  {
    icon: <Crown className="w-8 h-8 text-yellow-400" />,
    title: 'Ad-Free Experience',
    description: 'Enjoy uninterrupted anime and manga streaming without any advertisements disrupting your experience.',
    color: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
  },
  {
    icon: <Download className="w-8 h-8 text-blue-400" />,
    title: 'Offline Downloads',
    description: 'Download your favorite episodes and manga chapters to watch and read offline anytime, anywhere.',
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30'
  },
  {
    icon: <PlayCircle className="w-8 h-8 text-green-400" />,
    title: 'Early Access',
    description: 'Get early access to new episodes, exclusive content, and beta features before anyone else.',
    color: 'from-green-500/20 to-emerald-500/20 border-green-500/30'
  },
  {
    icon: <Zap className="w-8 h-8 text-neon-purple" />,
    title: '2x XP Boost',
    description: 'Earn double XP for all activities including watching, reading, and community participation.',
    color: 'from-neon-purple/20 to-neon-cyan/20 border-neon-purple/30'
  },
  {
    icon: <Star className="w-8 h-8 text-pink-400" />,
    title: 'Exclusive Badges',
    description: 'Unlock premium-only badges and show off your supporter status to the community.',
    color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30'
  },
  {
    icon: <Users className="w-8 h-8 text-indigo-400" />,
    title: 'Priority Support',
    description: 'Get priority customer support with faster response times and dedicated assistance.',
    color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30'
  }
]

const testimonials = [
  {
    name: 'Akira_Otaku',
    level: 47,
    text: 'Premium is totally worth it! No ads and the 2x XP boost helped me reach the top of the leaderboard.',
    rating: 5
  },
  {
    name: 'MangaReader99',
    level: 32,
    text: 'Being able to download chapters for offline reading during my commute is a game changer.',
    rating: 5
  },
  {
    name: 'AnimeKing2024',
    level: 55,
    text: 'Early access to new episodes and the exclusive badges make me feel like a true VIP member.',
    rating: 5
  }
]

export default function PremiumPage() {
  const { userProfile } = useAuth()

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center space-x-3 mb-6">
            <Crown className="w-12 h-12 text-yellow-400" />
            <h1 className="text-5xl font-bold gradient-text">KamiAnime Premium</h1>
          </div>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto mb-8">
            Unlock the ultimate anime and manga experience with premium features, 
            exclusive content, and an ad-free environment designed for true otaku.
          </p>
          
          {userProfile?.isPremium ? (
            <Card className="max-w-md mx-auto bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <CardContent className="p-6 text-center">
                <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">You're Premium!</h3>
                <p className="text-text-muted mb-4">Thank you for supporting KamiAnime</p>
                <Badge variant="neon" className="text-lg px-4 py-2">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Premium Member
                </Badge>
              </CardContent>
            </Card>
          ) : (
            <div className="max-w-md mx-auto">
              <PremiumUpgrade />
            </div>
          )}
        </motion.div>

        {/* Ad for non-premium users */}
        {!userProfile?.isPremium && <BannerAd className="mb-16" />}

        {/* Benefits Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Premium Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {premiumBenefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`h-full bg-gradient-to-br ${benefit.color} hover:scale-105 transition-transform`}>
                  <CardContent className="p-6 text-center">
                    <div className="mb-4">
                      {benefit.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                    <p className="text-text-muted">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Free vs Premium</h2>
          <Card className="max-w-4xl mx-auto bg-dark-card border-dark-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="text-left p-6 font-semibold">Features</th>
                      <th className="text-center p-6 font-semibold">Free</th>
                      <th className="text-center p-6 font-semibold text-yellow-400">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Anime Streaming', true, true],
                      ['Manga Reading', true, true],
                      ['Basic Gamification', true, true],
                      ['Discord Bot Access', true, true],
                      ['Advertisements', true, false],
                      ['Offline Downloads', false, true],
                      ['Early Access', false, true],
                      ['2x XP Boost', false, true],
                      ['Exclusive Badges', false, true],
                      ['Priority Support', false, true]
                    ].map(([feature, free, premium], index) => (
                      <tr key={index} className="border-b border-dark-border/50">
                        <td className="p-6 font-medium">{feature}</td>
                        <td className="p-6 text-center">
                          {free ? (
                            <Check className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="p-6 text-center">
                          {premium ? (
                            <Check className="w-5 h-5 text-yellow-400 mx-auto" />
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">What Premium Members Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-dark-card border-dark-border h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      <span className="font-semibold">{testimonial.name}</span>
                      <Badge variant="outline" className="text-xs">
                        Level {testimonial.level}
                      </Badge>
                    </div>
                    <p className="text-text-muted mb-4">"{testimonial.text}"</p>
                    <div className="flex space-x-1">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        {!userProfile?.isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Card className="max-w-2xl mx-auto bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border-neon-purple/30">
              <CardContent className="p-8 text-center">
                <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
                <h3 className="text-2xl font-bold mb-4">Ready to Go Premium?</h3>
                <p className="text-text-muted mb-6">
                  Join thousands of premium members and unlock the full KamiAnime experience today!
                </p>
                <PremiumUpgrade />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  )
}
