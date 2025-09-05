import axios from 'axios'

const CONSUMET_API = process.env.NEXT_PUBLIC_CONSUMET_API || 'https://api.consumet.org'
const ANILIST_API = 'https://graphql.anilist.co'

// Anime interfaces
export interface AnimeInfo {
  id: string
  title: {
    romaji: string
    english?: string
    native: string
  }
  description: string
  coverImage: {
    large: string
    medium: string
  }
  bannerImage?: string
  genres: string[]
  status: string
  episodes?: number
  duration?: number
  season?: string
  seasonYear?: number
  averageScore?: number
  popularity: number
  studios: { nodes: Array<{ name: string }> }
  nextAiringEpisode?: {
    episode: number
    timeUntilAiring: number
  }
}

export interface Episode {
  id: string
  title: string
  number: number
  image?: string
  description?: string
  airDate?: string
}

export interface StreamingSource {
  url: string
  quality: string
  isM3U8: boolean
}

export interface StreamingData {
  sources: StreamingSource[]
  subtitles?: Array<{
    url: string
    lang: string
  }>
  intro?: {
    start: number
    end: number
  }
  outro?: {
    start: number
    end: number
  }
}

// AniList GraphQL queries
const TRENDING_ANIME_QUERY = `
  query {
    Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: TRENDING_DESC, status: RELEASING) {
        id
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          large
          medium
        }
        bannerImage
        genres
        status
        episodes
        duration
        season
        seasonYear
        averageScore
        popularity
        studios {
          nodes {
            name
          }
        }
        nextAiringEpisode {
          episode
          timeUntilAiring
        }
      }
    }
  }
`

const POPULAR_ANIME_QUERY = `
  query {
    Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: POPULARITY_DESC) {
        id
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          large
          medium
        }
        bannerImage
        genres
        status
        episodes
        duration
        season
        seasonYear
        averageScore
        popularity
        studios {
          nodes {
            name
          }
        }
      }
    }
  }
`

const ANIME_DETAILS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      description
      coverImage {
        large
        medium
      }
      bannerImage
      genres
      status
      episodes
      duration
      season
      seasonYear
      averageScore
      popularity
      studios {
        nodes {
          name
        }
      }
      nextAiringEpisode {
        episode
        timeUntilAiring
      }
      relations {
        edges {
          node {
            id
            title {
              romaji
              english
            }
            coverImage {
              medium
            }
            type
          }
          relationType
        }
      }
      recommendations {
        nodes {
          mediaRecommendation {
            id
            title {
              romaji
              english
            }
            coverImage {
              medium
            }
            averageScore
          }
        }
      }
    }
  }
`

const SEARCH_ANIME_QUERY = `
  query ($search: String, $page: Int) {
    Page(page: $page, perPage: 20) {
      media(type: ANIME, search: $search) {
        id
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          large
          medium
        }
        genres
        status
        episodes
        averageScore
        popularity
      }
    }
  }
`

// API functions
export async function getTrendingAnime(): Promise<AnimeInfo[]> {
  try {
    const response = await axios.post(ANILIST_API, {
      query: TRENDING_ANIME_QUERY
    })
    return response.data.data.Page.media
  } catch (error) {
    console.error('Error fetching trending anime:', error)
    return []
  }
}

export async function getPopularAnime(): Promise<AnimeInfo[]> {
  try {
    const response = await axios.post(ANILIST_API, {
      query: POPULAR_ANIME_QUERY
    })
    return response.data.data.Page.media
  } catch (error) {
    console.error('Error fetching popular anime:', error)
    return []
  }
}

export async function getAnimeDetails(id: string): Promise<AnimeInfo | null> {
  try {
    const response = await axios.post(ANILIST_API, {
      query: ANIME_DETAILS_QUERY,
      variables: { id: parseInt(id) }
    })
    return response.data.data.Media
  } catch (error) {
    console.error('Error fetching anime details:', error)
    return null
  }
}

export async function searchAnime(query: string, page: number = 1): Promise<AnimeInfo[]> {
  try {
    const response = await axios.post(ANILIST_API, {
      query: SEARCH_ANIME_QUERY,
      variables: { search: query, page }
    })
    return response.data.data.Page.media
  } catch (error) {
    console.error('Error searching anime:', error)
    return []
  }
}

export async function getAnimeEpisodes(animeId: string): Promise<Episode[]> {
  try {
    // Try GogoAnime first
    const gogoResponse = await axios.get(`${CONSUMET_API}/anime/gogoanime/info/${animeId}`)
    if (gogoResponse.data.episodes) {
      return gogoResponse.data.episodes
    }

    // Fallback to other providers
    const anilistResponse = await axios.get(`${CONSUMET_API}/meta/anilist/info/${animeId}`)
    return anilistResponse.data.episodes || []
  } catch (error) {
    console.error('Error fetching episodes:', error)
    return []
  }
}

export async function getStreamingData(episodeId: string, provider: string = 'gogoanime'): Promise<StreamingData | null> {
  try {
    let response
    
    switch (provider) {
      case 'gogoanime':
        response = await axios.get(`${CONSUMET_API}/anime/gogoanime/watch/${episodeId}`)
        break
      case 'anilist':
        response = await axios.get(`${CONSUMET_API}/meta/anilist/watch/${episodeId}`)
        break
      default:
        response = await axios.get(`${CONSUMET_API}/anime/gogoanime/watch/${episodeId}`)
    }

    return response.data
  } catch (error) {
    console.error('Error fetching streaming data:', error)
    return null
  }
}

export async function getSeasonalAnime(year: number, season: string): Promise<AnimeInfo[]> {
  try {
    const SEASONAL_QUERY = `
      query ($year: Int, $season: MediaSeason) {
        Page(page: 1, perPage: 20) {
          media(type: ANIME, seasonYear: $year, season: $season, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            description
            coverImage {
              large
              medium
            }
            genres
            status
            episodes
            averageScore
            popularity
          }
        }
      }
    `

    const response = await axios.post(ANILIST_API, {
      query: SEASONAL_QUERY,
      variables: { year, season: season.toUpperCase() }
    })
    
    return response.data.data.Page.media
  } catch (error) {
    console.error('Error fetching seasonal anime:', error)
    return []
  }
}

export async function getAnimeByGenre(genre: string): Promise<AnimeInfo[]> {
  try {
    const GENRE_QUERY = `
      query ($genre: String) {
        Page(page: 1, perPage: 20) {
          media(type: ANIME, genre: $genre, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            description
            coverImage {
              large
              medium
            }
            genres
            status
            episodes
            averageScore
            popularity
          }
        }
      }
    `

    const response = await axios.post(ANILIST_API, {
      query: GENRE_QUERY,
      variables: { genre }
    })
    
    return response.data.data.Page.media
  } catch (error) {
    console.error('Error fetching anime by genre:', error)
    return []
  }
}
