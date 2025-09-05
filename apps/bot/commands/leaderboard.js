const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { APIVerifiedGamification } = require('../lib/gamification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the KamiAnime leaderboard')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of leaderboard to view')
        .setRequired(false)
        .addChoices(
          { name: 'Global', value: 'global' },
          { name: 'Weekly', value: 'weekly' },
          { name: 'Server', value: 'server' }
        )),

  async execute(interaction) {
    const type = interaction.options.getString('type') || 'global';
    
    await interaction.deferReply();

    try {
      let leaderboardData;
      let title = '🏆 Global Leaderboard';
      let description = 'Top 10 users by verified XP';
      
      // Get leaderboard data based on type
      if (type === 'weekly') {
        title = '📅 Weekly Leaderboard';
        description = 'Top 10 users by XP earned this week';
        leaderboardData = await APIVerifiedGamification.getWeeklyLeaderboard(10);
      } else if (type === 'server') {
        title = `🏠 ${interaction.guild.name} Leaderboard`;
        description = 'Top 10 users from this server';
        leaderboardData = await APIVerifiedGamification.getServerLeaderboard(interaction.guild.id, 10);
      } else {
        leaderboardData = await APIVerifiedGamification.getGlobalLeaderboard(10);
      }

      if (!leaderboardData || leaderboardData.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#FF6161')
          .setTitle('📊 No Data Available')
          .setDescription('No users found in the leaderboard yet.')
          .addFields({
            name: 'Get started:',
            value: 'Start watching anime and reading manga to appear on the leaderboard!'
          });

        return await interaction.editReply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor('#7B61FF')
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: 'API-verified XP • Updated in real-time' });

      // Add leaderboard entries
      leaderboardData.forEach((user, index) => {
        const position = index + 1;
        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
        const premium = user.isPremium ? '👑' : '';
        const streak = user.streak > 0 ? `🔥${user.streak}` : '';
        
        let xpDisplay = user.xp.toLocaleString();
        if (type === 'weekly' && user.weeklyXP !== undefined) {
          xpDisplay = `${user.weeklyXP.toLocaleString()} XP this week`;
        } else {
          xpDisplay = `${user.xp.toLocaleString()} XP total`;
        }
        
        embed.addFields({
          name: `${medal} ${user.displayName || user.username || 'Unknown User'} ${premium}`,
          value: `**Level ${user.level}** • ${xpDisplay} ${streak}`,
          inline: false
        });
      });

      // Find user's position if they're not in top 10
      const userPosition = await APIVerifiedGamification.getUserLeaderboardPosition(interaction.user.id, type);
      if (userPosition && userPosition > 10) {
        embed.addFields({
          name: '📍 Your Position',
          value: `You are ranked #${userPosition}`,
          inline: false
        });
      }

      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('leaderboard_global')
            .setLabel('🌍 Global')
            .setStyle(type === 'global' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('leaderboard_weekly')
            .setLabel('📅 Weekly')
            .setStyle(type === 'weekly' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('leaderboard_server')
            .setLabel('🏠 Server')
            .setStyle(type === 'server' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );

      await interaction.editReply({ 
        embeds: [embed],
        components: [actionRow]
      });

    } catch (error) {
      console.error('Leaderboard command error:', error);
      await interaction.editReply('❌ An error occurred while fetching the leaderboard. Please try again later.');
    }
  }
};
