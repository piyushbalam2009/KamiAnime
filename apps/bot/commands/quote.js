const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { FunAPI } = require('../lib/enhanced-api');
const { APIVerifiedGamification } = require('../lib/gamification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Get a random anime quote and earn XP'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const quote = await FunAPI.getRandomQuote();
      
      if (!quote) {
        return await interaction.editReply('❌ Could not fetch anime quote. Please try again.');
      }

      // Award XP for claiming quote
      const xpResult = await APIVerifiedGamification.awardXP(
        interaction.user.id,
        'CLAIM_QUOTE',
        { quote: quote },
        {
          character: quote.character,
          anime: quote.anime
        }
      );

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('💬 Random Anime Quote')
        .setDescription(`*"${quote.quote}"*`)
        .addFields(
          { name: '👤 Character', value: quote.character, inline: true },
          { name: '📺 Anime', value: quote.anime, inline: true }
        )
        .setTimestamp();

      // Add XP information if successful
      if (xpResult.success) {
        let xpText = `+${xpResult.xpAwarded} XP earned!`;
        if (xpResult.levelUp) {
          xpText += ` 🎉 Level up! Now level ${xpResult.newLevel}!`;
        }
        
        embed.addFields({
          name: '🏆 Reward',
          value: xpText,
          inline: false
        });
        
        embed.setFooter({ text: 'API-verified quote • XP synced with KamiAnime account' });
      } else {
        embed.setFooter({ text: 'Powered by AnimeChan API' });
      }

      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('quote_new')
            .setLabel('🔄 New Quote')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('quote_share')
            .setLabel('📤 Share Quote')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.editReply({ 
        embeds: [embed],
        components: [actionRow]
      });

    } catch (error) {
      console.error('Quote command error:', error);
      await interaction.editReply('❌ An error occurred while fetching anime quote. Please try again later.');
    }
  },
};
