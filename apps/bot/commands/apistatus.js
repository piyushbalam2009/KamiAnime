const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { APIHealthMonitor } = require('../lib/enhanced-api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apistatus')
    .setDescription('Check the status of all external APIs'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const healthStatus = await APIHealthMonitor.checkAllAPIs();
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔍 API Health Status')
        .setDescription('Current status of all external APIs used by KamiAnime bot')
        .setTimestamp();

      // Add status for each API
      const apiList = [
        { name: 'AniList GraphQL', key: 'anilist', description: 'Primary anime/manga metadata' },
        { name: 'Kitsu API', key: 'kitsu', description: 'Backup anime metadata' },
        { name: 'Jikan (MyAnimeList)', key: 'jikan', description: 'Alternative metadata source' },
        { name: 'Consumet API', key: 'consumet', description: 'Streaming & manga sources' },
        { name: 'MangaDex API', key: 'mangadx', description: 'Primary manga source' },
        { name: 'AnimeChan', key: 'animechan', description: 'Anime quotes' },
        { name: 'Waifu.pics', key: 'waifupics', description: 'Character images' },
        { name: 'Tenor API', key: 'tenor', description: 'Anime GIFs' },
        { name: 'Reddit API', key: 'reddit', description: 'Anime memes' }
      ];

      let healthyCount = 0;
      let totalCount = apiList.length;

      apiList.forEach(api => {
        const status = healthStatus[api.key];
        const statusEmoji = status ? '🟢' : '🔴';
        const statusText = status ? 'Online' : 'Offline';
        
        if (status) healthyCount++;

        embed.addFields({
          name: `${statusEmoji} ${api.name}`,
          value: `**Status:** ${statusText}\n**Purpose:** ${api.description}`,
          inline: true
        });
      });

      // Overall health summary
      const healthPercentage = Math.round((healthyCount / totalCount) * 100);
      let overallColor = '#00FF00'; // Green
      if (healthPercentage < 70) overallColor = '#FF0000'; // Red
      else if (healthPercentage < 90) overallColor = '#FFA500'; // Orange

      embed.setColor(overallColor);
      embed.addFields({
        name: '📊 Overall Health',
        value: `${healthyCount}/${totalCount} APIs online (${healthPercentage}%)`,
        inline: false
      });

      // Add fallback information
      embed.addFields({
        name: '🔄 Fallback System',
        value: 'The bot uses multiple API sources with automatic fallback to ensure reliability even when some APIs are down.',
        inline: false
      });

      embed.setFooter({ text: 'API status checked in real-time • Updates every 5 minutes' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('API Status command error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ API Status Check Failed')
        .setDescription('Unable to check API status at this time. Please try again later.')
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
