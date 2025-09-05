const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const XPSystem = require('../lib/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View another user\'s profile')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view profile of')
        .setRequired(true)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    
    await interaction.deferReply();

    try {
      const userProfile = await XPSystem.getUserProfile(targetUser.id);
      
      if (!userProfile) {
        return await interaction.editReply(`❌ ${targetUser.displayName} hasn't linked their KamiAnime account yet.`);
      }

      const level = userProfile.level || 1;
      const xp = userProfile.xp || 0;
      const userBadges = userProfile.badges || [];

      const embed = new EmbedBuilder()
        .setColor('#7B61FF')
        .setTitle(`${targetUser.displayName}'s Profile`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🏆 Level', value: `${level}`, inline: true },
          { name: '⭐ XP', value: `${xp.toLocaleString()}`, inline: true },
          { name: '🔥 Streak', value: `${userProfile.streak || 0} days`, inline: true },
          { name: '🏅 Badges', value: `${userBadges.length}`, inline: true },
          { name: '📺 Episodes Watched', value: `${userProfile.watchedEpisodes || 0}`, inline: true },
          { name: '📖 Chapters Read', value: `${userProfile.readChapters || 0}`, inline: true }
        )
        .setTimestamp();

      if (userProfile.isPremium) {
        embed.addFields({ name: '👑 Status', value: '✨ Premium Member', inline: true });
      }

      embed.setFooter({ text: 'KamiAnime Profile' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Profile command error:', error);
      await interaction.editReply('❌ An error occurred while fetching the profile. Please try again later.');
    }
  },
};
