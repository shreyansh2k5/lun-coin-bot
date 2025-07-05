// src/commands/balance.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

/**
 * Factory function to create the balance command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'balance',
    description: 'Check your current coin balance.',
    slashCommandData: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your current coin balance.'),

    async prefixExecute(message, args) {
        const userId = message.author.id;
        const username = message.author.username;
        try {
            const balance = await coinManager.getBalance(userId);
            await message.channel.send(`💰 ${username}, your current balance is **${balance}** coins.`);
        } catch (error) {
            console.error(`Error in $balance command for ${username}:`, error);
            await message.channel.send(`Sorry ${username}, there was an error fetching your balance: ${error.message}`);
        }
    },

    async slashExecute(interaction) {
        // DEFER REPLY IS REMOVED FROM HERE - IT'S NOW IN COMMANDHANDLER.JS
        const userId = interaction.user.id;
        const username = interaction.user.username;
        try {
            const balance = await coinManager.getBalance(userId);
            await interaction.followUp(`💰 ${username}, your current balance is **${balance}** coins.`);
        } catch (error) {
            console.error(`Error in /balance command for ${username}:`, error);
            await interaction.followUp({ content: `Sorry ${username}, there was an error fetching your balance: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },
});
