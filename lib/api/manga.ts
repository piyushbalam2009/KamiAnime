import axios from 'axios'

const MANGADEX_API = 'https://api.mangadex.org'
const CONSUMET_API = process.env.NEXT_PUBLIC_CONSUMET_API || 'https://api.consumet.org'

// Manga interfaces
export interface MangaInfo {
  id: string
  title: {
    en?: string
    ja?: string
    'ja-ro'?: string
  }
  description: {
    en?: string
  }
  status: string
  year?: number
  tags: Array<{
    id: string
    attributes: {
      name: {
        en: string
      }
    }
  }>
  coverArt?: string
  author?: string
  artist?: string
  lastChapter?: string
  lastVolume?: string
}

export interface Chapter {
  id: string
  title?: string
  chapter: string
  volume?: string
  pages: number
  translatedLanguage: string
  publishAt: string
  readableAt: string
  scanlationGroup?: {
    name: string
  }
}

export interface ChapterPages {
  id: string
  pages: string[]
}

// MangaDex API functions
export async function getTrendingManga(): Promise<MangaInfo[]> {
  try {
    const response = await axios.get(`${MANGADEX_API}/manga`, {
      params: {
        limit: 20,
        order: { followedCount: 'desc' },
        includes: ['cover_art', 'author', 'artist'],
        contentRating: ['safe', 'suggestive'],
        status: ['ongoing', 'completed']
      }
    })

    return response.data.data.map((manga: any) => ({
      id: manga.id,
      title: manga.attributes.title,
      description: manga.attributes.description,
      status: manga.attributes.status,
      year: manga.attributes.year,
      tags: manga.attributes.tags,
      coverArt: getCoverArtUrl(manga),
      author: getAuthorName(manga.relationships),
      artist: getArtistName(manga.relationships),
      lastChapter: manga.attributes.lastChapter,
      lastVolume: manga.attributes.lastVolume
    }))
  } catch (error) {
    console.error('Error fetching trending manga:', error)
    return []
  }
}

export async function getPopularManga(): Promise<MangaInfo[]> {
  try {
    const response = await axios.get(`${MANGADX_API}/manga`, {
      params: {
        limit: 20,
        order: { rating: 'desc' },
        includes: ['cover_art', 'author', 'artist'],
        contentRating: ['safe', 'suggestive'],
        hasAvailableChapters: true
      }
    })

    return response.data.data.map((manga: any) => ({
      id: manga.id,
      title: manga.attributes.title,
      description: manga.attributes.description,
      status: manga.attributes.status,
      year: manga.attributes.year,
      tags: manga.attributes.tags,
      coverArt: getCoverArtUrl(manga),
      author: getAuthorName(manga.relationships),
      artist: getArtistName(manga.relationships),
      lastChapter: manga.attributes.lastChapter,
      lastVolume: manga.attributes.lastVolume
    }))
  } catch (error) {
    console.error('Error fetching popular manga:', error)
    return []
  }
}

export async function searchManga(query: string, page: number = 1): Promise<MangaInfo[]> {
  try {
    const response = await axios.get(`${MANGADEX_API}/manga`, {
      params: {
        title: query,
        limit: 20,
        offset: (page - 1) * 20,
        includes: ['cover_art', 'author', 'artist'],
        contentRating: ['safe', 'suggestive']
      }
    })

    return response.data.data.map((manga: any) => ({
      id: manga.id,
      title: manga.attributes.title,
      description: manga.attributes.description,
      status: manga.attributes.status,
      year: manga.attributes.year,
      tags: manga.attributes.tags,
      coverArt: getCoverArtUrl(manga),
      author: getAuthorName(manga.relationships),
      artist: getArtistName(manga.relationships),
      lastChapter: manga.attributes.lastChapter,
      lastVolume: manga.attributes.lastVolume
    }))
  } catch (error) {
    console.error('Error searching manga:', error)
    return []
  }
}

export async function getMangaDetails(id: string): Promise<MangaInfo | null> {
  try {
    const response = await axios.get(`${MANGADEX_API}/manga/${id}`, {
      params: {
        includes: ['cover_art', 'author', 'artist']
      }
    })

    const manga = response.data.data
    return {
      id: manga.id,
      title: manga.attributes.title,
      description: manga.attributes.description,
      status: manga.attributes.status,
      year: manga.attributes.year,
      tags: manga.attributes.tags,
      coverArt: getCoverArtUrl(manga),
      author: getAuthorName(manga.relationships),
      artist: getArtistName(manga.relationships),
      lastChapter: manga.attributes.lastChapter,
      lastVolume: manga.attributes.lastVolume
    }
  } catch (error) {
    console.error('Error fetching manga details:', error)
    return null
  }
}

export async function getMangaChapters(mangaId: string, page: number = 1): Promise<Chapter[]> {
  try {
    const response = await axios.get(`${MANGADEX_API}/manga/${mangaId}/feed`, {
      params: {
        limit: 100,
        offset: (page - 1) * 100,
        order: { chapter: 'asc' },
        translatedLanguage: ['en'],
        includes: ['scanlation_group']
      }
    })

    return response.data.data.map((chapter: any) => ({
      id: chapter.id,
      title: chapter.attributes.title,
      chapter: chapter.attributes.chapter,
      volume: chapter.attributes.volume,
      pages: chapter.attributes.pages,
      translatedLanguage: chapter.attributes.translatedLanguage,
      publishAt: chapter.attributes.publishAt,
      readableAt: chapter.attributes.readableAt,
      scanlationGroup: getScanlationGroup(chapter.relationships)
    }))
  } catch (error) {
    console.error('Error fetching manga chapters:', error)
    return []
  }
}

export async function getChapterPages(chapterId: string): Promise<ChapterPages | null> {
  try {
    // First get chapter info
    const chapterResponse = await axios.get(`${MANGADEX_API}/chapter/${chapterId}`)
    const chapter = chapterResponse.data.data

    // Then get the at-home server URL
    const serverResponse = await axios.get(`${MANGADEX_API}/at-home/server/${chapterId}`)
    const { baseUrl, chapter: chapterData } = serverResponse.data

    // Construct page URLs
    const pages = chapterData.data.map((filename: string) => 
      `${baseUrl}/data/${chapterData.hash}/${filename}`
    )

    return {
      id: chapterId,
      pages
    }
  } catch (error) {
    console.error('Error fetching chapter pages:', error)
    return null
  }
}

export async function getMangaByGenre(genre: string): Promise<MangaInfo[]> {
  try {
    const response = await axios.get(`${MANGADEX_API}/manga`, {
      params: {
        limit: 20,
        includedTags: [genre],
        includes: ['cover_art', 'author', 'artist'],
        contentRating: ['safe', 'suggestive'],
        order: { followedCount: 'desc' }
      }
    })

    return response.data.data.map((manga: any) => ({
      id: manga.id,
      title: manga.attributes.title,
      description: manga.attributes.description,
      status: manga.attributes.status,
      year: manga.attributes.year,
      tags: manga.attributes.tags,
      coverArt: getCoverArtUrl(manga),
      author: getAuthorName(manga.relationships),
      artist: getArtistName(manga.relationships),
      lastChapter: manga.attributes.lastChapter,
      lastVolume: manga.attributes.lastVolume
    }))
  } catch (error) {
    console.error('Error fetching manga by genre:', error)
    return []
  }
}

// Helper functions
function getCoverArtUrl(manga: any): string {
  const coverArt = manga.relationships?.find((rel: any) => rel.type === 'cover_art')
  if (coverArt?.attributes?.fileName) {
    return `https://uploads.mangadx.org/covers/${manga.id}/${coverArt.attributes.fileName}.512.jpg`
  }
  return '/placeholder-manga.jpg'
}

function getAuthorName(relationships: any[]): string {
  const author = relationships?.find((rel: any) => rel.type === 'author')
  return author?.attributes?.name || 'Unknown'
}

function getArtistName(relationships: any[]): string {
  const artist = relationships?.find((rel: any) => rel.type === 'artist')
  return artist?.attributes?.name || 'Unknown'
}

function getScanlationGroup(relationships: any[]): { name: string } | undefined {
  const group = relationships?.find((rel: any) => rel.type === 'scanlation_group')
  return group?.attributes?.name ? { name: group.attributes.name } : undefined
}

// Consumet fallback functions
export async function getConsumeTrendingManga(): Promise<any[]> {
  try {
    const response = await axios.get(`${CONSUMET_API}/manga/mangadex/popular`)
    return response.data.results || []
  } catch (error) {
    console.error('Error fetching Consumet trending manga:', error)
    return []
  }
}

export async function getConsumetMangaInfo(id: string): Promise<any> {
  try {
    const response = await axios.get(`${CONSUMET_API}/manga/mangadex/info/${id}`)
    return response.data
  } catch (error) {
    console.error('Error fetching Consumet manga info:', error)
    return null
  }
}

export async function getConsumetChapterPages(chapterId: string): Promise<any> {
  try {
    const response = await axios.get(`${CONSUMET_API}/manga/mangadex/read/${chapterId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching Consumet chapter pages:', error)
    return null
  }
}
