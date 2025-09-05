'use client'

import React, { useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'

interface AdSenseAdProps {
  adSlot: string
  adFormat?: 'auto' | 'rectangle' | 'vertical' | 'horizontal'
  className?: string
  style?: React.CSSProperties
}

declare global {
  interface Window {
    adsbygoogle: any[]
  }
}

export default function AdSenseAd({ 
  adSlot, 
  adFormat = 'auto', 
  className = '',
  style = {}
}: AdSenseAdProps) {
  const { userProfile } = useAuth()

  useEffect(() => {
    // Don't show ads to premium users
    if (userProfile?.isPremium) return

    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        window.adsbygoogle.push({})
      }
    } catch (error) {
      console.error('AdSense error:', error)
    }
  }, [userProfile])

  // Don't render ads for premium users
  if (userProfile?.isPremium) {
    return null
  }

  return (
    <div className={`adsense-container ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  )
}

// Banner Ad Component
export function BannerAd({ className }: { className?: string }) {
  return (
    <AdSenseAd
      adSlot="1234567890"
      adFormat="horizontal"
      className={`w-full max-w-4xl mx-auto my-8 ${className}`}
      style={{ minHeight: '90px' }}
    />
  )
}

// Sidebar Ad Component
export function SidebarAd({ className }: { className?: string }) {
  return (
    <AdSenseAd
      adSlot="0987654321"
      adFormat="vertical"
      className={`w-full max-w-xs ${className}`}
      style={{ minHeight: '600px' }}
    />
  )
}

// Rectangle Ad Component
export function RectangleAd({ className }: { className?: string }) {
  return (
    <AdSenseAd
      adSlot="1122334455"
      adFormat="rectangle"
      className={`w-full max-w-sm mx-auto my-4 ${className}`}
      style={{ minHeight: '250px' }}
    />
  )
}
