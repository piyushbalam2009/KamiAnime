const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the bot invite link and server invite'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#7B61FF')
      .setTitle('🤖 Invite KamiAnime Bot')
      .setDescription('Bring the ultimate anime experience to your server!')
      .addFields(
        { name: '✨ Features', value: '• Anime & Manga search\n• Streaming integration\n• Gamification system\n• Social challenges\n• Fun commands', inline: true },
        { name: '🎯 Benefits', value: '• Sync with KamiAnime website\n• XP and badge system\n• Leaderboards\n• Watch parties\n• Community building', inline: true }
      )
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setTimestamp();

    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('🤖 Add Bot to Server')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`),
        new ButtonBuilder()
          .setLabel('🌐 Visit KamiAnime')
          .setStyle(ButtonStyle.Link)
          .setURL('https://kamianime.com'),
        new ButtonBuilder()
          .setLabel('💬 Support Server')
          .setStyle(ButtonStyle.Link)
          .setURL('https://discord.gg/kamianime')
      );

    embed.setFooter({ text: 'Thank you for using KamiAnime!' });

    await interaction.reply({ 
      embeds: [embed],
      components: [actionRow]
    });
  },
};
