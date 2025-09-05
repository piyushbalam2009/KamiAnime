const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const admin = require('firebase-admin');
const axios = require('axios');
const cron = require('node-cron');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.firestore();

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// Load all commands dynamically
const fs = require('fs');
const path = require('path');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
  client.commands.set(command.data.name, command);
}

// Load event handlers
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Remove duplicate ready handler since it's now in events/ready.js
// Command deployment will be handled in ready event

// Remove duplicate interaction handler since it's now in events/interactionCreate.js

// Airing schedule notifications
cron.schedule('0 */6 * * *', async () => {
  try {
    console.log('Checking for airing anime...');
    await checkAiringAnime();
  } catch (error) {
    console.error('Error checking airing anime:', error);
  }
});

async function checkAiringAnime() {
  const query = `
    query {
      Page(page: 1, perPage: 10) {
        airingSchedules(
          airingAt_greater: ${Math.floor(Date.now() / 1000)}
          airingAt_lesser: ${Math.floor(Date.now() / 1000) + 21600}
        ) {
          episode
          airingAt
          media {
            id
            title {
              romaji
              english
            }
            coverImage {
              medium
            }
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post('https://graphql.anilist.co', { query });
    const schedules = response.data.data.Page.airingSchedules;

    for (const schedule of schedules) {
      const anime = schedule.media;
      const title = anime.title.english || anime.title.romaji;
      const airingTime = new Date(schedule.airingAt * 1000);
      
      // Get guilds that want notifications
      const guildsSnapshot = await db.collection('guilds').where('airingNotifications', '==', true).get();
      
      for (const guildDoc of guildsSnapshot.docs) {
        const guildData = guildDoc.data();
        const guild = client.guilds.cache.get(guildDoc.id);
        
        if (guild && guildData.notificationChannel) {
          const channel = guild.channels.cache.get(guildData.notificationChannel);
          
          if (channel) {
            const embed = {
              title: '📺 Anime Airing Soon!',
              description: `**${title}** Episode ${schedule.episode} is airing soon!`,
              color: 0x7B61FF,
              thumbnail: { url: anime.coverImage.medium },
              fields: [
                {
                  name: 'Airing Time',
                  value: `<t:${schedule.airingAt}:F>`,
                  inline: true
                }
              ],
              footer: { text: 'KamiAnime Bot' }
            };

            await channel.send({ embeds: [embed] });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching airing schedule:', error);
  }
}

// Error handling
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);
