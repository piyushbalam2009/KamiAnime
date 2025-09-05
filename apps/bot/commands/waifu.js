const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { FunAPI } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('waifu')
    .setDescription('Get a random waifu image')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Waifu category')
        .addChoices(
          { name: 'SFW', value: 'sfw' },
          { name: 'Neko', value: 'neko' },
          { name: 'Shinobu', value: 'shinobu' },
          { name: 'Megumin', value: 'megumin' }
        )),

  async execute(interaction) {
    const category = interaction.options.getString('category') || 'sfw';
    
    await interaction.deferReply();

    try {
      const waifuImage = await FunAPI.getWaifu(category);
      
      if (!waifuImage) {
        return await interaction.editReply('❌ Could not fetch waifu image. Please try again.');
      }

      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle(`💖 Random Waifu - ${category.toUpperCase()}`)
        .setImage(waifuImage.url)
        .setTimestamp();

      embed.setFooter({ text: 'Powered by waifu.pics' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Waifu command error:', error);
      await interaction.editReply('❌ An error occurred while fetching waifu image. Please try again later.');
    }
  },
};
