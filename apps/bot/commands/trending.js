const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { EnhancedAnimeAPI, EnhancedMangaAPI } = require('../lib/enhanced-api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trending')
    .setDescription('Show trending anime or manga')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Content type')
        .setRequired(false)
        .addChoices(
          { name: 'Anime', value: 'anime' },
          { name: 'Manga', value: 'manga' }
        )),

  async execute(interaction) {
    const type = interaction.options.getString('type') || 'anime';
    
    await interaction.deferReply();

    try {
      let results;
      if (type === 'anime' || !type) {
        results = await EnhancedAnimeAPI.getTrendingAnime(10);
      } else {
        results = await EnhancedMangaAPI.searchManga('popular', 10);
      }

      const embed = new EmbedBuilder();

      results.forEach((item, index) => {
        const title = item.title.english || item.title.romaji;
        const description = item.description 
          ? item.description.replace(/<[^>]*>/g, '').substring(0, 100) + '...'
          : 'No description available';

        let fieldValue = `${description}\n\n**Status:** ${item.status}`;
        
        if (type === 'anime') {
          if (item.averageScore) {
            fieldValue += `\n**Score:** ${(item.averageScore / 10).toFixed(1)}/10`;
          }
          if (item.nextAiringEpisode) {
            const hours = Math.floor(item.nextAiringEpisode.timeUntilAiring / 3600);
            const days = Math.floor(hours / 24);
            const timeText = days > 0 ? `${days} day${days > 1 ? 's' : ''}` : `${hours} hour${hours > 1 ? 's' : ''}`;
            fieldValue += `\n**Next Episode:** ${item.nextAiringEpisode.episode} in ${timeText}`;
          }
        }

        embed.fields.push({
          name: `${index + 1}. ${title}`,
          value: fieldValue,
          inline: false
        });
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Trending command error:', error);
      await interaction.editReply('An error occurred while fetching trending content. Please try again later.');
    }
  }
};

function getCoverArtUrl(manga) {
  const coverArt = manga.relationships?.find(rel => rel.type === 'cover_art');
  if (coverArt?.attributes?.fileName) {
    return `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.256.jpg`;
  }
  return 'https://via.placeholder.com/256x384?text=No+Cover';
}
