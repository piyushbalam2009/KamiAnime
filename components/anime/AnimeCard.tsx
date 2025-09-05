'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimeInfo } from '@/lib/api/anime'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Star, Play, Calendar, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { truncateText } from '@/lib/utils'

interface AnimeCardProps {
  anime: AnimeInfo
  showDescription?: boolean
}

export default function AnimeCard({ anime, showDescription = false }: AnimeCardProps) {
  const title = anime.title.english || anime.title.romaji || anime.title.native
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="group"
    >
      <Link href={`/anime/${anime.id}`}>
        <Card className="anime-card h-full overflow-hidden cursor-pointer">
          <div className="relative aspect-[3/4] overflow-hidden">
            <Image
              src={anime.coverImage.large || anime.coverImage.medium}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 20vw, 16vw"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Play Button */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-16 h-16 bg-neon-purple/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
            </div>

            {/* Score Badge */}
            {score && (
              <div className="absolute top-2 right-2">
                <Badge variant="neon" className="flex items-center space-x-1">
                  <Star className="w-3 h-3" />
                  <span>{score}</span>
                </Badge>
              </div>
            )}

            {/* Status Badge */}
            <div className="absolute top-2 left-2">
              <Badge 
                variant={anime.status === 'RELEASING' ? 'success' : 'secondary'}
                className="text-xs"
              >
                {anime.status === 'RELEASING' ? 'Ongoing' : 
                 anime.status === 'FINISHED' ? 'Completed' : 
                 anime.status}
              </Badge>
            </div>

            {/* Episode Count */}
            {anime.episodes && (
              <div className="absolute bottom-2 left-2">
                <Badge variant="outline" className="text-xs bg-black/50 backdrop-blur-sm">
                  {anime.episodes} eps
                </Badge>
              </div>
            )}
          </div>

          <CardContent className="p-4">
            <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-neon-purple transition-colors">
              {truncateText(title, 40)}
            </h3>

            {/* Genres */}
            <div className="flex flex-wrap gap-1 mb-2">
              {anime.genres.slice(0, 2).map((genre) => (
                <Badge key={genre} variant="outline" className="text-xs">
                  {genre}
                </Badge>
              ))}
              {anime.genres.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{anime.genres.length - 2}
                </Badge>
              )}
            </div>

            {/* Additional Info */}
            <div className="flex items-center justify-between text-xs text-text-muted">
              {anime.seasonYear && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{anime.seasonYear}</span>
                </div>
              )}
              {anime.duration && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{anime.duration}m</span>
                </div>
              )}
            </div>

            {/* Description */}
            {showDescription && anime.description && (
              <p className="text-text-muted text-sm mt-2 line-clamp-3">
                {anime.description.replace(/<[^>]*>/g, '')}
              </p>
            )}

            {/* Studio */}
            {anime.studios?.nodes?.[0]?.name && (
              <p className="text-text-muted text-xs mt-2">
                {anime.studios.nodes[0].name}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
