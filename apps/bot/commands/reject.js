const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../lib/firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reject')
    .setDescription('Reject a challenge')
    .addStringOption(option =>
      option.setName('challenge_id')
        .setDescription('Challenge ID to reject')
        .setRequired(true)),

  async execute(interaction) {
    const challengeId = interaction.options.getString('challenge_id');
    
    await interaction.deferReply();

    try {
      // Update challenge status to rejected
      await db.collection('challenges').doc(challengeId).update({
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Challenge Rejected')
        .setDescription('You have declined the challenge.')
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Reject command error:', error);
      await interaction.editReply('❌ An error occurred while rejecting the challenge. Please try again later.');
    }
  },
};
