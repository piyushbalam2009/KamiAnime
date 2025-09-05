const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const XPSystem = require('../lib/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('friends')
    .setDescription('View your friends list'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const userProfile = await XPSystem.getUserProfile(interaction.user.id);
      
      if (!userProfile) {
        return await interaction.editReply('❌ Profile not found. Use `/link` to connect your KamiAnime account first!');
      }

      const friends = userProfile.friends || [];
      
      if (friends.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#7B61FF')
          .setTitle('👥 Your Friends')
          .setDescription('You haven\'t added any friends yet! Use `/addfriend @user` to start building your network.')
          .addFields(
            { name: '💡 Why Add Friends?', value: '• Compare stats and progress\n• Send challenges\n• Share recommendations\n• Earn social badges', inline: false }
          )
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor('#7B61FF')
        .setTitle(`👥 ${interaction.user.displayName}'s Friends`)
        .setDescription(`You have ${friends.length} friend${friends.length === 1 ? '' : 's'}`)
        .setTimestamp();

      // Show friends with their stats
      const friendsList = await Promise.all(
        friends.slice(0, 10).map(async (friendId) => {
          try {
            const friend = await interaction.client.users.fetch(friendId);
            const friendProfile = await XPSystem.getUserProfile(friendId);
            
            if (friendProfile) {
              return `**${friend.displayName}** - Level ${friendProfile.level || 1} (${(friendProfile.xp || 0).toLocaleString()} XP)`;
            }
            return `**${friend.displayName}** - Not linked`;
          } catch (error) {
            return `**Unknown User** - Profile unavailable`;
          }
        })
      );

      embed.addFields({ 
        name: '👥 Friends List', 
        value: friendsList.join('\n') + (friends.length > 10 ? `\n... and ${friends.length - 10} more!` : ''), 
        inline: false 
      });

      embed.setFooter({ text: 'Use /addfriend to add more friends!' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Friends command error:', error);
      await interaction.editReply('❌ An error occurred while fetching your friends list. Please try again later.');
    }
  },
};
