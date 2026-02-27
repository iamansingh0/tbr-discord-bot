require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const db = require('./database');
const tbrCommand = require('./commands/tbr');

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.once('clientReady', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    return interaction.reply('Pong! 🏓');
  }

  if (interaction.commandName === 'tbr') {
    return tbrCommand.execute(interaction);
  }
});

client.on('error', console.error);

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});



client.login(process.env.TOKEN);