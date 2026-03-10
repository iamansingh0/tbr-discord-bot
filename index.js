require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const db = require('./database');
const tbrCommand = require('./commands/tbr');
const { activeGames, pendingDuels, leaderboard } = require('./games/gameManager');

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
    if (interaction.isButton()) {

        const id = interaction.customId;

        // ---- ACCEPT DUEL ----
        if (id.startsWith("duel_accept_")) {

            const duel = pendingDuels.get(interaction.channelId);

            if (!duel) {
                return interaction.reply({
                    content: "❌ Duel request expired.",
                    ephemeral: true
                });
            }

            const { challengerId, opponentId, min, max } = duel;

            if (interaction.user.id !== opponentId) {
                return interaction.reply({
                    content: "❌ Only the challenged player can accept.",
                    ephemeral: true
                });
            }

            const num1 = Math.floor(Math.random() * (max - min + 1)) + min;
            const num2 = Math.floor(Math.random() * (max - min + 1)) + min;

            activeGames.set(interaction.channelId, {
                mode: "duel",
                min,
                max,
                finished: false,
                history: [],
                players: {
                    [challengerId]: { target: num1, tries: 0 },
                    [opponentId]: { target: num2, tries: 0 }
                }
            });

            // remove pending duel
            pendingDuels.delete(interaction.channelId);

            return interaction.update({
                content:
                    `⚔️ **Duel Started!**

<@${challengerId}> vs <@${opponentId}>

Guess numbers between **${min} – ${max}**

Whoever finds their number first wins!`,
                components: []
            });
        }

        // ---- DECLINE DUEL ----
        if (id.startsWith("duel_decline_")) {

            const duel = pendingDuels.get(interaction.channelId);

            if (!duel) {
                return interaction.reply({
                    content: "❌ Duel request expired.",
                    ephemeral: true
                });
            }

            if (interaction.user.id !== duel.opponentId) {
                return interaction.reply({
                    content: "❌ Only the challenged player can decline.",
                    ephemeral: true
                });
            }

            pendingDuels.delete(interaction.channelId);

            return interaction.update({
                content: "❌ Duel declined.",
                components: []
            });
        }
    }
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

    const guess = Number(message.content);
    if (isNaN(guess)) return;

    // ---- SINGLE PLAYER GAME ----
    const singleGame = activeGames.get(message.author.id);
    if (singleGame && singleGame.mode === "single") {
        singleGame.tries++;
        if (guess === singleGame.target) {
            await message.reply(
                `🎉 ${message.author} guessed **${guess}** correctly in **${singleGame.tries}** attempts!`
            );
            activeGames.delete(message.author.id);
            return;
        }

        if (guess < singleGame.target) {
            message.reply(`📉 ${guess} is low!`);
        } else {
            message.reply(`📈 ${guess} is high!`);
        }

        return;
    }

    // ---- DUEL GAME ----
    const duelGame = activeGames.get(message.channelId);
    if (!duelGame || duelGame.mode !== "duel") return;

    const player = duelGame.players[message.author.id];
    if (!player) return;

    player.tries++;
    duelGame.history.push({
        user: message.author.id,
        guess
    });

    if (guess === player.target) {
        if (duelGame.finished) return;
        duelGame.finished = true;

        const wins = leaderboard.get(message.author.id) || 0;
        leaderboard.set(message.author.id, wins + 1);

        const players = duelGame.players;
        const ids = Object.keys(players);
        const p1 = ids[0];
        const p2 = ids[1];

        const p1Target = players[p1].target;
        const p2Target = players[p2].target;
        const historyText = duelGame.history
            .map(h => `<@${h.user}> → ${h.guess}`)
            .join("\n");

        await message.reply(
            `🏆 **${message.author} wins the duel!**

🎯 Secret numbers:
<@${p1}> → **${p1Target}**
<@${p2}> → **${p2Target}**

📜 Guess History: ${historyText}

Attempts: **${player.tries}**`
        );

        activeGames.delete(message.channelId);
        return;
    }

    if (guess < player.target) {
        message.reply(`📉 ${guess} is low!`);
    } else {
        message.reply(`📈 ${guess} is high!`);
    }

});

client.on('error', console.error);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});


client.login(process.env.TOKEN);