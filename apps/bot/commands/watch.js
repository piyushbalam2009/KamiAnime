const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { EnhancedAnimeAPI } = require('../lib/enhanced-api');
const { APIVerifiedGamification } = require('../lib/gamification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('watch')
    .setDescription('Get streaming links for an anime')
    .addStringOption(option =>
      option.setName('anime')
        .setDescription('Anime name to watch')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('episode')
        .setDescription('Episode number (default: 1)')
        .setRequired(false)),

  async execute(interaction) {
    const animeName = interaction.options.getString('anime');
    const episodeNumber = interaction.options.getInteger('episode') || 1;
    
    await interaction.deferReply();

    try {
      // Search for the anime first
      const searchResults = await EnhancedAnimeAPI.searchAnime(animeName, 1);
      
      if (searchResults.length === 0) {
        return await interaction.editReply(`❌ No anime found with the name "${animeName}". Try a different search term.`);
      }

      const anime = searchResults[0];
      const title = anime.title?.english || anime.title?.romaji || 'Unknown Title';
      
      // Get streaming sources to verify episode exists
      const streamingSources = await EnhancedAnimeAPI.getStreamingSources(anime.id, episodeNumber);
      
      // Check if anime is trending or seasonal for bonus XP
      const trendingAnime = await EnhancedAnimeAPI.getTrendingAnime(50);
      const isTrending = trendingAnime.some(trending => trending.id === anime.id);
      
      // For seasonal check, we'll use a simple heuristic based on current season
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      let currentSeason = 'WINTER';
      if (currentMonth >= 4 && currentMonth <= 6) currentSeason = 'SPRING';
      else if (currentMonth >= 7 && currentMonth <= 9) currentSeason = 'SUMMER';
      else if (currentMonth >= 10 && currentMonth <= 12) currentSeason = 'FALL';
      
      const isSeasonal = anime.startDate && 
                        anime.startDate.year === currentYear &&
                        anime.status === 'RELEASING';
      
      // Award XP for verified watching with API validation
      const xpResult = await APIVerifiedGamification.awardXP(
        interaction.user.id, 
        'WATCH_EPISODE', 
        { sources: streamingSources }, 
        {
          animeId: anime.id,
          animeTitle: title,
          episodeNumber: episodeNumber,
          isTrending: isTrending,
          isSeasonal: isSeasonal
        }
      );

      const embed = new EmbedBuilder()
        .setColor('#7B61FF')
        .setTitle(`📺 ${title} - Episode ${episodeNumber}`)
        .setDescription(`Ready to watch ${title}? Click the button below to start streaming!`)
        .addFields(
          { name: '⭐ Score', value: `${anime.averageScore || 'N/A'}/100`, inline: true },
          { name: '📺 Episodes', value: `${anime.episodes || 'Unknown'}`, inline: true },
          { name: '📊 Status', value: anime.status, inline: true },
          { name: '🎭 Genres', value: (anime.genres || []).slice(0, 4).join(', ') || 'Unknown', inline: false }
        )
        .setTimestamp();

      if (anime.coverImage?.large) {
        embed.setThumbnail(anime.coverImage.large);
      }

      // Add XP information to embed
      if (xpResult.success) {
        let xpText = `+${xpResult.xpAwarded} XP earned!`;
        if (xpResult.bonusXP > 0) {
          xpText += ` (${xpResult.baseXP} base`;
          if (isTrending) xpText += ' +10 trending';
          if (isSeasonal) xpText += ' +15 seasonal';
          if (xpResult.streakMultiplier > 1) xpText += ` x${xpResult.streakMultiplier} streak`;
          xpText += ')';
        }
        if (xpResult.levelUp) {
          xpText += ` 🎉 Level up! Now level ${xpResult.newLevel}!`;
        }
        
        embed.addFields({
          name: '🏆 Rewards',
          value: xpText + `\n**Total XP:** ${xpResult.newXP}`,
          inline: false
        });
      } else {
        embed.addFields({
          name: '⚠️ Verification Failed',
          value: 'Episode could not be verified. No XP awarded.',
          inline: false
        });
      }

      // Create action buttons with streaming sources
      const actionRow = new ActionRowBuilder();
      
      if (streamingSources && streamingSources.length > 0) {
        actionRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`stream_${anime.id}_${episodeNumber}`)
            .setLabel('🎬 Stream Episode')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setLabel('🌐 Watch on KamiAnime')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://kamianime.com/anime/${anime.id}`)
        );
      } else {
        actionRow.addComponents(
          new ButtonBuilder()
            .setLabel('🌐 View on KamiAnime')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://kamianime.com/anime/${anime.id}`)
        );
      }
      
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`watchlist_${anime.id}`)
          .setLabel('📚 Add to Watchlist')
          .setStyle(ButtonStyle.Secondary)
      );

      embed.setFooter({ text: xpResult.success ? 
        'API-verified episode • XP synced with KamiAnime account' : 
        'Episode verification failed • Try again later' });
      
      await interaction.editReply({ 
        embeds: [embed],
        components: [actionRow]
      });

    } catch (error) {
      console.error('Watch command error:', error);
      await interaction.editReply('❌ An error occurred while getting streaming links. Please try again later.');
    }
  },
};
