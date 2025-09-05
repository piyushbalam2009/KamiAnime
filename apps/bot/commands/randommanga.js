const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MangaAPI } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('randommanga')
    .setDescription('Get a random manga recommendation'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const randomManga = await MangaAPI.getRandomManga();
      
      if (!randomManga) {
        return await interaction.editReply('❌ Could not find a random manga. Please try again.');
      }
      
      const title = randomManga.attributes.title.en || Object.values(randomManga.attributes.title)[0];
      const description = randomManga.attributes.description?.en ? 
        randomManga.attributes.description.en.substring(0, 300) + '...' : 
        'No description available';

      const embed = new EmbedBuilder()
        .setColor('#00C2FF')
        .setTitle(`🎲 Random Manga: ${title}`)
        .setDescription(description)
        .addFields(
          { name: '📊 Status', value: randomManga.attributes.status, inline: true },
          { name: '📅 Year', value: `${randomManga.attributes.year || 'Unknown'}`, inline: true },
          { name: '🏷️ Tags', value: randomManga.attributes.tags.slice(0, 4).map(tag => tag.attributes.name.en).join(', '), inline: false }
        )
        .setTimestamp();

      embed.setFooter({ text: 'Use /chapter to start reading this manga!' });
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Random manga command error:', error);
      await interaction.editReply('❌ An error occurred while finding a random manga. Please try again later.');
    }
  },
};
