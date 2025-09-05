const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { FunAPI } = require('../lib/enhanced-api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random anime meme'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const meme = await FunAPI.getAnimeMeme();
      
      if (!meme || !meme.url) {
        return await interaction.editReply('❌ Could not fetch anime meme. Please try again later.');
      }

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`😂 ${meme.title}`)
        .setImage(meme.url)
        .setTimestamp();

      if (meme.subreddit) {
        embed.addFields({
          name: '📍 Source',
          value: `r/${meme.subreddit} • by u/${meme.author}`,
          inline: true
        });
      }

      if (meme.score) {
        embed.addFields({
          name: '⬆️ Score',
          value: `${meme.score} upvotes`,
          inline: true
        });
      }

      if (meme.permalink) {
        embed.addFields({
          name: '🔗 Reddit Link',
          value: `[View on Reddit](${meme.permalink})`,
          inline: true
        });
      }

      embed.setFooter({ text: 'Enhanced multi-source meme search • Fresh from Reddit!' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Meme command error:', error);
      await interaction.editReply('❌ An error occurred while fetching anime meme. Please try again later.');
    }
  },
};
