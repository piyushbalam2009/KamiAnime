const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { AnimeAPI } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('randomanime')
    .setDescription('Get a random anime recommendation'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const randomAnime = await AnimeAPI.getRandomAnime();
      
      if (!randomAnime) {
        return await interaction.editReply('❌ Could not find a random anime. Please try again.');
      }
      
      const title = randomAnime.title.english || randomAnime.title.romaji;
      const description = randomAnime.description ? 
        randomAnime.description.replace(/<[^>]*>/g, '').substring(0, 300) + '...' : 
        'No description available';

      const embed = new EmbedBuilder()
        .setColor('#7B61FF')
        .setTitle(`🎲 Random Anime: ${title}`)
        .setDescription(description)
        .addFields(
          { name: '⭐ Score', value: `${randomAnime.averageScore || 'N/A'}/100`, inline: true },
          { name: '📺 Episodes', value: `${randomAnime.episodes || 'Unknown'}`, inline: true },
          { name: '📊 Status', value: randomAnime.status, inline: true },
          { name: '🎭 Genres', value: randomAnime.genres.slice(0, 4).join(', '), inline: false }
        )
        .setTimestamp();

      if (randomAnime.coverImage?.large) {
        embed.setThumbnail(randomAnime.coverImage.large);
      }

      embed.setFooter({ text: 'Use /watch to start watching this anime!' });
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Random anime command error:', error);
      await interaction.editReply('❌ An error occurred while finding a random anime. Please try again later.');
    }
  },
};
