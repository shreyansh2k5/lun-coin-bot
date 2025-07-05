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
            await message.channel.send(`💰 ${username}, your current balance is **${balance}** coins.`); // Bold coins
        } catch (error) {
            console.error(`Error in $balance command for ${username}:`, error);
            await message.channel.send(`Sorry ${username}, there was an error fetching your balance: ${error.message}`);
        }
    },

    async slashExecute(interaction) {
        // THIS IS THE CRUCIAL LINE TO ADD/ENSURE IS PRESENT
        await interaction.deferReply({ ephemeral: false }); // Balance command should be public

        const userId = interaction.user.id;
        const username = interaction.user.username;
        try {
            const balance = await coinManager.getBalance(userId);
            // After deferring, use followUp
            await interaction.followUp(`💰 ${username}, your current balance is **${balance}** coins.`);
        } catch (error) {
            console.error(`Error in /balance command for ${username}:`, error);
            // After deferring, use followUp for errors too
            await interaction.followUp({ content: `Sorry ${username}, there was an error fetching your balance: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },
});
