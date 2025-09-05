const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MangaAPI } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mangasearch')
    .setDescription('Search for manga by title')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Manga title to search for')
        .setRequired(true)),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    
    await interaction.deferReply();

    try {
      const results = await MangaAPI.searchManga(title, 5);
      
      if (results.length === 0) {
        return await interaction.editReply(`❌ No manga found with the title "${title}".`);
      }

      const embed = new EmbedBuilder()
        .setColor('#00C2FF')
        .setTitle(`📚 Manga Search Results for "${title}"`)
        .setTimestamp();

      results.slice(0, 3).forEach((manga, index) => {
        const mangaTitle = manga.attributes.title.en || Object.values(manga.attributes.title)[0];
        const description = manga.attributes.description?.en ? 
          manga.attributes.description.en.substring(0, 100) + '...' : 
          'No description available';
        
        embed.addFields({
          name: `${index + 1}. ${mangaTitle}`,
          value: `**Status:** ${manga.attributes.status}\n**Year:** ${manga.attributes.year || 'Unknown'}\n**Tags:** ${manga.attributes.tags.slice(0, 3).map(tag => tag.attributes.name.en).join(', ')}\n${description}`,
          inline: false
        });
      });

      embed.setFooter({ text: 'Use /chapter <manga> <number> to start reading!' });
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Manga search command error:', error);
      await interaction.editReply('❌ An error occurred while searching for manga. Please try again later.');
    }
  },
};
