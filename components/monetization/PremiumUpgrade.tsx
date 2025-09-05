'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Crown, 
  Check, 
  X, 
  Zap, 
  Shield, 
  Star,
  Download,
  PlayCircle,
  Users,
  Sparkles
} from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const premiumFeatures = [
  {
    icon: <Crown className="w-5 h-5" />,
    title: 'Ad-Free Experience',
    description: 'Enjoy uninterrupted anime and manga without any advertisements'
  },
  {
    icon: <Download className="w-5 h-5" />,
    title: 'Offline Downloads',
    description: 'Download episodes and chapters for offline viewing'
  },
  {
    icon: <PlayCircle className="w-5 h-5" />,
    title: 'Early Access',
    description: 'Get early access to new episodes and exclusive content'
  },
  {
    icon: <Star className="w-5 h-5" />,
    title: 'Premium Badge',
    description: 'Show off your premium status with exclusive badges'
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: '2x XP Boost',
    description: 'Earn double XP for all activities and level up faster'
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Priority Support',
    description: 'Get priority customer support and faster response times'
  }
]

const plans = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 9.99,
    period: 'month',
    popular: false
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 99.99,
    period: 'year',
    popular: true,
    savings: '17% OFF'
  }
]

export default function PremiumUpgrade() {
  const { userProfile } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState('yearly')
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async (planId: string) => {
    setLoading(true)
    try {
      // In a real implementation, this would integrate with Stripe/Razorpay
      // For now, we'll show a message that admin needs to manually upgrade
      toast.success('Premium upgrade request submitted! An admin will process your request shortly.')
      
      // You could also send this to a webhook or admin notification system
      console.log(`Premium upgrade requested for user ${userProfile?.uid} with plan ${planId}`)
    } catch (error) {
      console.error('Error processing upgrade:', error)
      toast.error('Failed to process upgrade request')
    } finally {
      setLoading(false)
    }
  }

  if (userProfile?.isPremium) {
    return (
      <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
        <CardContent className="p-6 text-center">
          <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">You're Premium!</h3>
          <p className="text-text-muted">Thank you for supporting KamiAnime</p>
          <Badge variant="neon" className="mt-4">
            <Sparkles className="w-4 h-4 mr-1" />
            Premium Member
          </Badge>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="neon" className="w-full">
          <Crown className="w-4 h-4 mr-2" />
          Upgrade to Premium
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl gradient-text">
            Upgrade to KamiAnime Premium
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {premiumFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start space-x-3 p-4 bg-dark-surface rounded-lg"
              >
                <div className="text-neon-purple mt-1">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{feature.title}</h4>
                  <p className="text-sm text-text-muted">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pricing Plans */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-center">Choose Your Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan) => (
                <motion.div
                  key={plan.id}
                  whileHover={{ scale: 1.02 }}
                  className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPlan === plan.id
                      ? 'border-neon-purple bg-neon-purple/10'
                      : 'border-dark-border bg-dark-surface hover:border-neon-purple/50'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-neon-purple">
                      Most Popular
                    </Badge>
                  )}
                  
                  <div className="text-center">
                    <h4 className="text-lg font-bold mb-2">{plan.name}</h4>
                    <div className="mb-4">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-text-muted">/{plan.period}</span>
                    </div>
                    
                    {plan.savings && (
                      <Badge variant="success" className="mb-4">
                        {plan.savings}
                      </Badge>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-center space-x-2">
                        <Check className="w-4 h-4 text-green-400" />
                        <span>All Premium Features</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <Check className="w-4 h-4 text-green-400" />
                        <span>Cancel Anytime</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <Check className="w-4 h-4 text-green-400" />
                        <span>24/7 Support</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Upgrade Button */}
          <div className="text-center">
            <Button
              onClick={() => handleUpgrade(selectedPlan)}
              disabled={loading}
              className="w-full max-w-md bg-gradient-to-r from-neon-purple to-neon-cyan hover:from-neon-purple/80 hover:to-neon-cyan/80"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  <Crown className="w-5 h-5 mr-2" />
                  Upgrade to Premium
                </>
              )}
            </Button>
            
            <p className="text-xs text-text-muted mt-4">
              * Payment processing will be handled by admin. You'll be notified once your premium status is activated.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
