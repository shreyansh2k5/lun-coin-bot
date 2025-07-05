// src/commands/ping.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

/**
 * The ping command.
 * @returns {object} The command object.
 */
module.exports = () => ({
    name: 'ping',
    description: 'Checks the bot\'s latency.',
    slashCommandData: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Checks the bot\'s latency.'),

    async prefixExecute(message, args) {
        const sent = await message.channel.send('Pinging...');
        sent.edit(`Pong! Latency is ${sent.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(message.client.ws.ping)}ms.`);
    },

    async slashExecute(interaction) {
        try {
            // Defer reply first
            await interaction.deferReply({ flags: 0 }); // Ping should be public
        } catch (deferError) {
            console.error(`Failed to defer reply for /${interaction.commandName}:`, deferError);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Sorry, I took too long to respond. Please try again.', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to send timeout error:", e));
            }
            return;
        }

        const sentTimestamp = interaction.createdTimestamp;
        const botLatency = Math.round(interaction.client.ws.ping);

        await interaction.followUp(`Pong! Latency is ${Date.now() - sentTimestamp}ms. API Latency is ${botLatency}ms.`);
    },
});
