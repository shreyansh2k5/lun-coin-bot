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
    try {
        // Defer reply first to prevent "Unknown interaction" error
        // Use flags: 0 for public replies, or MessageFlags.Ephemeral for private replies
        await interaction.deferReply({ flags: 0 }); // Adjust flags based on whether the command's primary response should be public or private
    } catch (deferError) {
        console.error(`Failed to defer reply for /${interaction.commandName}:`, deferError);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Sorry, I took too long to respond. Please try again.', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to send timeout error:", e));
        }
        return; // Stop execution if deferral failed
    }
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
