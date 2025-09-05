const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const XPSystem = require('../lib/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('streak')
    .setDescription('Check your current streak and bonus'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const userProfile = await XPSystem.getUserProfile(interaction.user.id);
      
      if (!userProfile) {
        return await interaction.editReply('❌ Profile not found. Use `/link` to connect your KamiAnime account first!');
      }

      const streak = userProfile.streak || 0;
      const streakBonus = Math.min(streak * 2, 50); // Max 50 bonus XP
      const nextMilestone = [7, 30, 100, 365].find(milestone => milestone > streak) || 1000;

      const embed = new EmbedBuilder()
        .setColor('#FF6B35')
        .setTitle(`🔥 ${interaction.user.displayName}'s Streak`)
        .setDescription(streak > 0 ? 
          `You're on fire! Keep up the daily activity to maintain your streak!` :
          `Start your streak by being active daily on KamiAnime!`)
        .addFields(
          { name: '🔥 Current Streak', value: `${streak} days`, inline: true },
          { name: '⚡ Streak Bonus', value: `+${streakBonus} XP per activity`, inline: true },
          { name: '🎯 Next Milestone', value: `${nextMilestone} days`, inline: true }
        )
        .setTimestamp();

      // Add streak tier information
      let streakTier = 'Beginner';
      let streakEmoji = '🌱';
      
      if (streak >= 365) {
        streakTier = 'Legend';
        streakEmoji = '👑';
      } else if (streak >= 100) {
        streakTier = 'Master';
        streakEmoji = '🏆';
      } else if (streak >= 30) {
        streakTier = 'Expert';
        streakEmoji = '⭐';
      } else if (streak >= 7) {
        streakTier = 'Dedicated';
        streakEmoji = '💪';
      }

      embed.addFields({ 
        name: `${streakEmoji} Streak Tier`, 
        value: streakTier, 
        inline: true 
      });

      // Streak tips
      const tips = [
        "💡 Watch an episode or read a chapter daily to maintain your streak!",
        "💡 Use Discord commands daily to keep your streak alive!",
        "💡 Higher streaks give more XP bonus for all activities!",
        "💡 Premium members get 2x streak bonuses!"
      ];

      embed.addFields({ 
        name: '💡 Streak Tips', 
        value: tips[Math.floor(Math.random() * tips.length)], 
        inline: false 
      });

      embed.setFooter({ text: 'Stay active daily to build your streak!' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Streak command error:', error);
      await interaction.editReply('❌ An error occurred while checking your streak. Please try again later.');
    }
  },
};
