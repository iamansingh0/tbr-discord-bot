require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const db = require('./database');
const tbrCommand = require('./commands/tbr');
const { activeGames } = require('./games/gameManager');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('clientReady', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isAutocomplete()) {

        if (interaction.commandName === 'tbr') {

            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === 'tag') {

                const userId = interaction.user.id;

                db.all(
                    `SELECT tags FROM books WHERE user_id = ?`,
                    [userId],
                    (err, rows) => {
                        if (err) return interaction.respond([]);

                        const tagSet = new Set();

                        rows.forEach(row => {
                            if (row.tags) {
                                row.tags.split(',').forEach(tag => {
                                    tagSet.add(tag.trim());
                                });
                            }
                        });

                        const filtered = Array.from(tagSet)
                            .filter(tag =>
                                tag.includes(focusedOption.value.toLowerCase())
                            )
                            .slice(0, 25);

                        interaction.respond(
                            filtered.map(tag => ({
                                name: tag,
                                value: tag,
                            }))
                        );
                    }
                );
            }
        }
    }
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        return interaction.reply('Pong! 🏓');
    }

    if (interaction.commandName === 'tbr') {
        return tbrCommand.execute(interaction);
    }
});

client.on('messageCreate', async (message) => {

    if (message.author.bot) return;

    console.log("MESSAGE:", message.content);

    const game = activeGames.get(message.author.id);
    if (!game) return;

    const guess = Number(message.content);
    if (isNaN(guess)) return;

    game.tries++;

    if (guess === game.target) {
        message.reply(
            `🎉 ${message.author} guessed **${guess}** correctly in **${game.tries}** attempts!`
        );
        activeGames.delete(message.author.id);
    }
    else if (guess < game.target) {
        message.reply(`📉 ${guess} is low!`);
    }
    else if(guess > game.max) {
        message.reply(`⚠️ ${guess} is above the max number!`);
    }
    else {
        message.reply(`📈 ${guess} is high!`);
    }

});

client.on('error', console.error);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});



client.login(process.env.TOKEN);