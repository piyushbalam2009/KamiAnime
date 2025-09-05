const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { APIVerifiedGamification } = require('../lib/gamification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('me')
    .setDescription('View your KamiAnime profile and stats'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      // Get user profile from gamification system
      const userProfile = await APIVerifiedGamification.getUserProfile(interaction.user.id);

      if (!userProfile) {
        const embed = new EmbedBuilder()
          .setColor('#FF6161')
          .setTitle('🔗 Account Not Found')
          .setDescription('Your Discord account is not linked to KamiAnime yet!')
          .addFields({
            name: 'How to get started:',
            value: '1. Visit [KamiAnime](https://kamianime.com)\n2. Sign in to your account\n3. Use the `/link` command to connect your Discord\n4. Start watching anime and reading manga to earn XP!'
          })
          .setFooter({ text: 'Link your account to track your progress!' });

        return await interaction.editReply({ embeds: [embed] });
      }

      // Get user badges
      const userBadges = await APIVerifiedGamification.getUserBadges(interaction.user.id);
      const badgeNames = userBadges.slice(0, 5).map(badge => badge.name);

      // Calculate level progress
      const currentLevelXP = APIVerifiedGamification.calculateLevelXP(userProfile.level - 1);
      const nextLevelXP = APIVerifiedGamification.calculateLevelXP(userProfile.level);
      const progressXP = userProfile.xp - currentLevelXP;
      const requiredXP = nextLevelXP - currentLevelXP;
      const xpProgress = Math.round((progressXP / requiredXP) * 100);

      const embed = new EmbedBuilder()
        .setColor('#7B61FF')
        .setTitle(`${interaction.user.displayName}'s Profile`)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🏆 Level', value: `${userProfile.level}`, inline: true },
          { name: '⭐ XP', value: `${userProfile.xp.toLocaleString()}`, inline: true },
          { name: '🔥 Streak', value: `${userProfile.streak || 0} days`, inline: true },
          { name: '🏅 Badges', value: `${userBadges.length}/30+`, inline: true },
          { name: '📺 Episodes Watched', value: `${userProfile.watchedEpisodes || 0}`, inline: true },
          { name: '📖 Chapters Read', value: `${userProfile.readChapters || 0}`, inline: true },
          { name: '📈 Progress to Next Level', value: `${progressXP}/${requiredXP} XP (${xpProgress}%)`, inline: false }
        )
        .setTimestamp();

      // Add recent badges if any
      if (badgeNames.length > 0) {
        embed.addFields({ 
          name: '🎖️ Recent Badges', 
          value: badgeNames.join(', ') + (userBadges.length > 5 ? ` +${userBadges.length - 5} more` : ''), 
          inline: false 
        });
      }

      // Add premium status if applicable
      if (userProfile.isPremium) {
        embed.addFields({ name: '👑 Status', value: '✨ Premium Member', inline: true });
      }

      // Add quest progress if any active quests
      const activeQuests = await APIVerifiedGamification.getActiveQuests(interaction.user.id);
      if (activeQuests.length > 0) {
        const questProgress = activeQuests.slice(0, 2).map(quest => 
          `${quest.name}: ${quest.progress}/${quest.target}`
        ).join('\n');
        embed.addFields({ 
          name: '🎯 Active Quests', 
          value: questProgress, 
          inline: false 
        });
      }

      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('badges_view')
            .setLabel('🏅 View All Badges')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('quests_view')
            .setLabel('🎯 View Quests')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setLabel('🌐 View on Website')
            .setStyle(ButtonStyle.Link)
            .setURL('https://kamianime.com/profile')
        );

      embed.setFooter({ text: 'API-verified stats • Synced with KamiAnime account' });

      await interaction.editReply({ 
        embeds: [embed],
        components: [actionRow]
      });

    } catch (error) {
      console.error('Me command error:', error);
      await interaction.editReply('❌ An error occurred while fetching your profile. Please try again later.');
    }
  },
};
