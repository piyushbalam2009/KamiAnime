const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help with bot commands and features'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#7B61FF')
      .setTitle('🤖 KamiAnime Bot Help')
      .setDescription('Welcome to KamiAnime! Select a category below to see available commands.')
      .addFields(
        { name: '🎌 About KamiAnime', value: 'The ultimate anime streaming and manga reading platform with Discord integration!', inline: false },
        { name: '🔗 Getting Started', value: 'Use `/link` to connect your KamiAnime account and start earning XP!', inline: false }
      )
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Choose a command category')
      .addOptions([
        {
          label: '🎬 Anime Commands',
          description: 'Search, trending, seasonal anime',
          value: 'anime'
        },
        {
          label: '📚 Manga Commands', 
          description: 'Manga search, reading, chapters',
          value: 'manga'
        },
        {
          label: '🎮 Gamification',
          description: 'XP, levels, badges, streaks',
          value: 'gamification'
        },
        {
          label: '👥 Social Features',
          description: 'Friends, challenges, profiles',
          value: 'social'
        },
        {
          label: '🛠️ Utility Commands',
          description: 'Server stats, ping, invite',
          value: 'utility'
        },
        {
          label: '🎉 Fun Commands',
          description: 'Waifu, quotes, memes, gifs',
          value: 'fun'
        }
      ]);

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    embed.setFooter({ text: 'Use the dropdown menu to explore commands!' });

    await interaction.reply({ 
      embeds: [embed],
      components: [actionRow]
    });
  },
};
