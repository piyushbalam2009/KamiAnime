const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { FunAPI } = require('../lib/api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('husbando')
    .setDescription('Get a random husbando image'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const husbandoImage = await FunAPI.getHusbando();
      
      if (!husbandoImage) {
        return await interaction.editReply('❌ Could not fetch husbando image. Please try again.');
      }

      const embed = new EmbedBuilder()
        .setColor('#4169E1')
        .setTitle('💙 Random Husbando')
        .setImage(husbandoImage.url)
        .setTimestamp();

      embed.setFooter({ text: 'Powered by waifu.pics' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Husbando command error:', error);
      await interaction.editReply('❌ An error occurred while fetching husbando image. Please try again later.');
    }
  },
};
