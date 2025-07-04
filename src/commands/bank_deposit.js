// src/commands/bank_deposit.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { BANK_COOLDOWN_MS } = require('../config/gameConfig');

const depositCooldowns = new Map(); // Stores userId -> lastUsedTimestamp

/**
 * Factory function to create the bank_deposit command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'bank_deposit',
    description: 'Deposit coins into your bank for safekeeping. You cannot raid or be raided while banked.',
    slashCommandData: new SlashCommandBuilder()
        .setName('bank_deposit')
        .setDescription('Deposit coins into your bank for safekeeping. You cannot raid or be raided while banked.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of coins to deposit')
                .setRequired(true)
                .setMinValue(1)),

    async executeCommand(userId, username, amount, replyFunction) {
        const now = Date.now();
        const lastUsed = depositCooldowns.get(userId);

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

            return replyFunction(`You can deposit coins again in ${timeString}.`, true);
        }

        try {
            const userData = await coinManager.getUserData(userId);
            if (userData.coins < amount) {
                return replyFunction(`You only have **${userData.coins}** 💰. You cannot deposit **${amount}** 💰.`, true);
            }

            const { coins: newCoins, bankedCoins: newBankedCoins } = await coinManager.depositCoins(userId, amount);
            depositCooldowns.set(userId, now); // Set cooldown

            await replyFunction(`🏦 **${username}**, you successfully deposited **${amount}** 💰 into your bank!
            Your new main balance: **${newCoins}** 💰.
            Your new bank balance: **${newBankedCoins}** 💰.
            You are now safe from raids and cannot raid others.`, false);

        } catch (error) {
            console.error(`Error in bank_deposit command for ${username}:`, error);
            let errorMessage = `An error occurred during deposit: ${error.message}`;
            if (error.message.includes("Insufficient funds")) {
                errorMessage = "You don't have enough coins in your main balance to make this deposit.";
            }
            await replyFunction(`Sorry ${username}, ${errorMessage}`, true);
        }
    },

    async prefixExecute(message, args) {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) {
            return message.channel.send('Usage: `$bank_deposit <amount>`. Amount must be a positive number.');
        }
        await this.executeCommand(message.author.id, message.author.username, amount, (content, ephemeral) => message.channel.send(content));
    },

    async slashExecute(interaction) {
        const amount = interaction.options.getInteger('amount');
        await this.executeCommand(interaction.user.id, interaction.user.username, amount, (content, ephemeral) => interaction.followUp({ content, flags: ephemeral ? MessageFlags.Ephemeral : 0 }));
    },
});
