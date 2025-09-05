'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { getAnimeDetails, getAnimeEpisodes } from '@/lib/api/anime'
import { AnimeInfo, Episode } from '@/lib/api/anime'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Play, 
  Plus, 
  Check, 
  Star, 
  Calendar, 
  Clock, 
  Users,
  Heart,
  Share2,
  BookmarkPlus,
  Eye
} from 'lucide-react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function AnimeDetailsPage() {
  const params = useParams()
  const { user, userProfile, addXP } = useAuth()
  const [anime, setAnime] = useState<AnimeInfo | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [showPlayer, setShowPlayer] = useState(false)

  useEffect(() => {
    const fetchAnimeData = async () => {
      if (!params.id) return

      try {
        const [animeData, episodeData] = await Promise.all([
          getAnimeDetails(params.id as string),
          getAnimeEpisodes(params.id as string)
        ])

        setAnime(animeData)
        setEpisodes(episodeData)

        // Check if in watchlist
        if (userProfile?.watchlist.includes(params.id as string)) {
          setIsInWatchlist(true)
        }
      } catch (error) {
        console.error('Error fetching anime data:', error)
        toast.error('Failed to load anime details')
      } finally {
        setLoading(false)
      }
    }

    fetchAnimeData()
  }, [params.id, userProfile])

  const handleWatchlistToggle = async () => {
    if (!user || !userProfile || !anime) {
      toast.error('Please sign in to add to watchlist')
      return
    }

    try {
      const updatedWatchlist = isInWatchlist
        ? userProfile.watchlist.filter(id => id !== anime.id)
        : [...userProfile.watchlist, anime.id]

      // Update user profile
      // This would typically be done through a Firebase function
      setIsInWatchlist(!isInWatchlist)
      
      if (!isInWatchlist) {
        await addXP(5, 'Added to watchlist')
        toast.success('Added to watchlist!')
      } else {
        toast.success('Removed from watchlist')
      }
    } catch (error) {
      console.error('Error updating watchlist:', error)
      toast.error('Failed to update watchlist')
    }
  }

  const handleEpisodeClick = (episode: Episode) => {
    setSelectedEpisode(episode)
    setShowPlayer(true)
    
    if (user) {
      addXP(10, `Watched ${anime?.title.english || anime?.title.romaji} Episode ${episode.number}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-64 bg-dark-card rounded-lg mb-8" />
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-4">
                <div className="h-8 bg-dark-card rounded w-3/4" />
                <div className="h-4 bg-dark-card rounded w-1/2" />
                <div className="h-32 bg-dark-card rounded" />
              </div>
              <div className="space-y-4">
                <div className="h-64 bg-dark-card rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Anime not found</h1>
          <p className="text-text-muted">The anime you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  const title = anime.title.english || anime.title.romaji || anime.title.native

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative h-96 overflow-hidden">
        {anime.bannerImage && (
          <Image
            src={anime.bannerImage}
            alt={title}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-bg/80 via-transparent to-dark-bg/80" />
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-10">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Title and Actions */}
              <div className="space-y-4">
                <h1 className="text-4xl font-bold text-white">{title}</h1>
                
                <div className="flex flex-wrap gap-2">
                  {anime.genres.map(genre => (
                    <Badge key={genre} variant="outline">{genre}</Badge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => episodes.length > 0 && handleEpisodeClick(episodes[0])}
                    variant="neon"
                    size="lg"
                    disabled={episodes.length === 0}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Watch Now
                  </Button>
                  
                  <Button
                    onClick={handleWatchlistToggle}
                    variant={isInWatchlist ? "secondary" : "outline"}
                    size="lg"
                  >
                    {isInWatchlist ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        In Watchlist
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2" />
                        Add to Watchlist
                      </>
                    )}
                  </Button>

                  <Button variant="ghost" size="lg">
                    <Heart className="w-5 h-5 mr-2" />
                    Favorite
                  </Button>

                  <Button variant="ghost" size="lg">
                    <Share2 className="w-5 h-5 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Description */}
              <Card className="bg-dark-card border-dark-border">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-3">Synopsis</h3>
                  <p className="text-text-secondary leading-relaxed">
                    {anime.description?.replace(/<[^>]*>/g, '') || 'No description available.'}
                  </p>
                </CardContent>
              </Card>

              {/* Episodes */}
              {episodes.length > 0 && (
                <Card className="bg-dark-card border-dark-border">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-4">Episodes</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {episodes.map(episode => (
                        <Button
                          key={episode.id}
                          onClick={() => handleEpisodeClick(episode)}
                          variant="outline"
                          className="h-12 flex flex-col items-center justify-center p-2"
                        >
                          <span className="text-xs text-text-muted">EP</span>
                          <span className="font-semibold">{episode.number}</span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {/* Cover Image */}
              <Card className="bg-dark-card border-dark-border overflow-hidden">
                <div className="aspect-[3/4] relative">
                  <Image
                    src={anime.coverImage.large}
                    alt={title}
                    fill
                    className="object-cover"
                  />
                </div>
              </Card>

              {/* Info */}
              <Card className="bg-dark-card border-dark-border mt-4">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold">Information</h3>
                  
                  <div className="space-y-3">
                    {anime.averageScore && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">Score</span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400" />
                          <span>{(anime.averageScore / 10).toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-text-muted">Status</span>
                      <Badge variant={anime.status === 'RELEASING' ? 'success' : 'secondary'}>
                        {anime.status === 'RELEASING' ? 'Ongoing' : 
                         anime.status === 'FINISHED' ? 'Completed' : 
                         anime.status}
                      </Badge>
                    </div>

                    {anime.episodes && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">Episodes</span>
                        <span>{anime.episodes}</span>
                      </div>
                    )}

                    {anime.duration && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">Duration</span>
                        <span>{anime.duration} min</span>
                      </div>
                    )}

                    {anime.seasonYear && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">Year</span>
                        <span>{anime.seasonYear}</span>
                      </div>
                    )}

                    {anime.season && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">Season</span>
                        <span className="capitalize">{anime.season.toLowerCase()}</span>
                      </div>
                    )}

                    {anime.studios?.nodes?.[0]?.name && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">Studio</span>
                        <span>{anime.studios.nodes[0].name}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-text-muted">Popularity</span>
                      <span>{anime.popularity.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
        <DialogContent className="max-w-4xl w-full bg-dark-card border-dark-border">
          <DialogHeader>
            <DialogTitle>
              {title} - Episode {selectedEpisode?.number}
              {selectedEpisode?.title && `: ${selectedEpisode.title}`}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
            <div className="text-center space-y-4">
              <Play className="w-16 h-16 text-neon-purple mx-auto" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Video Player</h3>
                <p className="text-text-muted">
                  Video streaming functionality would be implemented here using the Consumet API
                </p>
                <p className="text-sm text-text-muted mt-2">
                  Episode ID: {selectedEpisode?.id}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
