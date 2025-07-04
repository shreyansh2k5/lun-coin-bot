// src/commands/daily.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const dailyCooldowns = new Map(); // Stores userId -> lastUsedTimestamp

const DAILY_REWARD = 5000;
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Factory function to create the daily command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'daily',
    description: `Claim your daily ${DAILY_REWARD} coins! Usable once every 24 hours.`,
    slashCommandData: new SlashCommandBuilder()
        .setName('daily')
        .setDescription(`Claim your daily ${DAILY_REWARD} coins! Usable once every 24 hours.`),

    async executeCommand(userId, username, replyFunction) {
        const now = Date.now();
        const lastUsed = dailyCooldowns.get(userId);

        if (lastUsed && (now - lastUsed < COOLDOWN_MS)) {
            const timeLeft = COOLDOWN_MS - (now - lastUsed);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            let timeString = '';
            if (hours > 0) timeString += `${hours} hour(s) `;
            if (minutes > 0) timeString += `${minutes} minute(s) `;
            if (seconds > 0) timeString += `${seconds} second(s) `;
            timeString = timeString.trim();

            // Use flags: MessageFlags.Ephemeral for ephemeral replies in slash commands
            return replyFunction(`${username}, you can claim your daily coins again in ${timeString}.`, true); // Pass true for ephemeral
        }

        try {
            const newBalance = await coinManager.addCoins(userId, DAILY_REWARD);
            dailyCooldowns.set(userId, now); // Update last used timestamp
            await replyFunction(`🎉 ${username}, you claimed your daily **${DAILY_REWARD}** 💰! Your new balance is **${newBalance}** 💰.`); // Bold coins
        } catch (error) {
            console.error(`Error in daily command for ${username}:`, error);
            await replyFunction(`Sorry ${username}, there was an error claiming your daily coins: ${error.message}`, true); // Pass true for ephemeral
        }
    },

    async prefixExecute(message, args) {
        const userId = message.author.id;
        const username = message.author.username;
        await this.executeCommand(userId, username, (content, ephemeral) => message.channel.send(content)); // Prefix commands don't use ephemeral
    },

    async slashExecute(interaction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;
        await this.executeCommand(userId, username, (content, ephemeral) => interaction.followUp({ content, flags: ephemeral ? MessageFlags.Ephemeral : 0 }));
    },
});
