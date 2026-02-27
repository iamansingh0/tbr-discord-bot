const db = require('../database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'tbr',

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        if (subcommand === 'add') {
            const title = interaction.options.getString('title');
            const tagsInput = interaction.options.getString('tags') || '';

            const normalizedTags = tagsInput
                .split(',')
                .map(t => t.trim().toLowerCase())
                .filter(Boolean)
                .join(',');

            await interaction.deferReply({ flags: 64 });

            db.run(
                `INSERT INTO books (user_id, title, tags) VALUES (?, ?, ?)`,
                [userId, title, normalizedTags],
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
                    const tagDisplay = book.tags
                        ? `  •  🏷️ ${book.tags.split(',').join(', ')}`
                        : '';

                    groups[book.status]?.push(
                        `${padded}.  ${book.title}${tagDisplay}`
                    );
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

            try {
                const tagFilter = interaction.options.getString('tag');

                let query = `SELECT * FROM books WHERE user_id = ?`;
                let params = [userId];

                if (tagFilter) {
                    query += ` AND tags LIKE ?`;
                    params.push(`%${tagFilter.toLowerCase()}%`);
                }

                const rows = await new Promise((resolve, reject) => {
                    db.all(query, params, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                if (!rows.length) {
                    return interaction.editReply(
                        tagFilter
                            ? `📚 No books found with tag: **${tagFilter}**`
                            : '📚 Your TBR is empty!'
                    );
                }

                const randomBook = rows[Math.floor(Math.random() * rows.length)];

                const statusEmoji = {
                    not_started: '🟡',
                    reading: '🟢',
                    completed: '🏆',
                    paused: '🔵',
                };

                const tagDisplay = randomBook.tags
                    ? `\n\n🏷️ Tags: ${randomBook.tags.split(',').join(', ')}`
                    : '';

                const embed = new EmbedBuilder()
                    .setColor(0xf39c12)
                    .setTitle('🎲 Random Pick')
                    .setDescription(
                        `${statusEmoji[randomBook.status] || '📘'} **${randomBook.title}**${tagDisplay}`
                    )
                    .setFooter({
                        text: tagFilter
                            ? `Filtered by tag: ${tagFilter}`
                            : 'Trust the algorithm 👀',
                    })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });

            } catch (err) {
                console.error(err);
                return interaction.editReply('❌ Failed to fetch random book.');
            }
        }

        if (subcommand === 'stats') {
            await interaction.deferReply({ flags: 64 });

            try {
                const rows = await new Promise((resolve, reject) => {
                    db.all(
                        `SELECT status FROM books WHERE user_id = ?`,
                        [userId],
                        (err, rows) => {
                            if (err) reject(err);
                            else resolve(rows);
                        }
                    );
                });

                if (!rows.length) {
                    return interaction.editReply('📚 No books yet to analyze!');
                }

                const total = rows.length;

                const counts = {
                    reading: 0,
                    not_started: 0,
                    paused: 0,
                    completed: 0,
                };

                rows.forEach((row) => {
                    if (counts[row.status] !== undefined) {
                        counts[row.status]++;
                    }
                });

                const completionRate = Math.round(
                    (counts.completed / total) * 100
                );

                const progressBar = (percent) => {
                    const totalBlocks = 12;
                    const filled = Math.round((percent / 100) * totalBlocks);
                    const empty = totalBlocks - filled;

                    return '🟩'.repeat(filled) + '⬜'.repeat(empty);
                };

                let insight = '';

                if (completionRate === 0) {
                    insight = '📖 Time to finish your first book!';
                } else if (completionRate < 50) {
                    insight = '⚡ You’re warming up!';
                } else if (completionRate < 80) {
                    insight = '🔥 Strong reading energy!';
                } else {
                    insight = '🏆 Elite reader status!';
                }

                const getColor = (percent) => {
                    if (percent < 30) return 0xe74c3c;   // red
                    if (percent < 60) return 0xf1c40f;   // yellow
                    return 0x2ecc71;                     // green
                };
                const embed = new EmbedBuilder()
                    .setColor(getColor(completionRate))
                    .setTitle('📊 Your Reading Stats')
                    .setDescription(
                        `**Overview**
                        📚 Total Books: **${total}**

                        **Breakdown**
                        🟢 Reading: **${counts.reading}**
                        🟡 Not Started: **${counts.not_started}**
                        🔵 Paused: **${counts.paused}**
                        🏆 Completed: **${counts.completed}**

                        **Progress**
                        ${progressBar(completionRate)}  **${completionRate}%**
                        \n${insight}
                        `
                    )
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });

            } catch (err) {
                console.error(err);
                return interaction.editReply('❌ Failed to calculate stats.');
            }
        }

        if (subcommand === 'tags') {
            await interaction.deferReply({ flags: 64 });

            try {
                const rows = await new Promise((resolve, reject) => {
                    db.all(
                        `SELECT tags FROM books WHERE user_id = ?`,
                        [userId],
                        (err, rows) => {
                            if (err) reject(err);
                            else resolve(rows);
                        }
                    );
                });

                const tagSet = new Set();

                rows.forEach(row => {
                    if (row.tags) {
                        row.tags.split(',').forEach(tag => {
                            tagSet.add(tag.trim());
                        });
                    }
                });

                if (!tagSet.size) {
                    return interaction.editReply('🏷️ No tags found yet.');
                }

                const tagList = Array.from(tagSet).sort().join(', ');

                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle('🏷️ Your Tags')
                    .setDescription(tagList)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });

            } catch (err) {
                console.error(err);
                return interaction.editReply('❌ Failed to fetch tags.');
            }
        }
    },
};