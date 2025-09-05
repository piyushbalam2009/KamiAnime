const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { AnimeAPI } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recommend')
    .setDescription('Get anime recommendations by genre')
    .addStringOption(option =>
      option.setName('genre')
        .setDescription('Genre to recommend from')
        .setRequired(true)
        .addChoices(
          { name: 'Action', value: 'Action' },
          { name: 'Adventure', value: 'Adventure' },
          { name: 'Comedy', value: 'Comedy' },
          { name: 'Drama', value: 'Drama' },
          { name: 'Fantasy', value: 'Fantasy' },
          { name: 'Horror', value: 'Horror' },
          { name: 'Romance', value: 'Romance' },
          { name: 'Sci-Fi', value: 'Sci-Fi' },
          { name: 'Slice of Life', value: 'Slice of Life' },
          { name: 'Sports', value: 'Sports' },
          { name: 'Supernatural', value: 'Supernatural' },
          { name: 'Thriller', value: 'Thriller' }
        )),

  async execute(interaction) {
    const genre = interaction.options.getString('genre');
    
    await interaction.deferReply();

    try {
      const recommendations = await AnimeAPI.getAnimeByGenre(genre, 8);
      
      if (recommendations.length === 0) {
        return await interaction.editReply(`❌ No ${genre} anime found. Try a different genre!`);
      }
      
      const embed = new EmbedBuilder()
        .setColor('#7B61FF')
        .setTitle(`🎯 ${genre} Anime Recommendations`)
        .setDescription(`Here are some great ${genre} anime you might enjoy!`)
        .setTimestamp();

      recommendations.slice(0, 6).forEach((anime, index) => {
        const title = anime.title.english || anime.title.romaji;
        const description = anime.description ? 
          anime.description.replace(/<[^>]*>/g, '').substring(0, 80) + '...' : 
          'No description available';
        
        embed.addFields({
          name: `${index + 1}. ${title}`,
          value: `**Score:** ${anime.averageScore || 'N/A'}/100\n**Episodes:** ${anime.episodes || 'Unknown'}\n${description}`,
          inline: true
        });
      });

      if (recommendations[0]?.coverImage?.large) {
        embed.setThumbnail(recommendations[0].coverImage.large);
      }

      embed.setFooter({ text: `Found ${recommendations.length} ${genre} anime • Use /watch <anime> to start watching!` });
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Recommend command error:', error);
      await interaction.editReply('❌ An error occurred while getting recommendations. Please try again later.');
    }
  },
};
