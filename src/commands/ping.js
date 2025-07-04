// src/commands/ping.js

module.exports = {
    name: 'ping',
    description: 'Replies with Pong!',
    /**
     * Executes the ping command.
     * @param {import('discord.js').Message} message The Discord message object.
     * @param {string[]} args An array of arguments (not used for ping).
     */
    async execute(message, args) {
        await message.channel.send('Pong!');
    },
};
