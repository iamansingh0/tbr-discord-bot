const db = require('../database');

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

      db.all(
        `SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC`,
        [userId],
        (err, rows) => {
          if (err) {
            console.error(err);
            return interaction.editReply('❌ Error fetching your TBR.');
          }

          if (rows.length === 0) {
            return interaction.editReply('📚 Your TBR is empty!');
          }

          let response = '📖 **Your TBR:**\n\n';

          rows.forEach((book, index) => {
            response += `${index + 1}. ${book.title} (${book.status})\n`;
          });

          interaction.editReply(response);
        }
      );
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
  },
};