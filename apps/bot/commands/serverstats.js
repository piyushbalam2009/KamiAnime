const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverstats')
    .setDescription('Show server statistics and information'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const guild = interaction.guild;
      
      if (!guild) {
        return await interaction.editReply('❌ This command can only be used in a server.');
      }

      const totalMembers = guild.memberCount;
      const onlineMembers = guild.members.cache.filter(member => member.presence?.status !== 'offline').size;
      const botCount = guild.members.cache.filter(member => member.user.bot).size;
      const humanCount = totalMembers - botCount;
      
      const textChannels = guild.channels.cache.filter(channel => channel.type === 0).size;
      const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2).size;
      const categories = guild.channels.cache.filter(channel => channel.type === 4).size;
      
      const roles = guild.roles.cache.size;
      const emojis = guild.emojis.cache.size;
      const boostLevel = guild.premiumTier;
      const boostCount = guild.premiumSubscriptionCount;

      const embed = new EmbedBuilder()
        .setColor('#7B61FF')
        .setTitle(`📊 ${guild.name} Server Stats`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { name: '👥 Members', value: `**Total:** ${totalMembers}\n**Humans:** ${humanCount}\n**Bots:** ${botCount}\n**Online:** ${onlineMembers}`, inline: true },
          { name: '📝 Channels', value: `**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Categories:** ${categories}`, inline: true },
          { name: '🎭 Server Info', value: `**Roles:** ${roles}\n**Emojis:** ${emojis}\n**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
          { name: '💎 Boost Status', value: `**Level:** ${boostLevel}\n**Boosts:** ${boostCount}`, inline: true },
          { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: '🔒 Verification', value: guild.verificationLevel, inline: true }
        )
        .setTimestamp();

      if (guild.description) {
        embed.setDescription(guild.description);
      }

      embed.setFooter({ text: `Server ID: ${guild.id}` });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Server stats command error:', error);
      await interaction.editReply('❌ An error occurred while fetching server statistics. Please try again later.');
    }
  },
};
