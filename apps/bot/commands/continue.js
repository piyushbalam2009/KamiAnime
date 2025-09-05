const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../lib/firebase');
const XPSystem = require('../lib/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('continue')
    .setDescription('Resume the last anime you were watching'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const userProfile = await XPSystem.getUserProfile(interaction.user.id);
      
      if (!userProfile || !userProfile.lastWatched) {
        return await interaction.editReply('❌ No recent anime found. Use `/watch <anime>` to start watching something!');
      }

      const lastWatched = userProfile.lastWatched;
      const nextEpisode = (lastWatched.episode || 1) + 1;

      const embed = new EmbedBuilder()
        .setColor('#7B61FF')
        .setTitle(`📺 Continue Watching: ${lastWatched.title}`)
        .setDescription(`Ready to continue where you left off?`)
        .addFields(
          { name: '📍 Last Episode', value: `Episode ${lastWatched.episode || 1}`, inline: true },
          { name: '▶️ Next Episode', value: `Episode ${nextEpisode}`, inline: true },
          { name: '⏰ Last Watched', value: `<t:${Math.floor(new Date(lastWatched.timestamp).getTime() / 1000)}:R>`, inline: true }
        )
        .setTimestamp();

      if (lastWatched.coverImage) {
        embed.setThumbnail(lastWatched.coverImage);
      }

      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel(`🎬 Watch Episode ${nextEpisode}`)
            .setStyle(ButtonStyle.Link)
            .setURL(`https://kamianime.com/anime/${lastWatched.id}/episode/${nextEpisode}`),
          new ButtonBuilder()
            .setCustomId(`watchlist_${lastWatched.id}`)
            .setLabel('📚 View Watchlist')
            .setStyle(ButtonStyle.Secondary)
        );

      embed.setFooter({ text: 'Synced with your KamiAnime account' });
      
      await interaction.editReply({ 
        embeds: [embed],
        components: [actionRow]
      });

    } catch (error) {
      console.error('Continue command error:', error);
      await interaction.editReply('❌ An error occurred while retrieving your watch history. Please try again later.');
    }
  },
};
