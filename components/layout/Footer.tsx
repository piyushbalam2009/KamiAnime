'use client'

import React from 'react'
import Link from 'next/link'
import { Github, Twitter, Discord, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-dark-surface border-t border-dark-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-neon-gradient rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <span className="text-xl font-bold gradient-text">KamiAnime</span>
            </div>
            <p className="text-text-muted text-sm">
              The ultimate anime streaming and manga reading platform with gamification features.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-text-muted hover:text-neon-purple transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-text-muted hover:text-neon-cyan transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL} className="text-text-muted hover:text-neon-purple transition-colors">
                <Discord className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Browse */}
          <div>
            <h3 className="font-semibold text-white mb-4">Browse</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/anime" className="text-text-muted hover:text-white transition-colors">
                  Anime
                </Link>
              </li>
              <li>
                <Link href="/manga" className="text-text-muted hover:text-white transition-colors">
                  Manga
                </Link>
              </li>
              <li>
                <Link href="/trending" className="text-text-muted hover:text-white transition-colors">
                  Trending
                </Link>
              </li>
              <li>
                <Link href="/popular" className="text-text-muted hover:text-white transition-colors">
                  Popular
                </Link>
              </li>
              <li>
                <Link href="/seasonal" className="text-text-muted hover:text-white transition-colors">
                  Seasonal
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold text-white mb-4">Community</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/leaderboard" className="text-text-muted hover:text-white transition-colors">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/community" className="text-text-muted hover:text-white transition-colors">
                  Discord Server
                </Link>
              </li>
              <li>
                <Link href="/badges" className="text-text-muted hover:text-white transition-colors">
                  Badges
                </Link>
              </li>
              <li>
                <Link href="/achievements" className="text-text-muted hover:text-white transition-colors">
                  Achievements
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/help" className="text-text-muted hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-text-muted hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-text-muted hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-text-muted hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-dark-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-text-muted text-sm">
            © 2024 KamiAnime. All rights reserved.
          </p>
          <p className="text-text-muted text-sm flex items-center mt-4 md:mt-0">
            Made with <Heart className="w-4 h-4 mx-1 text-red-500" /> for anime fans
          </p>
        </div>
      </div>
    </footer>
  )
}
