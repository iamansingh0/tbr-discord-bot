const db = require('../database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'tbr',

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        if (subcommand === 'add') {
            const title = interaction.options.getString('title');

            await interaction.deferReply({ flags: 64 });

            db.run(
                `INSERT INTO books (user_id, title) VALUES (?, ?)`,
                [userId, title],
                function (err) {
                    if (err) {
                        console.error(err);
                        return interaction.editReply('❌ Error adding book.');
                    }

                    interaction.editReply(`📚 Added **${title}** to your TBR!`);
                }
            );
        }

        if (subcommand === 'list') {
            await interaction.deferReply({ flags: 64 });

            try {
                const rows = await new Promise((resolve, reject) => {
                    db.all(
                        `SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC`,
                        [userId],
                        (err, rows) => {
                            if (err) reject(err);
                            else resolve(rows);
                        }
                    );
                });

                if (!rows.length) {
                    return interaction.editReply('📚 Your TBR is empty!');
                }

                const groups = {
                    reading: [],
                    not_started: [],
                    paused: [],
                    completed: [],
                };

                rows.forEach((book, index) => {
                    const padded = String(index + 1).padStart(2, '0');
                    groups[book.status]?.push(`\` ${padded} \`  ${book.title}`);
                });

                const buildSection = (emoji, title, books) => {
                    if (!books.length) return '';

                    return (
                        `\n${emoji}  **${title}**\n` +
                        `\n` + // extra space after header
                        books.map((b) => `      ${b}`).join('\n') +
                        `\n\n` // extra space between sections
                    );
                };

                const description =
                    buildSection('🟢', 'Reading', groups.reading) +
                    buildSection('🟡', 'Not Started', groups.not_started) +
                    buildSection('🔵', 'Paused', groups.paused) +
                    buildSection('🏆', 'Completed', groups.completed);

                const embed = new EmbedBuilder()
                    .setColor(0x9b59b6)
                    .setTitle('📚 Your TBR List')
                    .setDescription(description.trim())
                    .setFooter({ text: `Total Books: ${rows.length}` })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });

            } catch (err) {
                console.error(err);
                return interaction.editReply('❌ Something went wrong.');
            }
        }

        if (subcommand === 'remove') {
            const number = interaction.options.getInteger('number');

            await interaction.deferReply({ flags: 64 });

            db.all(
                `SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC`,
                [userId],
                (err, rows) => {
                    if (err) {
                        console.error(err);
                        return interaction.editReply('❌ Error fetching your TBR.');
                    }

                    if (!rows[number - 1]) {
                        return interaction.editReply('❌ Invalid book number.');
                    }

                    const bookToDelete = rows[number - 1];

                    db.run(
                        `DELETE FROM books WHERE id = ?`,
                        [bookToDelete.id],
                        function (err) {
                            if (err) {
                                console.error(err);
                                return interaction.editReply('❌ Error removing book.');
                            }

                            interaction.editReply(`🗑️ Removed **${bookToDelete.title}**.`);
                        }
                    );
                }
            );
        }

        if (subcommand === 'status') {
            const number = interaction.options.getInteger('number');
            const state = interaction.options.getString('state');

            await interaction.deferReply({ flags: 64 });

            db.all(
                `SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC`,
                [userId],
                (err, rows) => {
                    if (err) {
                        console.error(err);
                        return interaction.editReply('❌ Error fetching your TBR.');
                    }

                    if (!rows[number - 1]) {
                        return interaction.editReply('❌ Invalid book number.');
                    }

                    const book = rows[number - 1];

                    db.run(
                        `UPDATE books SET status = ? WHERE id = ?`,
                        [state, book.id],
                        function (err) {
                            if (err) {
                                console.error(err);
                                return interaction.editReply('❌ Error updating status.');
                            }

                            interaction.editReply(
                                `📘 Updated **${book.title}** to **${state.replace('_', ' ')}**.`
                            );
                        }
                    );
                }
            );
        }

        if (subcommand === 'random') {
            await interaction.deferReply({ flags: 64 });

            db.all(
                `SELECT * FROM books WHERE user_id = ?`,
                [userId],
                (err, rows) => {
                    if (err) {
                        console.error(err);
                        return interaction.editReply('❌ Error fetching your TBR.');
                    }

                    if (rows.length === 0) {
                        return interaction.editReply('📚 Your TBR is empty!');
                    }

                    const randomBook = rows[Math.floor(Math.random() * rows.length)];

                    const statusEmoji = {
                        not_started: '🟡',
                        reading: '🟢',
                        completed: '🏆',
                        paused: '🔵',
                    };

                    const embed = new EmbedBuilder()
                        .setColor(0xf39c12)
                        .setTitle('🎲 Random Pick')
                        .setDescription(
                            `${statusEmoji[randomBook.status] || '📘'} **${randomBook.title}**`
                        )
                        .setFooter({ text: 'Trust the algorithm 👀' })
                        .setTimestamp();

                    return interaction.editReply({ embeds: [embed] });
                }
            );
        }
    },
};