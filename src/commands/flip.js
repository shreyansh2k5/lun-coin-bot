// src/commands/flip.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { FLIP_WIN_CHANCE } = require('../config/gameConfig');

/**
 * Factory function to create the flip command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'flip',
    description: 'Flip a coin! 50% chance to double your coins or lose them all.',
    slashCommandData: new SlashCommandBuilder()
        .setName('flip')
        .setDescription('Flip a coin! 50% chance to double your coins or lose them all.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of coins to bet')
                .setRequired(true)
                .setMinValue(1)),

    async prefixExecute(message, args) {
        const userId = message.author.id;
        const username = message.author.username;
        const amount = parseInt(args[0]);

        if (isNaN(amount) || amount <= 0) {
            return message.channel.send('Usage: `$flip <amount>`. Amount must be a positive number.');
        }

        try {
            const balance = await coinManager.getBalance(userId);
            if (balance < amount) {
                return message.channel.send(`${username}, you only have **${balance}** 💰. You cannot bet **${amount}** 💰.`);
            }

            const win = Math.random() < FLIP_WIN_CHANCE;
            let newBalance;
            let resultMessage;

            if (win) {
                newBalance = await coinManager.addCoins(userId, amount);
                resultMessage = `🎉 ${username}, you won the coin flip and doubled your bet! You gained **${amount}** 💰. Your new balance is **${newBalance}** 💰.`;
            } else {
                newBalance = await coinManager.removeCoins(userId, amount);
                resultMessage = `💔 ${username}, you lost the coin flip and lost **${amount}** 💰. Your new balance is **${newBalance}** 💰.`;
            }
            await message.channel.send(resultMessage);

        } catch (error) {
            console.error(`Error in $flip command for ${username}:`, error);
            await message.channel.send(`An error occurred during the coin flip: ${error.message}`);
        }
    },

    async slashExecute(interaction) {
        // DEFER REPLY IS REMOVED FROM HERE - IT'S NOW IN COMMANDHANDLER.JS
        const userId = interaction.user.id;
        const username = interaction.user.username;
        const amount = interaction.options.getInteger('amount');

        try {
            const balance = await coinManager.getBalance(userId);
            if (balance < amount) {
                return interaction.followUp({ content: `${username}, you only have **${balance}** 💰. You cannot bet **${amount}** 💰.`, flags: MessageFlags.Ephemeral });
            }

            const win = Math.random() < FLIP_WIN_CHANCE;
            let newBalance;
            let resultMessage;

            if (win) {
                newBalance = await coinManager.addCoins(userId, amount);
                resultMessage = `🎉 ${username}, you won the coin flip and doubled your bet! You gained **${amount}** 💰. Your new balance is **${newBalance}** 💰.`;
            } else {
                newBalance = await coinManager.removeCoins(userId, amount);
                resultMessage = `💔 ${username}, you lost the coin flip and lost **${amount}** 💰. Your new balance is **${newBalance}** 💰.`;
            }
            await interaction.followUp(resultMessage);

        } catch (error) {
            console.error(`Error in /flip command for ${username}:`, error);
            await interaction.followUp({ content: `An error occurred during the coin flip: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },
});
