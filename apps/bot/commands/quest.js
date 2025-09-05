const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const XPSystem = require('../lib/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('View your daily and weekly quests'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const userProfile = await XPSystem.getUserProfile(interaction.user.id);
      
      if (!userProfile) {
        return await interaction.editReply('❌ Profile not found. Use `/link` to connect your KamiAnime account first!');
      }

      const today = new Date().toDateString();
      const thisWeek = getWeekNumber(new Date());
      
      // Daily quests
      const dailyQuests = [
        {
          id: 'daily_episode',
          name: 'Episode Enthusiast',
          description: 'Watch 1 episode',
          reward: 25,
          progress: userProfile.dailyProgress?.episodes || 0,
          target: 1,
          completed: (userProfile.dailyProgress?.episodes || 0) >= 1
        },
        {
          id: 'daily_chapter',
          name: 'Chapter Champion',
          description: 'Read 2 manga chapters',
          reward: 20,
          progress: userProfile.dailyProgress?.chapters || 0,
          target: 2,
          completed: (userProfile.dailyProgress?.chapters || 0) >= 2
        },
        {
          id: 'daily_commands',
          name: 'Command Master',
          description: 'Use 5 bot commands',
          reward: 15,
          progress: userProfile.dailyProgress?.commands || 0,
          target: 5,
          completed: (userProfile.dailyProgress?.commands || 0) >= 5
        }
      ];

      // Weekly quests
      const weeklyQuests = [
        {
          id: 'weekly_episodes',
          name: 'Binge Watcher',
          description: 'Watch 10 episodes this week',
          reward: 100,
          progress: userProfile.weeklyProgress?.episodes || 0,
          target: 10,
          completed: (userProfile.weeklyProgress?.episodes || 0) >= 10
        },
        {
          id: 'weekly_manga',
          name: 'Manga Marathon',
          description: 'Read 20 chapters this week',
          reward: 80,
          progress: userProfile.weeklyProgress?.chapters || 0,
          target: 20,
          completed: (userProfile.weeklyProgress?.chapters || 0) >= 20
        },
        {
          id: 'weekly_social',
          name: 'Social Butterfly',
          description: 'Complete 3 challenges or make 2 friends',
          reward: 60,
          progress: userProfile.weeklyProgress?.social || 0,
          target: 3,
          completed: (userProfile.weeklyProgress?.social || 0) >= 3
        }
      ];

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`📋 ${interaction.user.displayName}'s Quests`)
        .setDescription('Complete quests to earn bonus XP and unlock achievements!')
        .setTimestamp();

      // Daily quests section
      const dailyText = dailyQuests.map(quest => {
        const status = quest.completed ? '✅' : '⏳';
        const progressBar = '█'.repeat(Math.min(Math.floor((quest.progress / quest.target) * 10), 10)) + 
                           '░'.repeat(Math.max(10 - Math.floor((quest.progress / quest.target) * 10), 0));
        return `${status} **${quest.name}** (+${quest.reward} XP)\n${quest.description}\n${progressBar} ${quest.progress}/${quest.target}`;
      }).join('\n\n');

      embed.addFields({ 
        name: '🌅 Daily Quests (Resets at midnight)', 
        value: dailyText, 
        inline: false 
      });

      // Weekly quests section
      const weeklyText = weeklyQuests.map(quest => {
        const status = quest.completed ? '✅' : '⏳';
        const progressBar = '█'.repeat(Math.min(Math.floor((quest.progress / quest.target) * 10), 10)) + 
                           '░'.repeat(Math.max(10 - Math.floor((quest.progress / quest.target) * 10), 0));
        return `${status} **${quest.name}** (+${quest.reward} XP)\n${quest.description}\n${progressBar} ${quest.progress}/${quest.target}`;
      }).join('\n\n');

      embed.addFields({ 
        name: '📅 Weekly Quests (Resets on Monday)', 
        value: weeklyText, 
        inline: false 
      });

      // Quest completion stats
      const dailyCompleted = dailyQuests.filter(q => q.completed).length;
      const weeklyCompleted = weeklyQuests.filter(q => q.completed).length;
      
      embed.addFields({ 
        name: '📊 Quest Progress', 
        value: `Daily: ${dailyCompleted}/${dailyQuests.length} | Weekly: ${weeklyCompleted}/${weeklyQuests.length}`, 
        inline: false 
      });

      embed.setFooter({ text: 'Complete all quests for bonus rewards!' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Quest command error:', error);
      await interaction.editReply('❌ An error occurred while fetching your quests. Please try again later.');
    }
  },
};

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
