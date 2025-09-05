const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { AnimeAPI } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('op')
    .setDescription('Get opening theme info for an anime')
    .addStringOption(option =>
      option.setName('anime')
        .setDescription('Anime title to get opening for')
        .setRequired(true)),

  async execute(interaction) {
    const animeTitle = interaction.options.getString('anime');
    
    await interaction.deferReply();

    try {
      // Search for the anime first
      const searchResults = await AnimeAPI.searchAnime(animeTitle, 1);
      
      if (searchResults.length === 0) {
        return await interaction.editReply(`❌ No anime found with the title "${animeTitle}".`);
      }

      const anime = searchResults[0];
      
      // Mock opening theme data (in real implementation, you'd use an API like Animethemes)
      const openings = [
        { title: "Opening 1", artist: "Various Artists", duration: "1:30" },
        { title: "Opening 2", artist: "Various Artists", duration: "1:29" }
      ];

      const embed = new EmbedBuilder()
        .setColor('#FF6B35')
        .setTitle(`🎵 ${anime.title.romaji || anime.title.english} - Opening Themes`)
        .setDescription('Here are the opening themes for this anime!')
        .setThumbnail(anime.coverImage?.large || anime.coverImage?.medium)
        .setTimestamp();

      openings.forEach((op, index) => {
        embed.addFields({
          name: `🎶 ${op.title}`,
          value: `**Artist:** ${op.artist}\n**Duration:** ${op.duration}`,
          inline: true
        });
      });

      embed.addFields({
        name: '🔗 Listen Online',
        value: '[YouTube](https://youtube.com) • [Spotify](https://spotify.com) • [Apple Music](https://music.apple.com)',
        inline: false
      });

      embed.setFooter({ text: 'Opening themes may vary by season' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('OP command error:', error);
      await interaction.editReply('❌ An error occurred while fetching opening themes. Please try again later.');
    }
  },
};
