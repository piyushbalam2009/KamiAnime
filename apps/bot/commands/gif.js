const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { FunAPI } = require('../lib/enhanced-api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gif')
    .setDescription('Get a random anime GIF')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of GIF')
        .addChoices(
          { name: 'Hug', value: 'hug' },
          { name: 'Kiss', value: 'kiss' },
          { name: 'Pat', value: 'pat' },
          { name: 'Slap', value: 'slap' },
          { name: 'Cry', value: 'cry' },
          { name: 'Dance', value: 'dance' }
        )),

  async execute(interaction) {
    const gifType = interaction.options.getString('type') || 'hug';
    
    await interaction.deferReply();

    try {
      const gif = await FunAPI.getAnimeGif(gifType);
      
      if (!gif || !gif.media_formats?.gif?.url) {
        return await interaction.editReply('❌ Could not fetch anime GIF. Please try again.');
      }

      const embed = new EmbedBuilder()
        .setColor('#FF1493')
        .setTitle(`🎭 ${gifType.charAt(0).toUpperCase() + gifType.slice(1)} GIF`)
        .setImage(gif.media_formats.gif.url)
        .setTimestamp();

      embed.setFooter({ text: 'Enhanced multi-source GIF search • Powered by Tenor API' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('GIF command error:', error);
      await interaction.editReply('❌ An error occurred while fetching anime GIF. Please try again later.');
    }
  },
};
