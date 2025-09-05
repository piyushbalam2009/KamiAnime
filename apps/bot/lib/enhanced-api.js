const axios = require('axios');
const { db } = require('./firebase');

// Base URLs for different APIs
const ANILIST_URL = 'https://graphql.anilist.co';
const KITSU_URL = 'https://kitsu.io/api/edge';
const JIKAN_URL = 'https://api.jikan.moe/v4';
const CONSUMET_URL = 'https://api.consumet.org';
const MANGADX_URL = 'https://api.mangadx.org';
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

class EnhancedAnimeAPI {
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
    
    return response.data.data.Page.media.map(anime => ({
      ...anime,
      source: 'ANILIST'
    }));
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

  // Multi-source trending anime
  static async getTrendingAnime(limit = 10) {
    const cacheKey = `trending_anime_${limit}`;
    
    const cached = await APICache.get(cacheKey);
    if (cached) return cached;

    try {
      if (apiStatus.anilist && RateLimiter.canMakeRequest('anilist', 90)) {
        const result = await this.getTrendingAniList(limit);
        if (result && result.length > 0) {
          await APICache.set(cacheKey, result, CACHE_DURATION.TRENDING);
          return result;
        }
      }
    } catch (error) {
      console.error('AniList trending failed:', error);
      // Fallback to Kitsu trending
      try {
        const result = await this.getTrendingKitsu(limit);
        await APICache.set(cacheKey, result, CACHE_DURATION.TRENDING);
        return result;
      } catch (fallbackError) {
        console.error('All trending APIs failed:', fallbackError);
        return [];
      }
    }
  }

  static async getTrendingAniList(limit = 10) {
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

    const response = await axios.post(ANILIST_URL, {
      query: graphqlQuery,
      variables: { perPage: limit }
    });
    
    return response.data.data.Page.media.map(anime => ({
      ...anime,
      source: 'ANILIST'
    }));
  }

  static async getTrendingKitsu(limit = 10) {
    const response = await axios.get(`${KITSU_URL}/trending/anime`, {
      params: {
        'page[limit]': limit
      }
    });

    return response.data.data.map(anime => ({
      id: anime.id,
      title: {
        romaji: anime.attributes.titles.en || anime.attributes.titles.en_jp,
        english: anime.attributes.titles.en,
        native: anime.attributes.titles.ja_jp
      },
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

  // Enhanced streaming sources with multiple providers
  static async getStreamingSources(animeId, episode = 1) {
    const cacheKey = `streaming_${animeId}_${episode}`;
    
    const cached = await APICache.get(cacheKey);
    if (cached) return cached;

    const sources = [];

    // Try Consumet first
    try {
      if (apiStatus.consumet && RateLimiter.canMakeRequest('consumet', 60)) {
        const consumetSources = await this.getConsumetSources(animeId, episode);
        sources.push(...consumetSources);
      }
    } catch (error) {
      console.error('Consumet streaming failed:', error);
    }

    // Try GogoAnime fallback
    try {
      const gogoSources = await this.getGogoAnimeSources(animeId, episode);
      sources.push(...gogoSources);
    } catch (error) {
      console.error('GogoAnime streaming failed:', error);
    }

    await APICache.set(cacheKey, sources, CACHE_DURATION.ANIME_SEARCH);
    return sources;
  }

  static async getConsumetSources(animeId, episode) {
    const response = await axios.get(`${CONSUMET_URL}/anime/gogoanime/watch/${animeId}-episode-${episode}`);
    return response.data.sources || [];
  }

  static async getGogoAnimeSources(animeId, episode) {
    // Fallback implementation for GogoAnime
    const response = await axios.get(`${CONSUMET_URL}/anime/gogoanime/watch/${animeId}-episode-${episode}`);
    return response.data.sources || [];
  }
}

class EnhancedMangaAPI {
  // Multi-source manga search
  static async searchManga(query, limit = 10) {
    const cacheKey = `manga_search_${query}_${limit}`;
    
    const cached = await APICache.get(cacheKey);
    if (cached) return cached;

    // Try MangaDex first
    try {
      if (apiStatus.mangadx && RateLimiter.canMakeRequest('mangadx', 60)) {
        const result = await this.searchMangaDex(query, limit);
        if (result && result.length > 0) {
          await APICache.set(cacheKey, result, CACHE_DURATION.MANGA_SEARCH);
          return result;
        }
      }
    } catch (error) {
      console.error('MangaDex search failed:', error);
      apiStatus.mangadx = false;
      setTimeout(() => { apiStatus.mangadx = true; }, 300000);
    }

    // Fallback to Consumet manga sources
    try {
      if (apiStatus.consumet && RateLimiter.canMakeRequest('consumet', 60)) {
        const result = await this.searchConsumetManga(query, limit);
        if (result && result.length > 0) {
          await APICache.set(cacheKey, result, CACHE_DURATION.MANGA_SEARCH);
          return result;
        }
      }
    } catch (error) {
      console.error('Consumet manga search failed:', error);
    }

    throw new Error('All manga search APIs are currently unavailable');
  }

  static async searchMangaDex(query, limit = 10) {
    const response = await axios.get(`${MANGADX_URL}/manga`, {
      params: {
        title: query,
        limit: limit,
        'order[relevance]': 'desc'
      }
    });

    return response.data.data.map(manga => ({
      id: manga.id,
      title: manga.attributes.title.en || Object.values(manga.attributes.title)[0],
      description: manga.attributes.description.en || Object.values(manga.attributes.description)[0],
      coverImage: `https://uploads.mangadx.org/covers/${manga.id}/${manga.relationships.find(r => r.type === 'cover_art')?.attributes?.fileName}`,
      status: manga.attributes.status,
      tags: manga.attributes.tags.map(tag => tag.attributes.name.en),
      source: 'MANGADX'
    }));
  }

  static async searchConsumetManga(query, limit = 10) {
    const response = await axios.get(`${CONSUMET_URL}/manga/mangasee123/${encodeURIComponent(query)}`);
    return response.data.results.slice(0, limit).map(manga => ({
      ...manga,
      source: 'CONSUMET'
    }));
  }

  // Get manga chapters with multiple sources
  static async getChapters(mangaId, chapterNumber) {
    const cacheKey = `manga_chapter_${mangaId}_${chapterNumber}`;
    
    const cached = await APICache.get(cacheKey);
    if (cached) return cached;

    try {
      // Try MangaDex first
      const result = await this.getMangaDexChapter(mangaId, chapterNumber);
      await APICache.set(cacheKey, result, CACHE_DURATION.MANGA_SEARCH);
      return result;
    } catch (error) {
      console.error('MangaDex chapter failed:', error);
      
      // Fallback to Consumet
      try {
        const result = await this.getConsumetChapter(mangaId, chapterNumber);
        await APICache.set(cacheKey, result, CACHE_DURATION.MANGA_SEARCH);
        return result;
      } catch (fallbackError) {
        console.error('All manga chapter APIs failed:', fallbackError);
        throw new Error('Chapter not available');
      }
    }
  }

  static async getMangaDexChapter(mangaId, chapterNumber) {
    const response = await axios.get(`${MANGADX_URL}/at-home/server/${mangaId}`);
    return response.data;
  }

  static async getConsumetChapter(mangaId, chapterNumber) {
    const response = await axios.get(`${CONSUMET_URL}/manga/mangasee123/read`, {
      params: {
        chapterId: `${mangaId}-chapter-${chapterNumber}`
      }
    });
    return response.data;
  }
}

class FunAPI {
  // Enhanced quote system with caching
  static async getRandomQuote() {
    const cacheKey = 'random_quote';
    
    const cached = await APICache.get(cacheKey);
    if (cached) return cached;

    try {
      if (apiStatus.animechan && RateLimiter.canMakeRequest('animechan', 60)) {
        const response = await axios.get(`${ANIMECHAN_URL}/random`);
        const quote = response.data;
        await APICache.set(cacheKey, quote, CACHE_DURATION.QUOTES);
        return quote;
      }
    } catch (error) {
      console.error('AnimeChan API failed:', error);
      // Return fallback quote
      return {
        anime: 'Naruto',
        character: 'Naruto Uzumaki',
        quote: 'I never go back on my word! That is my nindō: my ninja way!'
      };
    }
  }

  // Enhanced waifu/husbando images
  static async getWaifuImage(category = 'waifu') {
    const cacheKey = `waifu_${category}`;
    
    try {
      if (apiStatus.waifupics && RateLimiter.canMakeRequest('waifupics', 60)) {
        const response = await axios.get(`${WAIFU_PICS_URL}/sfw/${category}`);
        return response.data;
      }
    } catch (error) {
      console.error('Waifu.pics API failed:', error);
      return { url: 'https://via.placeholder.com/400x600?text=Image+Not+Available' };
    }
  }

  // Tenor GIF integration
  static async getAnimeGif(query, limit = 1) {
    const cacheKey = `gif_${query}_${limit}`;
    
    const cached = await APICache.get(cacheKey);
    if (cached) return cached;

    try {
      if (apiStatus.tenor && RateLimiter.canMakeRequest('tenor', 60)) {
        const response = await axios.get(`${TENOR_URL}/search`, {
          params: {
            q: `anime ${query}`,
            key: process.env.TENOR_API_KEY,
            limit: limit,
            contentfilter: 'medium'
          }
        });
        
        const result = response.data.results[0];
        await APICache.set(cacheKey, result, CACHE_DURATION.IMAGES);
        return result;
      }
    } catch (error) {
      console.error('Tenor API failed:', error);
      return { media_formats: { gif: { url: 'https://via.placeholder.com/400x300.gif?text=GIF+Not+Available' } } };
    }
  }

  // Reddit meme integration
  static async getAnimeMeme() {
    const cacheKey = 'anime_meme';
    
    const cached = await APICache.get(cacheKey);
    if (cached) return cached;

    const subreddits = ['animemes', 'wholesomeanimemes', 'anime_irl'];
    const randomSubreddit = subreddits[Math.floor(Math.random() * subreddits.length)];

    try {
      if (apiStatus.reddit && RateLimiter.canMakeRequest('reddit', 60)) {
        const response = await axios.get(`${REDDIT_URL}/${randomSubreddit}/hot.json?limit=50`);
        const posts = response.data.data.children.filter(post => 
          post.data.post_hint === 'image' && !post.data.over_18
        );
        
        if (posts.length > 0) {
          const randomPost = posts[Math.floor(Math.random() * posts.length)].data;
          const meme = {
            title: randomPost.title,
            url: randomPost.url,
            subreddit: randomPost.subreddit,
            author: randomPost.author,
            score: randomPost.score,
            permalink: `https://reddit.com${randomPost.permalink}`
          };
          
          await APICache.set(cacheKey, meme, CACHE_DURATION.MEMES);
          return meme;
        }
      }
    } catch (error) {
      console.error('Reddit API failed:', error);
    }

    // Fallback meme
    return {
      title: 'When all APIs are down but you still need memes',
      url: 'https://via.placeholder.com/500x400?text=Meme+Not+Available',
      subreddit: 'animemes',
      author: 'KamiAnime Bot',
      score: 9999
    };
  }
}

// API Health Monitor
class APIHealthMonitor {
  static async checkAllAPIs() {
    const healthStatus = {};

    // Check AniList
    try {
      await axios.post(ANILIST_URL, { query: '{ Media(id: 1) { id } }' }, { timeout: 5000 });
      healthStatus.anilist = true;
    } catch (error) {
      healthStatus.anilist = false;
    }

    // Check Kitsu
    try {
      await axios.get(`${KITSU_URL}/anime?page[limit]=1`, { timeout: 5000 });
      healthStatus.kitsu = true;
    } catch (error) {
      healthStatus.kitsu = false;
    }

    // Check Jikan
    try {
      await axios.get(`${JIKAN_URL}/anime/1`, { timeout: 5000 });
      healthStatus.jikan = true;
    } catch (error) {
      healthStatus.jikan = false;
    }

    // Check Consumet
    try {
      await axios.get(`${CONSUMET_URL}/anime/gogoanime/naruto`, { timeout: 5000 });
      healthStatus.consumet = true;
    } catch (error) {
      healthStatus.consumet = false;
    }

    // Update global status
    Object.assign(apiStatus, healthStatus);
    
    return healthStatus;
  }

  static getStatus() {
    return { ...apiStatus };
  }
}

module.exports = {
  EnhancedAnimeAPI,
  EnhancedMangaAPI,
  FunAPI,
  APIHealthMonitor,
  APICache,
  RateLimiter
};
