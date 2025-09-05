const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { EnhancedAnimeAPI, EnhancedMangaAPI } = require('../lib/enhanced-api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for anime or manga')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Search type')
        .setRequired(true)
        .addChoices(
          { name: 'Anime', value: 'anime' },
          { name: 'Manga', value: 'manga' }
        ))
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Search query')
        .setRequired(true)),

  async execute(interaction) {
    const type = interaction.options.getString('type');
    const query = interaction.options.getString('query');

    await interaction.deferReply();

    try {
      if (type === 'anime') {
        const results = await EnhancedAnimeAPI.searchAnime(query, 5);
        
        if (results.length === 0) {
          return await interaction.editReply('❌ No anime found with that search term.');
        }

        const embed = new EmbedBuilder()
          .setColor('#FF6B6B')
          .setTitle(`🔍 Anime Search Results for "${query}"`)
          .setTimestamp();

        results.slice(0, 3).forEach((anime, index) => {
          const title = anime.title?.english || anime.title?.romaji || 'Unknown Title';
          const description = anime.description ? 
            anime.description.replace(/<[^>]*>/g, '').substring(0, 100) + '...' : 
            'No description available';
          
          embed.addFields({
            name: `${index + 1}. ${title}`,
            value: `**Score:** ${anime.averageScore || 'N/A'}/100\n**Episodes:** ${anime.episodes || 'Unknown'}\n**Status:** ${anime.status || 'Unknown'}\n**Source:** ${anime.source || 'Multiple APIs'}\n${description}`,
            inline: false
          });
        });

        if (results[0]?.coverImage?.large) {
          embed.setThumbnail(results[0].coverImage.large);
        }

        embed.setFooter({ text: 'Enhanced multi-source search • Use /watch <anime> for streaming!' });
        await interaction.editReply({ embeds: [embed] });

      } else if (type === 'manga') {
        const results = await EnhancedMangaAPI.searchManga(query, 5);
        
        if (results.length === 0) {
          return await interaction.editReply('❌ No manga found with that search term.');
        }

        const embed = new EmbedBuilder()
          .setColor('#00C2FF')
          .setTitle(`🔍 Manga Search Results for "${query}"`)
          .setTimestamp();

        results.slice(0, 3).forEach((manga, index) => {
          const title = manga.title || 'Unknown Title';
          const description = manga.description ? 
            manga.description.substring(0, 100) + '...' : 
            'No description available';
          
          embed.addFields({
            name: `${index + 1}. ${title}`,
            value: `**Status:** ${manga.status || 'Unknown'}\n**Tags:** ${manga.tags ? manga.tags.slice(0, 3).join(', ') : 'N/A'}\n**Source:** ${manga.source || 'Multiple APIs'}\n${description}`,
            inline: false
          });
        });

        if (results[0]?.coverImage) {
          embed.setThumbnail(results[0].coverImage);
        }

        embed.setFooter({ text: 'Enhanced multi-source search • Use /chapter <manga> <number> for reading!' });
        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Search command error:', error);
      await interaction.editReply('❌ An error occurred while searching. All APIs may be temporarily unavailable. Please try again later.');
    }
  },
};
