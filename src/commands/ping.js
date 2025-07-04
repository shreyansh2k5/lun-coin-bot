// src/commands/ping.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Replies with Pong!',
    // Slash command data for Discord API registration
    slashCommandData: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),

    /**
     * Executes the ping command for prefix messages.
     * @param {import('discord.js').Message} message The Discord message object.
     * @param {string[]} args An array of arguments (not used for ping).
     */
    async prefixExecute(message, args) {
        await message.channel.send('Pong!');
    },

    /**
     * Executes the ping command for slash commands.
     * @param {import('discord.js').ChatInputCommandInteraction} interaction The interaction object.
     */
    async slashExecute(interaction) {
        // interaction.deferReply() is handled by commandHandler
        await interaction.followUp('Pong!');
    },
};
