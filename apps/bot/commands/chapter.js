const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { EnhancedMangaAPI } = require('../lib/enhanced-api');
const { APIVerifiedGamification } = require('../lib/gamification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chapter')
    .setDescription('Get a direct manga reading link')
    .addStringOption(option =>
      option.setName('manga')
        .setDescription('Manga title')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('chapter')
        .setDescription('Chapter number')
        .setRequired(true)),

  async execute(interaction) {
    const mangaTitle = interaction.options.getString('manga');
    const chapterNumber = interaction.options.getInteger('chapter');
    
    await interaction.deferReply();

    try {
      // Search for the manga first
      const searchResults = await EnhancedMangaAPI.searchManga(mangaTitle, 1);
      
      if (searchResults.length === 0) {
        return await interaction.editReply(`❌ No manga found with the title "${mangaTitle}".`);
      }

      const manga = searchResults[0];
      const title = manga.attributes?.title?.en || 
                   (manga.attributes?.title ? Object.values(manga.attributes.title)[0] : null) ||
                   manga.title || 'Unknown Title';
      
      // Get chapter data to verify it exists
      const chapterData = await EnhancedMangaAPI.getChapters(manga.id, chapterNumber);
      
      // Check if manga is popular for bonus XP (simplified check based on rating/follows)
      const isPopular = manga.attributes?.rating?.average > 8.0 || 
                       manga.attributes?.follows > 10000;
      
      // Award XP for verified reading with API validation
      const xpResult = await APIVerifiedGamification.awardXP(
        interaction.user.id, 
        'READ_CHAPTER', 
        { chapter: chapterData }, 
        {
          mangaId: manga.id,
          mangaTitle: title,
          chapterNumber: chapterNumber,
          isPopular: isPopular
        }
      );

      const embed = new EmbedBuilder()
        .setColor('#00C2FF')
        .setTitle(`📖 ${title} - Chapter ${chapterNumber}`)
        .setDescription(`Ready to read ${title}? Click the button below to start reading!`)
        .addFields(
          { name: '📊 Status', value: manga.attributes?.status || 'Unknown', inline: true },
          { name: '📅 Year', value: `${manga.attributes?.year || 'Unknown'}`, inline: true },
          { name: '🏷️ Tags', value: (manga.attributes?.tags || []).slice(0, 3).map(tag => tag.attributes?.name?.en || 'Unknown').join(', ') || 'No tags', inline: false }
        )
        .setTimestamp();

      // Add XP information to embed
      if (xpResult.success) {
        let xpText = `+${xpResult.xpAwarded} XP earned!`;
        if (xpResult.bonusXP > 0) {
          xpText += ` (${xpResult.baseXP} base`;
          if (isPopular) xpText += ' +10 popular';
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
          value: 'Chapter could not be verified. No XP awarded.',
          inline: false
        });
      }

      // Create action buttons with chapter verification
      const actionRow = new ActionRowBuilder();
      
      if (chapterData && chapterData.length > 0) {
        actionRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`read_${manga.id}_${chapterNumber}`)
            .setLabel('📖 Read Chapter')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setLabel('🌐 Read on KamiAnime')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://kamianime.com/manga/${manga.id}/chapter/${chapterNumber}`)
        );
      } else {
        actionRow.addComponents(
          new ButtonBuilder()
            .setLabel('🌐 View on KamiAnime')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://kamianime.com/manga/${manga.id}`)
        );
      }
      
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`bookmark_${manga.id}`)
          .setLabel('🔖 Add to Reading List')
          .setStyle(ButtonStyle.Secondary)
      );

      embed.setFooter({ text: xpResult.success ? 
        'API-verified chapter • XP synced with KamiAnime account' : 
        'Chapter verification failed • Try again later' });
      
      await interaction.editReply({ 
        embeds: [embed],
        components: [actionRow]
      });

    } catch (error) {
      console.error('Chapter command error:', error);
      await interaction.editReply('❌ An error occurred while getting the chapter link. Please try again later.');
    }
  },
};
