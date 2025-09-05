const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and status'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const timeDiff = sent.createdTimestamp - interaction.createdTimestamp;

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '📡 Bot Latency', value: `${timeDiff}ms`, inline: true },
        { name: '💓 API Latency', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
        { name: '🟢 Status', value: 'Online', inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });
  },
};
