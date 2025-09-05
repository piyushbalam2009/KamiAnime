const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { AnimeAPI } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('season')
    .setDescription('Show seasonal anime releases')
    .addStringOption(option =>
      option.setName('season')
        .setDescription('Season')
        .setRequired(true)
        .addChoices(
          { name: 'Spring', value: 'spring' },
          { name: 'Summer', value: 'summer' },
          { name: 'Fall', value: 'fall' },
          { name: 'Winter', value: 'winter' }
        ))
    .addIntegerOption(option =>
      option.setName('year')
        .setDescription('Year (default: current year)')
        .setRequired(false)),

  async execute(interaction) {
    const season = interaction.options.getString('season');
    const year = interaction.options.getInteger('year') || new Date().getFullYear();
    
    await interaction.deferReply();

    try {
      const seasonalAnime = await AnimeAPI.getSeasonalAnime(season, year, 10);
      
      if (seasonalAnime.length === 0) {
        return await interaction.editReply(`❌ No anime found for ${season} ${year}.`);
      }
      
      const embed = new EmbedBuilder()
        .setColor('#7B61FF')
        .setTitle(`🌸 ${season.charAt(0).toUpperCase() + season.slice(1)} ${year} Anime`)
        .setDescription(`Anime releases for ${season} ${year}`)
        .setTimestamp();

      seasonalAnime.slice(0, 8).forEach((anime, index) => {
        const title = anime.title.english || anime.title.romaji;
        const startDate = anime.startDate ? 
          `${anime.startDate.month}/${anime.startDate.day}/${anime.startDate.year}` : 
          'TBA';
        
        embed.addFields({
          name: `${index + 1}. ${title}`,
          value: `**Score:** ${anime.averageScore || 'N/A'}/100\n**Episodes:** ${anime.episodes || 'Unknown'}\n**Start Date:** ${startDate}\n**Genres:** ${anime.genres.slice(0, 2).join(', ')}`,
          inline: true
        });
      });

      if (seasonalAnime[0]?.coverImage?.large) {
        embed.setThumbnail(seasonalAnime[0].coverImage.large);
      }

      embed.setFooter({ text: `Found ${seasonalAnime.length} anime • Use /watch <anime> to start watching!` });
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Season command error:', error);
      await interaction.editReply('❌ An error occurred while fetching seasonal anime. Please try again later.');
    }
  },
};
