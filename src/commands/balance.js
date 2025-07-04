// src/commands/balance.js
const { SlashCommandBuilder } = require('discord.js');

/**
 * Factory function to create the balance command.
 * This allows passing dependencies like coinManager.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'balance',
    description: 'Checks your current coin balance.',
    // Slash command data for Discord API registration
    slashCommandData: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Checks your current coin balance.'),

    /**
     * Executes the balance command for prefix messages.
     * @param {import('discord.js').Message} message The Discord message object.
     * @param {string[]} args An array of arguments (not used for balance).
     */
    async prefixExecute(message, args) {
        const userId = message.author.id;
        const username = message.author.username;

        try {
            const balance = await coinManager.getBalance(userId);
            await message.channel.send(`${username}, your current coin balance is: **${balance}** 💰`); // Bold coins
        } catch (error) {
            console.error(`Error in $balance command for ${username}:`, error);
            await message.channel.send(`Sorry ${username}, I couldn't fetch your balance right now.`);
        }
    },

    /**
     * Executes the balance command for slash commands.
     * @param {import('discord.js').ChatInputCommandInteraction} interaction The interaction object.
     */
    async slashExecute(interaction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;

        try {
            const balance = await coinManager.getBalance(userId);
            await interaction.followUp(`${username}, your current coin balance is: **${balance}** 💰`); // Bold coins
        } catch (error) {
            console.error(`Error in /balance command for ${username}:`, error);
            await interaction.followUp(`Sorry ${username}, I couldn't fetch your balance right now.`);
        }
    },
});
