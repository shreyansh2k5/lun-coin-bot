// src/commands/bank_withdraw.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { BANK_COOLDOWN_MS } = require('../config/gameConfig');

const withdrawCooldowns = new Map(); // Stores userId -> lastUsedTimestamp

/**
 * Factory function to create the bank_withdraw command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'bank_withdraw',
    description: 'Withdraw coins from your bank. If your bank becomes empty, you can be raided again.',
    slashCommandData: new SlashCommandBuilder()
        .setName('bank_withdraw')
        .setDescription('Withdraw coins from your bank. If your bank becomes empty, you can be raided again.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of coins to withdraw')
                .setRequired(true)
                .setMinValue(1)),

    async executeCommand(userId, username, amount, replyFunction) {
        const now = Date.now();
        const lastUsed = withdrawCooldowns.get(userId);

        // Cooldown check
        if (lastUsed && (now - lastUsed < BANK_COOLDOWN_MS)) {
            const timeLeft = BANK_COOLDOWN_MS - (now - lastUsed);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            let timeString = '';
            if (hours > 0) timeString += `${hours} hour(s) `;
            if (minutes > 0) timeString += `${minutes} minute(s) `;
            if (seconds > 0) timeString += `${seconds} second(s) `;
            timeString = timeString.trim();

            return replyFunction(`You can withdraw coins again in ${timeString}.`, true);
        }

        try {
            const userData = await coinManager.getUserData(userId);
            if (userData.bankedCoins < amount) {
                return replyFunction(`You only have **${userData.bankedCoins}** 💰 in your bank. You cannot withdraw **${amount}** 💰.`, true);
            }

            const { coins: newCoins, bankedCoins: newBankedCoins } = await coinManager.withdrawCoins(userId, amount);
            withdrawCooldowns.set(userId, now); // Set cooldown

            let message = `💸 **${username}**, you successfully withdrew **${amount}** 💰 from your bank!
            Your new main balance: **${newCoins}** 💰.
            Your new bank balance: **${newBankedCoins}** 💰.`;

            if (newBankedCoins === 0) {
                message += `\nYour bank is now empty, and you are no longer safe from raids.`;
            } else {
                message += `\nYou still have coins in your bank and remain safe from raids.`;
            }
            await replyFunction(message, false);

        } catch (error) {
            console.error(`Error in bank_withdraw command for ${username}:`, error);
            let errorMessage = `An error occurred during withdrawal: ${error.message}`;
            if (error.message.includes("Insufficient funds")) {
                errorMessage = "You don't have enough coins in your bank to make this withdrawal.";
            }
            await replyFunction(`Sorry ${username}, ${errorMessage}`, true);
        }
    },

    async prefixExecute(message, args) {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) {
            return message.channel.send('Usage: `$bank_withdraw <amount>`. Amount must be a positive number.');
        }
        await this.executeCommand(message.author.id, message.author.username, amount, (content, ephemeral) => message.channel.send(content));
    },

    async slashExecute(interaction) {
        const amount = interaction.options.getInteger('amount');
        // Corrected syntax: removed the extra colon after MessageFlags.Ephemeral
        await this.executeCommand(interaction.user.id, interaction.user.username, amount, (content, ephemeral) => interaction.followUp({ content, flags: ephemeral ? MessageFlags.Ephemeral : 0 }));
    },
});
