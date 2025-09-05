const { Events } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`🤖 ${client.user.tag} is online!`);
    
    // Deploy slash commands
    const commands = [];
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(`../commands/${file}`);
      commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    
    try {
      console.log('Started refreshing application (/) commands.');
      
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
      );
      
      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error('Error deploying commands:', error);
    }
    
    // Set rotating activity status
    const activities = [
      'KamiAnime | /help',
      'Anime & Manga | /search',
      'Watch Parties | /watchparty',
      'Leaderboards | /leaderboard'
    ];
    
    let activityIndex = 0;
    client.user.setActivity(activities[activityIndex]);
    
    // Rotate activities every 30 seconds
    setInterval(() => {
      activityIndex = (activityIndex + 1) % activities.length;
      client.user.setActivity(activities[activityIndex]);
    }, 30000);

    // Log guild information
    client.guilds.cache.forEach(guild => {
      console.log(`🏠 Guild: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
    });
  },
};
