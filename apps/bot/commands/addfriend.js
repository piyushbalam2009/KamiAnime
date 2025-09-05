const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const XPSystem = require('../lib/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addfriend')
    .setDescription('Add a friend to your network')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to add as friend')
        .setRequired(true)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    
    if (targetUser.id === interaction.user.id) {
      return await interaction.reply({ content: '❌ You cannot add yourself as a friend!', ephemeral: true });
    }

    if (targetUser.bot) {
      return await interaction.reply({ content: '❌ You cannot add bots as friends!', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      const userProfile = await XPSystem.getUserProfile(interaction.user.id);
      const targetProfile = await XPSystem.getUserProfile(targetUser.id);
      
      if (!userProfile) {
        return await interaction.editReply('❌ You need to link your KamiAnime account first! Use `/link`');
      }

      if (!targetProfile) {
        return await interaction.editReply(`❌ ${targetUser.displayName} hasn't linked their KamiAnime account yet.`);
      }

      const friends = userProfile.friends || [];
      
      if (friends.includes(targetUser.id)) {
        return await interaction.editReply(`❌ ${targetUser.displayName} is already your friend!`);
      }

      if (friends.length >= 50) {
        return await interaction.editReply('❌ You have reached the maximum number of friends (50)!');
      }

      // Add friend to user's list
      await XPSystem.addFriend(interaction.user.id, targetUser.id);
      
      // Award XP for social interaction
      await XPSystem.awardXP(interaction.user.id, 10, 'Adding Friend');

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Friend Added!')
        .setDescription(`${targetUser.displayName} has been added to your friends list!`)
        .addFields(
          { name: '🎉 Bonus', value: '+10 XP for being social!', inline: true },
          { name: '👥 Total Friends', value: `${friends.length + 1}`, inline: true }
        )
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      embed.setFooter({ text: 'Use /friends to see your complete friends list!' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Add friend command error:', error);
      await interaction.editReply('❌ An error occurred while adding the friend. Please try again later.');
    }
  },
};
