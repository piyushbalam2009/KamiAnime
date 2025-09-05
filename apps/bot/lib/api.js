const axios = require('axios');
const { db } = require('./firebase');

// Base URLs for different APIs
const ANILIST_URL = 'https://graphql.anilist.co';
const KITSU_URL = 'https://kitsu.io/api/edge';
const JIKAN_URL = 'https://api.jikan.moe/v4';
const CONSUMET_URL = 'https://api.consumet.org';
const MANGADEX_URL = 'https://api.mangadx.org';
const ANIMECHAN_URL = 'https://animechan.vercel.app/api';
const WAIFU_PICS_URL = 'https://api.waifu.pics';
const TENOR_URL = 'https://tenor.googleapis.com/v2';
const REDDIT_URL = 'https://www.reddit.com/r';

// Cache configuration
const CACHE_DURATION = {
  ANIME_SEARCH: 3600000, // 1 hour
  TRENDING: 1800000, // 30 minutes
  SEASONAL: 7200000, // 2 hours
  MANGA_SEARCH: 3600000, // 1 hour
  QUOTES: 86400000, // 24 hours
  IMAGES: 3600000, // 1 hour
  MEMES: 1800000 // 30 minutes
};

// API Health Status
const apiStatus = {
  anilist: true,
  kitsu: true,
  jikan: true,
  consumet: true,
  mangadx: true,
  animechan: true,
  waifupics: true,
  tenor: true,
  reddit: true
};

// Rate limiting
const rateLimits = new Map();

class APICache {
  static async get(key) {
    try {
      const doc = await db.collection('cache').doc(key).get();
      if (doc.exists) {
        const data = doc.data();
        if (Date.now() - data.timestamp < data.duration) {
          return data.value;
        }
        // Expired cache, delete it
        await db.collection('cache').doc(key).delete();
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async set(key, value, duration) {
    try {
      await db.collection('cache').doc(key).set({
        value,
        timestamp: Date.now(),
        duration
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
}

class RateLimiter {
  static canMakeRequest(api, limit = 60, window = 60000) {
    const now = Date.now();
    const key = `${api}_${Math.floor(now / window)}`;
    
    if (!rateLimits.has(key)) {
      rateLimits.set(key, 0);
    }
    
    const count = rateLimits.get(key);
    if (count >= limit) {
      return false;
    }
    
    rateLimits.set(key, count + 1);
    return true;
  }
}

class AnimeAPI {
  // Multi-source anime search with fallback
  static async searchAnime(query, limit = 10) {
    const cacheKey = `anime_search_${query}_${limit}`;
    
    // Check cache first
    const cached = await APICache.get(cacheKey);
    if (cached) return cached;

    // Try AniList first
    try {
      if (apiStatus.anilist && RateLimiter.canMakeRequest('anilist', 90)) {
        const result = await this.searchAniList(query, limit);
        if (result && result.length > 0) {
          await APICache.set(cacheKey, result, CACHE_DURATION.ANIME_SEARCH);
          return result;
        }
      }
    } catch (error) {
      console.error('AniList search failed:', error);
      apiStatus.anilist = false;
      setTimeout(() => { apiStatus.anilist = true; }, 300000); // Reset after 5 minutes
    }

    // Fallback to Kitsu
    try {
      if (apiStatus.kitsu && RateLimiter.canMakeRequest('kitsu', 60)) {
        const result = await this.searchKitsu(query, limit);
        if (result && result.length > 0) {
          await APICache.set(cacheKey, result, CACHE_DURATION.ANIME_SEARCH);
          return result;
        }
      }
    } catch (error) {
      console.error('Kitsu search failed:', error);
      apiStatus.kitsu = false;
      setTimeout(() => { apiStatus.kitsu = true; }, 300000);
    }

    // Fallback to Jikan (MyAnimeList)
    try {
      if (apiStatus.jikan && RateLimiter.canMakeRequest('jikan', 60)) {
        const result = await this.searchJikan(query, limit);
        if (result && result.length > 0) {
          await APICache.set(cacheKey, result, CACHE_DURATION.ANIME_SEARCH);
          return result;
        }
      }
    } catch (error) {
      console.error('Jikan search failed:', error);
      apiStatus.jikan = false;
      setTimeout(() => { apiStatus.jikan = true; }, 300000);
    }

    throw new Error('All anime search APIs are currently unavailable');
  }

  // AniList search implementation
  static async searchAniList(query, limit = 10) {
    const graphqlQuery = `
      query ($search: String, $perPage: Int) {
        Page(perPage: $perPage) {
          media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
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
            averageScore
            episodes
            status
            startDate {
              year
              month
              day
            }
            studios {
              nodes {
                name
              }
            }
            nextAiringEpisode {
              airingAt
              episode
            }
            source
          }
        }
      }
    `;

    const response = await axios.post(ANILIST_URL, {
      query: graphqlQuery,
      variables: { search: query, perPage: limit }
    });
    return response.data.data.Page.media;
  }

  // Kitsu search implementation
  static async searchKitsu(query, limit = 10) {
    const response = await axios.get(`${KITSU_URL}/anime`, {
      params: {
        'filter[text]': query,
        'page[limit]': limit,
        'fields[anime]': 'titles,synopsis,coverImage,posterImage,averageRating,episodeCount,status,startDate,endDate'
      }
    });

    return response.data.data.map(anime => ({
      id: anime.id,
      title: {
        romaji: anime.attributes.titles.en || anime.attributes.titles.en_jp,
        english: anime.attributes.titles.en,
        native: anime.attributes.titles.ja_jp
      },
      description: anime.attributes.synopsis,
      coverImage: {
        large: anime.attributes.posterImage?.large,
        medium: anime.attributes.posterImage?.medium
      },
      genres: [],
      averageScore: Math.round(parseFloat(anime.attributes.averageRating || 0) * 10),
      episodes: anime.attributes.episodeCount,
      status: anime.attributes.status?.toUpperCase(),
      source: 'KITSU'
    }));
  }

  // Jikan search implementation
  static async searchJikan(query, limit = 10) {
    const response = await axios.get(`${JIKAN_URL}/anime`, {
      params: {
        q: query,
        limit: limit,
        order_by: 'popularity',
        sort: 'asc'
      }
    });

    return response.data.data.map(anime => ({
      id: anime.mal_id,
      title: {
        romaji: anime.title,
        english: anime.title_english,
        native: anime.title_japanese
      },
      description: anime.synopsis,
      coverImage: {
        large: anime.images.jpg.large_image_url,
        medium: anime.images.jpg.image_url
      },
      genres: anime.genres.map(g => g.name),
      averageScore: Math.round(anime.score * 10),
      episodes: anime.episodes,
      status: anime.status?.toUpperCase(),
      source: 'JIKAN'
    }));
  }

  // Get trending anime
  static async getTrendingAnime(limit = 10) {
    const graphqlQuery = `
      query ($perPage: Int) {
        Page(perPage: $perPage) {
          media(type: ANIME, sort: TRENDING_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            genres
            averageScore
            episodes
            status
            nextAiringEpisode {
              airingAt
              episode
            }
          }
        }
      }
    `;

    try {
      const response = await axios.post(ANILIST_URL, {
        query: graphqlQuery,
        variables: { perPage: limit }
      });
      return response.data.data.Page.media;
    } catch (error) {
      console.error('Error getting trending anime:', error);
      return [];
    }
  }

  // Get seasonal anime
  static async getSeasonalAnime(season, year, limit = 10) {
    const graphqlQuery = `
      query ($season: MediaSeason, $year: Int, $perPage: Int) {
        Page(perPage: $perPage) {
          media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            genres
            averageScore
            episodes
            status
            startDate {
              year
              month
              day
            }
          }
        }
      }
    `;

    try {
      const response = await axios.post(ANILIST_URL, {
        query: graphqlQuery,
        variables: { season: season.toUpperCase(), year: parseInt(year), perPage: limit }
      });
      return response.data.data.Page.media;
    } catch (error) {
      console.error('Error getting seasonal anime:', error);
      return [];
    }
  }

  // Get random anime
  static async getRandomAnime() {
    try {
      const randomPage = Math.floor(Math.random() * 100) + 1;
      const graphqlQuery = `
        query ($page: Int) {
          Page(page: $page, perPage: 50) {
            media(type: ANIME, sort: POPULARITY_DESC) {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
                medium
              }
              genres
              averageScore
              episodes
              status
              description
            }
          }
        }
      `;

      const response = await axios.post(ANILIST_URL, {
        query: graphqlQuery,
        variables: { page: randomPage }
      });

      const animeList = response.data.data.Page.media;
      return animeList[Math.floor(Math.random() * animeList.length)];
    } catch (error) {
      console.error('Error getting random anime:', error);
      return null;
    }
  }

  // Get anime by genre
  static async getAnimeByGenre(genre, limit = 10) {
    const graphqlQuery = `
      query ($genre: String, $perPage: Int) {
        Page(perPage: $perPage) {
          media(type: ANIME, genre: $genre, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            genres
            averageScore
            episodes
            status
            description
          }
        }
      }
    `;

    try {
      const response = await axios.post(ANILIST_URL, {
        query: graphqlQuery,
        variables: { genre, perPage: limit }
      });
      return response.data.data.Page.media;
    } catch (error) {
      console.error('Error getting anime by genre:', error);
      return [];
    }
  }

  // Get streaming sources
  static async getStreamingSources(animeId) {
    try {
      const response = await axios.get(`${CONSUMET_URL}/anime/gogoanime/info/${animeId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting streaming sources:', error);
      return null;
    }
  }
}

class MangaAPI {
  // Search manga using MangaDex
  static async searchManga(query, limit = 10) {
    try {
      const response = await axios.get(`${MANGADX_URL}/manga`, {
        params: {
          title: query,
          limit,
          includes: ['cover_art', 'author', 'artist'],
          order: { relevance: 'desc' }
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error searching manga:', error);
      return [];
    }
  }

  // Get random manga
  static async getRandomManga() {
    try {
      const response = await axios.get(`${MANGADX_URL}/manga/random`, {
        params: {
          includes: ['cover_art', 'author', 'artist']
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error getting random manga:', error);
      return null;
    }
  }

  // Get manga chapters
  static async getMangaChapters(mangaId, limit = 20) {
    try {
      const response = await axios.get(`${MANGADX_URL}/manga/${mangaId}/feed`, {
        params: {
          limit,
          order: { chapter: 'asc' },
          translatedLanguage: ['en']
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error getting manga chapters:', error);
      return [];
    }
  }
}

class FunAPI {
  // Get random waifu image
  static async getWaifuImage() {
    try {
      const response = await axios.get('https://api.waifu.pics/sfw/waifu');
      return response.data.url;
    } catch (error) {
      console.error('Error getting waifu image:', error);
      return null;
    }
  }

  // Get random husbando image
  static async getHusbandoImage() {
    try {
      const response = await axios.get('https://api.waifu.pics/sfw/husbando');
      return response.data.url;
    } catch (error) {
      console.error('Error getting husbando image:', error);
      return null;
    }
  }

  // Get anime quote
  static async getAnimeQuote() {
    try {
      const response = await axios.get('https://animechan.vercel.app/api/random');
      return response.data;
    } catch (error) {
      console.error('Error getting anime quote:', error);
      return null;
    }
  }

  // Get anime GIF
  static async getAnimeGif(query) {
    try {
      const response = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
        params: {
          api_key: process.env.GIPHY_API_KEY || 'demo',
          q: `anime ${query}`,
          limit: 1,
          rating: 'pg'
        }
      });
      return response.data.data[0]?.images?.original?.url || null;
    } catch (error) {
      console.error('Error getting anime GIF:', error);
      return null;
    }
  }

  // Get anime meme from Reddit
  static async getAnimeMeme() {
    try {
      const response = await axios.get('https://www.reddit.com/r/animemes/hot.json?limit=50');
      const posts = response.data.data.children.filter(post => 
        post.data.url.includes('.jpg') || 
        post.data.url.includes('.png') || 
        post.data.url.includes('.gif')
      );
      
      if (posts.length === 0) return null;
      
      const randomPost = posts[Math.floor(Math.random() * posts.length)];
      return {
        title: randomPost.data.title,
        url: randomPost.data.url,
        author: randomPost.data.author,
        upvotes: randomPost.data.ups
      };
    } catch (error) {
      console.error('Error getting anime meme:', error);
      return null;
    }
  }
}

module.exports = { AnimeAPI, MangaAPI, FunAPI };
