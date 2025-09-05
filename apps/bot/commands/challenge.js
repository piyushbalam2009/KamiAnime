const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const XPSystem = require('../lib/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('challenge')
    .setDescription('Challenge a friend to watch/read more')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to challenge')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Challenge type')
        .setRequired(true)
        .addChoices(
          { name: 'Episodes', value: 'episodes' },
          { name: 'Chapters', value: 'chapters' }
        ))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount to challenge (1-50)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(50)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const type = interaction.options.getString('type');
    const amount = interaction.options.getInteger('amount');
    
    if (targetUser.id === interaction.user.id) {
      return await interaction.reply({ content: '❌ You cannot challenge yourself!', ephemeral: true });
    }

    if (targetUser.bot) {
      return await interaction.reply({ content: '❌ You cannot challenge bots!', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      // Check if target user has a profile
      const targetProfile = await XPSystem.getUserProfile(targetUser.id);
      if (!targetProfile) {
        return await interaction.editReply(`❌ ${targetUser.displayName} hasn't linked their KamiAnime account yet.`);
      }

      // Create challenge
      const challenge = await XPSystem.createChallenge(
        interaction.user.id,
        targetUser.id,
        type,
        amount
      );

      if (!challenge) {
        return await interaction.editReply('❌ Failed to create challenge. Please try again.');
      }

      const embed = new EmbedBuilder()
        .setColor('#FF6B35')
        .setTitle('⚔️ Challenge Issued!')
        .setDescription(`${interaction.user.displayName} has challenged ${targetUser.displayName}!`)
        .addFields(
          { name: '🎯 Challenge', value: `Watch ${amount} ${type} in 7 days`, inline: true },
          { name: '🏆 Reward', value: `${amount * 10} XP + Badge`, inline: true },
          { name: '⏰ Expires', value: '<t:' + Math.floor(new Date(challenge.expiresAt).getTime() / 1000) + ':R>', inline: true }
        )
        .setTimestamp();

      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`challenge_${challenge.id}_accept`)
            .setLabel('✅ Accept Challenge')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`challenge_${challenge.id}_reject`)
            .setLabel('❌ Decline Challenge')
            .setStyle(ButtonStyle.Danger)
        );

      embed.setFooter({ text: `Challenge ID: ${challenge.id}` });

      await interaction.editReply({ 
        content: `${targetUser}`, // Mention the target user
        embeds: [embed],
        components: [actionRow]
      });

    } catch (error) {
      console.error('Challenge command error:', error);
      await interaction.editReply('❌ An error occurred while creating the challenge. Please try again later.');
    }
  },
};
