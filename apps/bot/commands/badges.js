const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const XPSystem = require('../lib/xp');
const { badges } = require('../../data/badges');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('badges')
    .setDescription('Show badges you\'ve earned and locked ones'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const userProfile = await XPSystem.getUserProfile(interaction.user.id);
      
      if (!userProfile) {
        return await interaction.editReply('❌ Profile not found. Use `/link` to connect your KamiAnime account first!');
      }

      const userBadges = userProfile.badges || [];
      const earnedBadges = badges.filter(badge => userBadges.includes(badge.id));
      const lockedBadges = badges.filter(badge => !userBadges.includes(badge.id));

      const embed = new EmbedBuilder()
        .setColor('#7B61FF')
        .setTitle(`🏅 ${interaction.user.displayName}'s Badges`)
        .setDescription(`You have earned ${earnedBadges.length} out of ${badges.length} badges!`)
        .setTimestamp();

      // Show earned badges
      if (earnedBadges.length > 0) {
        const earnedText = earnedBadges.slice(0, 10).map(badge => 
          `${badge.icon} **${badge.name}** - ${badge.description}`
        ).join('\n');
        
        embed.addFields({ 
          name: '✅ Earned Badges', 
          value: earnedText + (earnedBadges.length > 10 ? `\n... and ${earnedBadges.length - 10} more!` : ''), 
          inline: false 
        });
      }

      // Show next badges to unlock
      const nextBadges = lockedBadges.slice(0, 5).map(badge => {
        let progress = '';
        const condition = badge.condition;
        
        switch (condition.type) {
          case 'xp':
            progress = `(${userProfile.xp || 0}/${condition.value} XP)`;
            break;
          case 'level':
            progress = `(Level ${userProfile.level || 1}/${condition.value})`;
            break;
          case 'episodes':
            progress = `(${userProfile.watchedEpisodes || 0}/${condition.value} episodes)`;
            break;
          case 'chapters':
            progress = `(${userProfile.readChapters || 0}/${condition.value} chapters)`;
            break;
          case 'streak':
            progress = `(${userProfile.streak || 0}/${condition.value} days)`;
            break;
        }
        
        return `🔒 **${badge.name}** - ${badge.description} ${progress}`;
      }).join('\n');

      if (nextBadges) {
        embed.addFields({ 
          name: '🎯 Next Badges to Unlock', 
          value: nextBadges, 
          inline: false 
        });
      }

      // Progress bar
      const progress = Math.round((earnedBadges.length / badges.length) * 100);
      const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
      
      embed.addFields({ 
        name: '📊 Badge Progress', 
        value: `${progressBar} ${progress}%`, 
        inline: false 
      });

      embed.setFooter({ text: 'Keep playing to unlock more badges!' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Badges command error:', error);
      await interaction.editReply('❌ An error occurred while fetching your badges. Please try again later.');
    }
  },
};
