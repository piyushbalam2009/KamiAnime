const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { syncManager } = require('../lib/sync-manager');
const { UserProfile } = require('../lib/sync-models');
const { APIVerifiedGamification } = require('../lib/gamification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Discord account to your KamiAnime website account')
    .addStringOption(option =>
      option.setName('code')
        .setDescription('Linking code from KamiAnime website')
        .setRequired(true)),

  async execute(interaction) {
    const code = interaction.options.getString('code');
    
    await interaction.deferReply({ ephemeral: true });

    try {
      const { db } = require('../lib/firebase');

      // Find the linking code in the database
      const linkingSnapshot = await db.collection('linkingCodes')
        .where('code', '==', code)
        .where('used', '==', false)
        .limit(1)
        .get();

      if (linkingSnapshot.empty) {
        const embed = new EmbedBuilder()
          .setColor('#FF6161')
          .setTitle('🔗 Account Linking Failed')
          .setDescription('The linking code you provided is either invalid or has already been used.')
          .addFields({
            name: 'How to get a new code:',
            value: '1. Visit [KamiAnime](https://kamianime.com)\n2. Sign in to your account\n3. Go to Settings > Discord Integration\n4. Generate a new linking code'
          });

        return await interaction.editReply({ embeds: [embed] });
      }

      const linkingDoc = linkingSnapshot.docs[0];
      const linkingData = linkingDoc.data();

      // Check if code is expired (valid for 10 minutes)
      const codeAge = Date.now() - linkingData.createdAt.toMillis();
      if (codeAge > 10 * 60 * 1000) {
        const embed = new EmbedBuilder()
          .setColor('#FF6161')
          .setTitle('⏰ Code Expired')
          .setDescription('Linking codes expire after 10 minutes for security reasons.')
          .addFields({
            name: 'Generate a new code:',
            value: '1. Visit [KamiAnime](https://kamianime.com)\n2. Go to Settings > Discord Integration\n3. Generate a new linking code'
          });

        return await interaction.editReply({ embeds: [embed] });
      }

      // Check if Discord account is already linked
      const existingUserSnapshot = await db.collection('users')
        .where('discordId', '==', interaction.user.id)
        .limit(1)
        .get();

      if (!existingUserSnapshot.empty) {
        const embed = new EmbedBuilder()
          .setColor('#FF6161')
          .setTitle('🔗 Already Linked')
          .setDescription('This Discord account is already connected to a KamiAnime account.')
          .addFields({
            name: 'Need to unlink?',
            value: 'Use `/unlink` command or visit your KamiAnime settings to manage your Discord connection.'
          });

        return await interaction.editReply({ embeds: [embed] });
      }

      // Update user with Discord ID and sync preferences
      await db.collection('users').doc(linkingData.userId).update({
        discordId: interaction.user.id,
        discordUsername: interaction.user.username,
        discordDiscriminator: interaction.user.discriminator || '0',
        linkedAt: new Date(),
        lastSyncTimestamp: new Date(),
        syncVersion: 1,
        'preferences.syncWithDiscord': true
      });

      // Mark linking code as used
      await linkingDoc.ref.update({ used: true, usedAt: new Date() });

      // Get user data for confirmation
      const userDoc = await db.collection('users').doc(linkingData.userId).get();
      const userData = userDoc.data();

      // Initialize user profile in gamification system
      await APIVerifiedGamification.initializeUser(interaction.user.id, {
        websiteUserId: linkingData.userId,
        username: userData.displayName || userData.username,
        email: userData.email,
        existingXP: userData.xp || 0,
        existingLevel: userData.level || 1,
        existingStreak: userData.streak || 0
      });

      const embed = new EmbedBuilder()
        .setColor('#7B61FF')
        .setTitle('🎉 Account Linked Successfully!')
        .setDescription(`Your Discord account has been linked to **${userData.displayName || userData.username}**'s KamiAnime profile.`)
        .addFields(
          {
            name: '⭐ Your Stats',
            value: `**Level ${userData.level || 1}** • ${(userData.xp || 0).toLocaleString()} XP`,
            inline: true
          },
          {
            name: '🔥 Streak',
            value: `${userData.streak || 0} day${(userData.streak || 0) !== 1 ? 's' : ''}`,
            inline: true
          },
          {
            name: '🏆 Badges',
            value: `${(userData.badges || []).length} earned`,
            inline: true
          },
          {
            name: '🔄 Sync Enabled',
            value: 'Your progress will now sync between Discord and the website!',
            inline: false
          },
          {
            name: '🎮 Available Commands',
            value: '• `/me` - View your profile\n• `/leaderboard` - See rankings\n• `/search` - Find anime/manga\n• `/watch` - Get streaming links\n• `/chapter` - Read manga chapters',
            inline: false
          }
        )
        .setFooter({ text: 'Welcome to the KamiAnime Discord community!' })
        .setTimestamp();

      if (userData.photoURL) {
        embed.setThumbnail(userData.photoURL);
      }

      await interaction.editReply({ embeds: [embed] });

      // Award linking badge and XP through gamification system
      const badgeResult = await APIVerifiedGamification.awardXP(
        interaction.user.id,
        'ACCOUNT_LINK',
        { linkingCode: code },
        {
          websiteUserId: linkingData.userId,
          linkingTimestamp: new Date()
        }
      );

      // Create sync event to notify website of successful linking
      await syncManager.createSyncEvent(linkingData.userId, 'DISCORD_LINK_SUCCESS', {
        discordId: interaction.user.id,
        discordUsername: interaction.user.username,
        linkedAt: new Date(),
        xpAwarded: badgeResult.xpAwarded || 0
      });

      // Send follow-up message about rewards
      if (badgeResult.success) {
        setTimeout(async () => {
          try {
            let rewardText = `🎖️ **Account Linked!** +${badgeResult.xpAwarded} XP earned!`;
            if (badgeResult.levelUp) {
              rewardText += ` 🎉 Level up! Now level ${badgeResult.newLevel}!`;
            }
            if (badgeResult.badgesUnlocked && badgeResult.badgesUnlocked.length > 0) {
              rewardText += `\n🏆 **New Badge${badgeResult.badgesUnlocked.length > 1 ? 's' : ''}:** ${badgeResult.badgesUnlocked.map(b => b.name).join(', ')}`;
            }

            await interaction.followUp({
              content: rewardText,
              ephemeral: true
            });
          } catch (error) {
            console.error('Error sending linking reward notification:', error);
          }
        }, 2000);
      }

      // Log the linking activity
      await syncManager.logActivity(interaction.user.id, 'DISCORD_ACCOUNT_LINKED', {
        websiteUserId: linkingData.userId,
        linkingCode: code,
        xpAwarded: badgeResult.xpAwarded || 0
      });

    } catch (error) {
      console.error('Link command error:', error);
      await interaction.editReply('❌ An error occurred while linking your account. Please try again later.');
    }
  }
};
