const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const XPSystem = require('../lib/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('accept')
    .setDescription('Accept a challenge')
    .addStringOption(option =>
      option.setName('challenge_id')
        .setDescription('Challenge ID to accept')
        .setRequired(true)),

  async execute(interaction) {
    const challengeId = interaction.options.getString('challenge_id');
    
    await interaction.deferReply();

    try {
      const success = await XPSystem.acceptChallenge(challengeId);
      
      if (success) {
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('✅ Challenge Accepted!')
          .setDescription('You have accepted the challenge! Good luck!')
          .addFields(
            { name: '🎯 What\'s Next?', value: 'Start watching/reading to complete your challenge!', inline: false },
            { name: '📊 Track Progress', value: 'Use `/me` to see your progress', inline: false }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply('❌ Challenge not found or already expired.');
      }

    } catch (error) {
      console.error('Accept command error:', error);
      await interaction.editReply('❌ An error occurred while accepting the challenge. Please try again later.');
    }
  },
};
