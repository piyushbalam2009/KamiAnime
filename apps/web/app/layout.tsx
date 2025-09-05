import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth/AuthContext'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useState } from 'react'
import ClientWrapper from '@/components/ClientWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KamiAnime - Stream Anime & Read Manga',
  description: 'A modern anime streaming and manga reading platform with gamification features',
  keywords: 'anime, manga, streaming, reading, gamification, community',
  authors: [{ name: 'KamiAnime Team' }],
  openGraph: {
    title: 'KamiAnime - Stream Anime & Read Manga',
    description: 'A modern anime streaming and manga reading platform with gamification features',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KamiAnime - Stream Anime & Read Manga',
    description: 'A modern anime streaming and manga reading platform with gamification features',
  },
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#7B61FF',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ClientWrapper>
          {children}
        </ClientWrapper>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1A1A24',
              color: '#FFFFFF',
              border: '1px solid #7B61FF',
            },
          }}
        />
      </body>
    </html>
  )
}
