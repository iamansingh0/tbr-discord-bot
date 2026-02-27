require('dotenv').config();
const { REST, Routes } = require('discord.js');

const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
    },
    {
        name: 'tbr',
        description: 'Manage your TBR list',
        options: [
            {
                type: 1, // SUB_COMMAND
                name: 'add',
                description: 'Add a book to your TBR',
                options: [
                    {
                        type: 3, // STRING
                        name: 'title',
                        description: 'Book title',
                        required: true,
                    },
                ],
            },
            {
                type: 1, // SUB_COMMAND
                name: 'list',
                description: 'View your TBR list',
            },
            {
                type: 1, // SUB_COMMAND
                name: 'remove',
                description: 'Remove a book from your TBR',
                options: [
                    {
                        type: 4, // INTEGER
                        name: 'number',
                        description: 'Book number from your list',
                        required: true,
                    },
                ],
            },
            {
                type: 1, // SUB_COMMAND
                name: 'status',
                description: 'Update status of a book',
                options: [
                    {
                        type: 4, // INTEGER
                        name: 'number',
                        description: 'Book number from your list',
                        required: true,
                    },
                    {
                        type: 3, // STRING
                        name: 'state',
                        description: 'New status',
                        required: true,
                        choices: [
                            { name: 'Not Started', value: 'not_started' },
                            { name: 'Reading', value: 'reading' },
                            { name: 'Completed', value: 'completed' },
                            { name: 'Paused', value: 'paused' },
                        ],
                    },
                ],
            },
            {
                type: 1,
                name: 'random',
                description: 'Pick a random book from your TBR',
            },
            {
                type: 1,
                name: 'stats',
                description: 'View your reading statistics',
            },
        ],
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Registering slash commands...');

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log('Slash commands registered successfully!');
    } catch (error) {
        console.error(error);
    }
})();

