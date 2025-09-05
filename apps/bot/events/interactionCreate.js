const { Events, EmbedBuilder } = require('discord.js');
const XPSystem = require('../lib/xp');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        // Award XP for command usage
        await XPSystem.awardXP(interaction.user.id, 5, 'Command Usage');
        
        await command.execute(interaction);
      } catch (error) {
        console.error('Command execution error:', error);
        const errorMessage = 'There was an error while executing this command!';
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
    }

    // Handle button interactions
    if (interaction.isButton()) {
      const customId = interaction.customId;

      try {
        // Help menu interactions
        if (customId === 'help_category') {
          // This will be handled by select menu, not button
          return;
        }

        // Challenge interactions
        if (customId.startsWith('challenge_')) {
          const [, challengeId, action] = customId.split('_');
          
          if (action === 'accept') {
            const success = await XPSystem.acceptChallenge(challengeId);
            if (success) {
              await interaction.reply({ 
                content: '✅ Challenge accepted! Good luck!', 
                ephemeral: true 
              });
            } else {
              await interaction.reply({ 
                content: '❌ Challenge not found or already expired.', 
                ephemeral: true 
              });
            }
          } else if (action === 'reject') {
            await XPSystem.rejectChallenge(challengeId);
            await interaction.reply({ 
              content: '❌ Challenge declined.', 
              ephemeral: true 
            });
          }
          return;
        }

        // Watchlist interactions
        if (customId.startsWith('watchlist_')) {
          const animeId = customId.split('_')[1];
          await interaction.reply({ 
            content: `📚 Added to your watchlist! View it on KamiAnime.com`, 
            ephemeral: true 
          });
          return;
        }

        // Bookmark interactions
        if (customId.startsWith('bookmark_')) {
          const mangaId = customId.split('_')[1];
          await interaction.reply({ 
            content: `🔖 Added to your reading list! View it on KamiAnime.com`, 
            ephemeral: true 
          });
          return;
        }

        // Badge and streak info interactions
        if (customId === 'badges_view') {
          await interaction.reply({ 
            content: 'Use `/badges` to see all your achievements!', 
            ephemeral: true 
          });
          return;
        }

        if (customId === 'streak_info') {
          await interaction.reply({ 
            content: 'Use `/streak` to see detailed streak information!', 
            ephemeral: true 
          });
          return;
        }

      } catch (error) {
        console.error('Button interaction error:', error);
        await interaction.reply({ 
          content: 'An error occurred while processing your request.', 
          ephemeral: true 
        });
      }
    }

    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;

      try {
        if (customId === 'help_category') {
          const category = interaction.values[0];
          
          const helpEmbeds = {
            anime: {
              title: '🎬 Anime Commands',
              description: 'Search and discover anime content',
              fields: [
                { name: '/search', value: 'Search for anime or manga', inline: true },
                { name: '/trending', value: 'View trending anime', inline: true },
                { name: '/season', value: 'Seasonal anime releases', inline: true },
                { name: '/randomanime', value: 'Random anime recommendation', inline: true },
                { name: '/recommend', value: 'Anime by genre', inline: true },
                { name: '/watch', value: 'Get streaming links', inline: true }
              ]
            },
            manga: {
              title: '📚 Manga Commands',
              description: 'Explore manga and reading features',
              fields: [
                { name: '/mangasearch', value: 'Search for manga', inline: true },
                { name: '/randommanga', value: 'Random manga recommendation', inline: true },
                { name: '/chapter', value: 'Get reading links', inline: true }
              ]
            },
            gamification: {
              title: '🎮 Gamification Commands',
              description: 'Track your progress and achievements',
              fields: [
                { name: '/me', value: 'View your profile and stats', inline: true },
                { name: '/leaderboard', value: 'XP leaderboards', inline: true },
                { name: '/streak', value: 'Check your daily streak', inline: true },
                { name: '/badges', value: 'View earned badges', inline: true },
                { name: '/quest', value: 'Daily and weekly quests', inline: true }
              ]
            },
            social: {
              title: '👥 Social Commands',
              description: 'Connect with other users',
              fields: [
                { name: '/profile', value: 'View another user\'s profile', inline: true },
                { name: '/challenge', value: 'Challenge friends', inline: true },
                { name: '/accept', value: 'Accept a challenge', inline: true },
                { name: '/reject', value: 'Decline a challenge', inline: true },
                { name: '/friends', value: 'View friends list', inline: true },
                { name: '/addfriend', value: 'Add a friend', inline: true }
              ]
            },
            utility: {
              title: '🛠️ Utility Commands',
              description: 'Server management and information',
              fields: [
                { name: '/link', value: 'Link KamiAnime account', inline: true },
                { name: '/unlink', value: 'Unlink your account', inline: true },
                { name: '/invite', value: 'Bot and server invites', inline: true },
                { name: '/serverstats', value: 'Server statistics', inline: true },
                { name: '/ping', value: 'Check bot latency', inline: true },
                { name: '/help', value: 'Show this help menu', inline: true }
              ]
            },
            fun: {
              title: '🎉 Fun Commands',
              description: 'Entertainment and random content',
              fields: [
                { name: '/waifu', value: 'Random waifu images', inline: true },
                { name: '/husbando', value: 'Random husbando images', inline: true },
                { name: '/quote', value: 'Anime quotes', inline: true },
                { name: '/op', value: 'Opening theme info', inline: true },
                { name: '/gif', value: 'Anime GIFs', inline: true },
                { name: '/meme', value: 'Anime memes', inline: true }
              ]
            }
          };

          const embedData = helpEmbeds[category];
          if (embedData) {
            const embed = new EmbedBuilder()
              .setColor('#7B61FF')
              .setTitle(embedData.title)
              .setDescription(embedData.description)
              .addFields(embedData.fields)
              .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
          }
        }

      } catch (error) {
        console.error('Select menu interaction error:', error);
        await interaction.reply({ 
          content: 'An error occurred while processing your selection.', 
          ephemeral: true 
        });
      }
    }
  },
};
