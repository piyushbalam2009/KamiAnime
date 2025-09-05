const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { syncManager } = require('../lib/sync-manager');
const { APIVerifiedGamification } = require('../lib/gamification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink your Discord account from KamiAnime'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const { db } = require('../lib/firebase');

      // Check if user has a linked account
      const userSnapshot = await db.collection('users')
        .where('discordId', '==', interaction.user.id)
        .limit(1)
        .get();
      
      if (userSnapshot.empty) {
        const embed = new EmbedBuilder()
          .setColor('#FF6161')
          .setTitle('❌ Not Linked')
          .setDescription('Your Discord account is not currently linked to KamiAnime.')
          .addFields({
            name: 'Want to link?',
            value: 'Use `/link` command with a code from the KamiAnime website.'
          });

        return await interaction.editReply({ embeds: [embed] });
      }

      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();
      const websiteUserId = userDoc.id;

      // Create sync event to notify website of unlinking
      await syncManager.createSyncEvent(websiteUserId, 'DISCORD_UNLINK', {
        discordId: interaction.user.id,
        discordUsername: interaction.user.username,
        unlinkedAt: new Date(),
        reason: 'user_requested'
      });

      // Remove Discord ID from user document (keep website data intact)
      await userDoc.ref.update({
        discordId: db.FieldValue.delete(),
        discordUsername: db.FieldValue.delete(),
        discordDiscriminator: db.FieldValue.delete(),
        unlinkedAt: new Date(),
        'preferences.syncWithDiscord': false,
        lastSyncTimestamp: new Date()
      });

      // Clean up Discord-specific gamification data
      await APIVerifiedGamification.cleanupUserData(interaction.user.id);

      // Log the unlinking activity
      await syncManager.logActivity(interaction.user.id, 'DISCORD_ACCOUNT_UNLINKED', {
        websiteUserId: websiteUserId,
        unlinkedAt: new Date(),
        preservedWebsiteData: true
      });

      const embed = new EmbedBuilder()
        .setColor('#FF6161')
        .setTitle('🔗 Account Unlinked')
        .setDescription('Your Discord account has been successfully unlinked from KamiAnime.')
        .addFields(
          {
            name: '✅ What\'s preserved:',
            value: '• Your website account and progress\n• All XP, badges, and achievements\n• Watch history and preferences',
            inline: false
          },
          {
            name: '⚠️ What changes:',
            value: '• Discord commands won\'t show your stats\n• No sync between Discord and website\n• Limited bot functionality',
            inline: false
          },
          {
            name: '🔄 Want to reconnect?',
            value: 'Use `/link` command anytime to restore full functionality!',
            inline: false
          }
        )
        .setFooter({ text: 'Your website data remains safe and intact' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Unlink command error:', error);
      await interaction.editReply('❌ An error occurred while unlinking your account. Please try again later.');
    }
  },
};
