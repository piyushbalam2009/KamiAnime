'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MangaInfo } from '@/lib/api/manga'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Calendar, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { truncateText } from '@/lib/utils'

interface MangaCardProps {
  manga: MangaInfo
  showDescription?: boolean
}

export default function MangaCard({ manga, showDescription = false }: MangaCardProps) {
  const title = manga.title.en || manga.title['ja-ro'] || manga.title.ja || 'Unknown Title'
  const description = manga.description?.en || ''

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="group"
    >
      <Link href={`/manga/${manga.id}`}>
        <Card className="anime-card h-full overflow-hidden cursor-pointer">
          <div className="relative aspect-[3/4] overflow-hidden">
            <Image
              src={manga.coverArt || '/placeholder-manga.jpg'}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 20vw, 16vw"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Read Button */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-16 h-16 bg-neon-cyan/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Status Badge */}
            <div className="absolute top-2 left-2">
              <Badge 
                variant={manga.status === 'ongoing' ? 'success' : 'secondary'}
                className="text-xs"
              >
                {manga.status === 'ongoing' ? 'Ongoing' : 
                 manga.status === 'completed' ? 'Completed' : 
                 manga.status}
              </Badge>
            </div>

            {/* Chapter Count */}
            {manga.lastChapter && (
              <div className="absolute bottom-2 left-2">
                <Badge variant="outline" className="text-xs bg-black/50 backdrop-blur-sm">
                  Ch. {manga.lastChapter}
                </Badge>
              </div>
            )}
          </div>

          <CardContent className="p-4">
            <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-neon-cyan transition-colors">
              {truncateText(title, 40)}
            </h3>

            {/* Genres/Tags */}
            <div className="flex flex-wrap gap-1 mb-2">
              {manga.tags?.slice(0, 2).map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.attributes.name.en}
                </Badge>
              ))}
              {manga.tags && manga.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{manga.tags.length - 2}
                </Badge>
              )}
            </div>

            {/* Additional Info */}
            <div className="flex items-center justify-between text-xs text-text-muted">
              {manga.year && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{manga.year}</span>
                </div>
              )}
              {manga.author && (
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>{truncateText(manga.author, 15)}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {showDescription && description && (
              <p className="text-text-muted text-sm mt-2 line-clamp-3">
                {description.replace(/<[^>]*>/g, '')}
              </p>
            )}

            {/* Artist */}
            {manga.artist && manga.artist !== manga.author && (
              <p className="text-text-muted text-xs mt-2">
                Art: {truncateText(manga.artist, 20)}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
