const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const XPSystem = require('../lib/xp');
const { db } = require('../lib/firebase');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      // Get welcome channel from guild settings
      const guildDoc = await db.collection('guilds').doc(member.guild.id).get();
      let welcomeChannelId = null;
      
      if (guildDoc.exists) {
        welcomeChannelId = guildDoc.data().welcomeChannel;
      }
      
      // Default to #welcome or #general if no custom channel set
      if (!welcomeChannelId) {
        const welcomeChannel = member.guild.channels.cache.find(
          channel => channel.name === 'welcome' || channel.name === 'general'
        );
        welcomeChannelId = welcomeChannel?.id;
      }
      
      if (!welcomeChannelId) {
        console.log(`No welcome channel found for guild: ${member.guild.name}`);
        return;
      }
      
      const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
      if (!welcomeChannel) return;

      // Create welcome embed
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#7B61FF')
        .setTitle(`👋 Welcome to KamiAnime, ${member.displayName}!`)
        .setDescription(
          `🎌 **Welcome to the ultimate anime and manga community!**\n\n` +
          `🎮 **What you can do here:**\n` +
          `• Watch anime and read manga with our gamified system\n` +
          `• Earn XP, unlock badges, and climb the leaderboard\n` +
          `• Challenge friends and track your progress\n` +
          `• Get recommendations and discover new series\n\n` +
          `🔗 **Get started by linking your account** to sync your progress between Discord and our website!\n\n` +
          `✨ **Pro tip:** Use \`/help\` to see all available commands!`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage('https://i.imgur.com/anime-welcome-banner.gif') // Replace with actual banner
        .setFooter({ 
          text: `Member #${member.guild.memberCount} • KamiAnime Bot`, 
          iconURL: member.guild.iconURL() 
        })
        .setTimestamp();

      // Create action buttons
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('link_account')
            .setLabel('🔗 Link Account')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('website_home')
            .setLabel('🎬 Start Watching')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('leaderboard_show')
            .setLabel('🏆 Leaderboard')
            .setStyle(ButtonStyle.Secondary)
        );

      // Send welcome message
      await welcomeChannel.send({
        content: `${member}`, // Mention the user
        embeds: [welcomeEmbed],
        components: [actionRow]
      });

      // Auto-assign "Newbie" role if it exists
      const newbieRole = member.guild.roles.cache.find(role => 
        role.name.toLowerCase() === 'newbie' || 
        role.name.toLowerCase() === 'new member'
      );
      
      if (newbieRole) {
        await member.roles.add(newbieRole);
        console.log(`Assigned ${newbieRole.name} role to ${member.displayName}`);
      }

      // Award 50 XP for joining
      await XPSystem.awardXP(member.user.id, 50, 'Joined Server');
      
      // Check for "First Steps" badge
      await XPSystem.checkBadges(member.user.id, { xp: 50, level: 1 });

      console.log(`✅ Welcomed ${member.displayName} to ${member.guild.name}`);
      
    } catch (error) {
      console.error('Error in guildMemberAdd event:', error);
    }
  },
};
