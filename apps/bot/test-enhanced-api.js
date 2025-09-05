// Test script for enhanced API and gamification system
const { EnhancedAnimeAPI, EnhancedMangaAPI, FunAPI, APIHealthMonitor } = require('./lib/enhanced-api');
const { APIVerifiedGamification } = require('./lib/gamification');

// Test user ID for testing
const TEST_USER_ID = 'test_user_123';

async function testEnhancedAPIs() {
  console.log('🧪 Testing Enhanced KamiAnime API System...\n');

  // Test API Health Monitor
  console.log('1. Testing API Health Monitor...');
  try {
    const healthStatus = await APIHealthMonitor.checkAllAPIs();
    console.log('✅ API Health Status:', healthStatus);
  } catch (error) {
    console.error('❌ API Health Monitor failed:', error.message);
  }

  // Test Enhanced Anime API
  console.log('\n2. Testing Enhanced Anime API...');
  try {
    const animeResults = await EnhancedAnimeAPI.searchAnime('Attack on Titan', 1);
    console.log('✅ Anime Search Results:', animeResults[0]?.title);
    
    if (animeResults[0]) {
      const streamingSources = await EnhancedAnimeAPI.getStreamingSources(animeResults[0].id, 1);
      console.log('✅ Streaming Sources Found:', streamingSources?.length || 0);
    }
    
    const trendingAnime = await EnhancedAnimeAPI.getTrendingAnime(5);
    console.log('✅ Trending Anime Count:', trendingAnime?.length || 0);
  } catch (error) {
    console.error('❌ Enhanced Anime API failed:', error.message);
  }

  // Test Enhanced Manga API
  console.log('\n3. Testing Enhanced Manga API...');
  try {
    const mangaResults = await EnhancedMangaAPI.searchManga('One Piece', 1);
    console.log('✅ Manga Search Results:', mangaResults[0]?.attributes?.title);
    
    if (mangaResults[0]) {
      const chapters = await EnhancedMangaAPI.getChapters(mangaResults[0].id, 1);
      console.log('✅ Chapter Data Found:', chapters?.length || 0);
    }
  } catch (error) {
    console.error('❌ Enhanced Manga API failed:', error.message);
  }

  // Test Fun API
  console.log('\n4. Testing Fun API...');
  try {
    const quote = await FunAPI.getRandomQuote();
    console.log('✅ Random Quote:', quote?.character || 'No quote');
    
    const waifuImage = await FunAPI.getWaifuImage();
    console.log('✅ Waifu Image URL:', waifuImage ? 'Found' : 'Not found');
    
    const gif = await FunAPI.getAnimeGif('happy');
    console.log('✅ Anime GIF:', gif ? 'Found' : 'Not found');
    
    const meme = await FunAPI.getAnimeMeme();
    console.log('✅ Anime Meme:', meme ? 'Found' : 'Not found');
  } catch (error) {
    console.error('❌ Fun API failed:', error.message);
  }

  console.log('\n🎉 Enhanced API testing completed!');
}

async function testGamificationSystem() {
  console.log('\n🎮 Testing API-Verified Gamification System...\n');

  // Test XP awarding for watching anime
  console.log('1. Testing Episode Watch XP...');
  try {
    const watchResult = await APIVerifiedGamification.awardXP(
      TEST_USER_ID,
      'WATCH_EPISODE',
      { sources: [{ url: 'test-stream', quality: '720p' }] },
      {
        animeId: 'test-anime-123',
        animeTitle: 'Test Anime',
        episodeNumber: 1,
        isTrending: true,
        isSeasonal: false
      }
    );
    console.log('✅ Watch Episode XP Result:', watchResult);
  } catch (error) {
    console.error('❌ Watch Episode XP failed:', error.message);
  }

  // Test XP awarding for reading manga
  console.log('\n2. Testing Chapter Read XP...');
  try {
    const readResult = await APIVerifiedGamification.awardXP(
      TEST_USER_ID,
      'READ_CHAPTER',
      { chapter: { pages: ['page1.jpg', 'page2.jpg'] } },
      {
        mangaId: 'test-manga-456',
        mangaTitle: 'Test Manga',
        chapterNumber: 1,
        isPopular: true
      }
    );
    console.log('✅ Read Chapter XP Result:', readResult);
  } catch (error) {
    console.error('❌ Read Chapter XP failed:', error.message);
  }

  // Test quote claiming XP
  console.log('\n3. Testing Quote Claim XP...');
  try {
    const quoteResult = await APIVerifiedGamification.awardXP(
      TEST_USER_ID,
      'CLAIM_QUOTE',
      { quote: { quote: 'Test quote', character: 'Test Character', anime: 'Test Anime' } },
      {
        character: 'Test Character',
        anime: 'Test Anime'
      }
    );
    console.log('✅ Quote Claim XP Result:', quoteResult);
  } catch (error) {
    console.error('❌ Quote Claim XP failed:', error.message);
  }

  // Test watch party XP
  console.log('\n4. Testing Watch Party XP...');
  try {
    const partyResult = await APIVerifiedGamification.awardXP(
      TEST_USER_ID,
      'WATCH_PARTY',
      { sources: [{ url: 'test-stream', quality: '1080p' }] },
      {
        animeId: 'test-anime-789',
        animeTitle: 'Party Anime',
        episodeNumber: 5,
        partyId: 'test-party-123',
        participantCount: 4
      }
    );
    console.log('✅ Watch Party XP Result:', partyResult);
  } catch (error) {
    console.error('❌ Watch Party XP failed:', error.message);
  }

  // Test user profile retrieval
  console.log('\n5. Testing User Profile...');
  try {
    const userProfile = await APIVerifiedGamification.getUserProfile(TEST_USER_ID);
    console.log('✅ User Profile:', userProfile);
  } catch (error) {
    console.error('❌ User Profile failed:', error.message);
  }

  // Test badge checking
  console.log('\n6. Testing Badge System...');
  try {
    const userBadges = await APIVerifiedGamification.getUserBadges(TEST_USER_ID);
    console.log('✅ User Badges:', userBadges?.length || 0);
  } catch (error) {
    console.error('❌ Badge System failed:', error.message);
  }

  // Test quest system
  console.log('\n7. Testing Quest System...');
  try {
    const activeQuests = await APIVerifiedGamification.getActiveQuests(TEST_USER_ID);
    console.log('✅ Active Quests:', activeQuests?.length || 0);
  } catch (error) {
    console.error('❌ Quest System failed:', error.message);
  }

  console.log('\n🎉 Gamification system testing completed!');
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting KamiAnime Enhanced System Tests...\n');
  
  await testEnhancedAPIs();
  await testGamificationSystem();
  
  console.log('\n✨ All tests completed! Check the results above for any issues.');
  console.log('🔧 If any tests failed, ensure your environment variables are set correctly.');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testEnhancedAPIs,
  testGamificationSystem,
  runAllTests
};
