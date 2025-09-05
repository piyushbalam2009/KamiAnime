const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { EnhancedAnimeAPI } = require('../lib/enhanced-api');
const { APIVerifiedGamification } = require('../lib/gamification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('watchparty')
    .setDescription('Create or join anime watch parties')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Action to perform')
        .setRequired(true)
        .addChoices(
          { name: 'Create Party', value: 'create' },
          { name: 'Join Party', value: 'join' },
          { name: 'List Parties', value: 'list' },
          { name: 'Start Watching', value: 'start' }
        ))
    .addStringOption(option =>
      option.setName('anime')
        .setDescription('Anime name (required for create)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('party_id')
        .setDescription('Party ID to join or start')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('episode')
        .setDescription('Episode number to watch (for start action)')
        .setRequired(false)),

  async execute(interaction) {
    const action = interaction.options.getString('action');
    const anime = interaction.options.getString('anime');
    const partyId = interaction.options.getString('party_id');
    const episode = interaction.options.getInteger('episode') || 1;
    
    await interaction.deferReply();

    try {
      switch (action) {
        case 'create':
          if (!anime) {
            await interaction.editReply('Please provide an anime name to create a watch party!');
            return;
          }
          await createWatchParty(interaction, anime);
          break;
          
        case 'join':
          if (!partyId) {
            await listJoinableParties(interaction);
          } else {
            await joinWatchParty(interaction, partyId);
          }
          break;
          
        case 'list':
          await listWatchParties(interaction);
          break;
          
        case 'start':
          if (!partyId) {
            await interaction.editReply('Please provide a party ID to start watching!');
            return;
          }
          await startWatchParty(interaction, partyId, episode);
          break;
          
        default:
          await interaction.editReply('Invalid action! Use create, join, list, or start.');
      }
    } catch (error) {
      console.error('Watch party command error:', error);
      await interaction.editReply('An error occurred while managing watch parties. Please try again later.');
    }
  }
};

async function createWatchParty(interaction, animeName) {
  try {
    // Search for anime to verify it exists
    const searchResults = await EnhancedAnimeAPI.searchAnime(animeName, 1);
    
    if (searchResults.length === 0) {
      return await interaction.editReply(`❌ No anime found with the name "${animeName}". Please check the spelling and try again.`);
    }

    const anime = searchResults[0];
    const title = anime.title?.english || anime.title?.romaji || 'Unknown Title';
    const partyId = `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store in Firebase (assuming firebase is available globally or imported)
    const { db } = require('../lib/firebase');
    
    const watchParty = {
      id: partyId,
      anime: {
        id: anime.id,
        title: title,
        coverImage: anime.coverImage?.large,
        episodes: anime.episodes
      },
      host: {
        discordId: interaction.user.id,
        username: interaction.user.username
      },
      participants: [{
        discordId: interaction.user.id,
        username: interaction.user.username,
        joinedAt: new Date()
      }],
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      createdAt: new Date(),
      status: 'waiting',
      maxParticipants: 10,
      currentEpisode: 1,
      watchedEpisodes: []
    };

    await db.collection('watchParties').doc(partyId).set(watchParty);

    const embed = new EmbedBuilder()
      .setColor('#7B61FF')
      .setTitle('🎬 Watch Party Created!')
      .setDescription(`**${title}** watch party is ready!`)
      .addFields(
        { name: '🎯 Host', value: interaction.user.username, inline: true },
        { name: '👥 Participants', value: `1/${watchParty.maxParticipants}`, inline: true },
        { name: '📺 Episodes', value: `${anime.episodes || 'Unknown'}`, inline: true },
        { name: '🔗 Join Code', value: `\`${partyId}\``, inline: false },
        { name: 'How to join:', value: 'Use `/watchparty join party_id:${partyId}` to join!', inline: false }
      )
      .setFooter({ text: 'Watch parties expire after 2 hours of inactivity' })
      .setTimestamp();

    if (anime.coverImage?.large) {
      embed.setThumbnail(anime.coverImage.large);
    }

    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`join_party_${partyId}`)
          .setLabel('🎬 Join Party')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`start_party_${partyId}`)
          .setLabel('▶️ Start Watching')
          .setStyle(ButtonStyle.Success)
      );

    await interaction.editReply({ 
      embeds: [embed],
      components: [actionRow]
    });

  } catch (error) {
    console.error('Create watch party error:', error);
    await interaction.editReply('❌ Failed to create watch party. Please try again later.');
  }
}

async function joinWatchParty(interaction, partyId) {
  try {
    const { db } = require('../lib/firebase');
    
    // Get the specific watch party
    const partyDoc = await db.collection('watchParties').doc(partyId).get();
    
    if (!partyDoc.exists) {
      return await interaction.editReply('❌ Watch party not found! Please check the party ID and try again.');
    }

    const party = partyDoc.data();
    
    // Check if party is still active
    if (party.status !== 'waiting' && party.status !== 'active') {
      return await interaction.editReply('❌ This watch party is no longer accepting new members.');
    }

    // Check if user is already in the party
    if (party.participants.some(p => p.discordId === interaction.user.id)) {
      return await interaction.editReply('❌ You are already in this watch party!');
    }

    // Check if party is full
    if (party.participants.length >= party.maxParticipants) {
      return await interaction.editReply('❌ This watch party is full!');
    }

    // Add user to party
    const updatedParticipants = [...party.participants, {
      discordId: interaction.user.id,
      username: interaction.user.username,
      joinedAt: new Date()
    }];

    await db.collection('watchParties').doc(partyId).update({
      participants: updatedParticipants
    });

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🎉 Successfully Joined Watch Party!')
      .setDescription(`Welcome to **${party.anime.title}** watch party!`)
      .addFields(
        { name: '🎯 Host', value: party.host.username, inline: true },
        { name: '👥 Participants', value: `${updatedParticipants.length}/${party.maxParticipants}`, inline: true },
        { name: '📺 Current Episode', value: `${party.currentEpisode}`, inline: true },
        { name: '🎬 Party Status', value: party.status === 'waiting' ? 'Waiting to Start' : 'Currently Watching', inline: false }
      )
      .setFooter({ text: 'The host will start the watch session when ready!' })
      .setTimestamp();

    if (party.anime.coverImage) {
      embed.setThumbnail(party.anime.coverImage);
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Join watch party error:', error);
    await interaction.editReply('❌ Failed to join watch party. Please try again later.');
  }
}

async function listJoinableParties(interaction) {
  try {
    const { db } = require('../lib/firebase');
    
    // Get active watch parties in this guild
    const partiesSnapshot = await db.collection('watchParties')
      .where('guildId', '==', interaction.guild.id)
      .where('status', 'in', ['waiting', 'active'])
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    if (partiesSnapshot.empty) {
      const embed = new EmbedBuilder()
        .setColor('#FF6161')
        .setTitle('🎬 No Active Watch Parties')
        .setDescription('There are currently no active watch parties in this server.')
        .addFields({
          name: 'Create one:',
          value: 'Use `/watchparty create anime:YourAnimeName` to start a new watch party!'
        });

      return await interaction.editReply({ embeds: [embed] });
    }

    const parties = [];
    partiesSnapshot.forEach(doc => {
      const party = doc.data();
      parties.push({
        id: party.id,
        anime: party.anime,
        host: party.host.username,
        participants: party.participants.length,
        maxParticipants: party.maxParticipants,
        status: party.status,
        currentEpisode: party.currentEpisode
      });
    });

    const embed = new EmbedBuilder()
      .setColor('#7B61FF')
      .setTitle('🎬 Available Watch Parties')
      .setDescription('Choose a watch party to join:')
      .addFields(
        parties.map((party, index) => ({
          name: `${index + 1}. ${party.anime.title}`,
          value: `**Host:** ${party.host}\n**Participants:** ${party.participants}/${party.maxParticipants}\n**Episode:** ${party.currentEpisode}\n**Status:** ${party.status}\n**Code:** \`${party.id}\``,
          inline: true
        }))
      )
      .setFooter({ text: 'Use /watchparty join party_id:CODE to join a specific party' });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('List joinable parties error:', error);
    await interaction.editReply('❌ Failed to list watch parties. Please try again later.');
  }
}

async function listWatchParties(interaction) {
  try {
    const { db } = require('../lib/firebase');
    
    const partiesSnapshot = await db.collection('watchParties')
      .where('guildId', '==', interaction.guild.id)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (partiesSnapshot.empty) {
      const embed = new EmbedBuilder()
        .setColor('#FF6161')
        .setTitle('🎬 No Watch Parties')
        .setDescription('No watch parties found in this server.')
        .addFields({
          name: 'Create one:',
          value: 'Use `/watchparty create anime:YourAnimeName` to start a new watch party!'
        });

      return await interaction.editReply({ embeds: [embed] });
    }

    const parties = [];
    partiesSnapshot.forEach(doc => {
      const party = doc.data();
      parties.push({
        anime: party.anime,
        host: party.host.username,
        participants: party.participants.length,
        status: party.status,
        createdAt: party.createdAt.toDate()
      });
    });

    const embed = new EmbedBuilder()
      .setColor('#7B61FF')
      .setTitle('🎬 Recent Watch Parties')
      .setDescription(`Watch party history for ${interaction.guild.name}`)
      .addFields(
        parties.map((party, index) => ({
          name: `${party.anime.title || party.anime}`,
          value: `**Host:** ${party.host}\n**Participants:** ${party.participants}\n**Status:** ${party.status}\n**Created:** ${party.createdAt.toLocaleDateString()}`,
          inline: true
        }))
      )
      .setFooter({ text: 'Use /watchparty create to start a new one!' });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('List watch parties error:', error);
    await interaction.editReply('❌ Failed to list watch parties. Please try again later.');
  }
}

async function startWatchParty(interaction, partyId, episode) {
  try {
    const { db } = require('../lib/firebase');
    
    // Get the watch party
    const partyDoc = await db.collection('watchParties').doc(partyId).get();
    
    if (!partyDoc.exists) {
      return await interaction.editReply('❌ Watch party not found! Please check the party ID and try again.');
    }

    const party = partyDoc.data();
    
    // Check if user is the host or a participant
    const isHost = party.host.discordId === interaction.user.id;
    const isParticipant = party.participants.some(p => p.discordId === interaction.user.id);
    
    if (!isHost && !isParticipant) {
      return await interaction.editReply('❌ You must be the host or a participant to start watching!');
    }

    // Get streaming sources for verification
    const streamingSources = await EnhancedAnimeAPI.getStreamingSources(party.anime.id, episode);
    
    if (!streamingSources || streamingSources.length === 0) {
      return await interaction.editReply(`❌ No streaming sources found for episode ${episode} of ${party.anime.title}.`);
    }

    // Update party status and current episode
    await db.collection('watchParties').doc(partyId).update({
      status: 'active',
      currentEpisode: episode,
      lastActivity: new Date()
    });

    // Award XP to all participants for group watching
    const xpPromises = party.participants.map(async (participant) => {
      return await APIVerifiedGamification.awardXP(
        participant.discordId,
        'WATCH_PARTY',
        { sources: streamingSources },
        {
          animeId: party.anime.id,
          animeTitle: party.anime.title,
          episodeNumber: episode,
          partyId: partyId,
          participantCount: party.participants.length
        }
      );
    });

    const xpResults = await Promise.all(xpPromises);
    const successfulXP = xpResults.filter(result => result.success);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🎬 Watch Party Started!')
      .setDescription(`Now watching **${party.anime.title}** Episode ${episode}`)
      .addFields(
        { name: '👥 Participants', value: `${party.participants.length} members`, inline: true },
        { name: '🏆 XP Awarded', value: `${successfulXP.length}/${party.participants.length} participants received XP`, inline: true },
        { name: '📺 Episode', value: `${episode}`, inline: true },
        { name: '🎬 Streaming', value: 'Episode verified and ready to watch!', inline: false }
      )
      .setFooter({ text: 'Group XP bonus applied! • Synced with KamiAnime accounts' })
      .setTimestamp();

    if (party.anime.coverImage) {
      embed.setThumbnail(party.anime.coverImage);
    }

    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('🌐 Watch on KamiAnime')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://kamianime.com/anime/${party.anime.id}`),
        new ButtonBuilder()
          .setCustomId(`next_episode_${partyId}`)
          .setLabel('⏭️ Next Episode')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({ 
      embeds: [embed],
      components: [actionRow]
    });

  } catch (error) {
    console.error('Start watch party error:', error);
    await interaction.editReply('❌ Failed to start watch party. Please try again later.');
  }
}
