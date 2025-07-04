// src/commands/beg.js
const { SlashCommandBuilder } = require('discord.js');

const begCooldowns = new Map(); // Stores userId -> lastUsedTimestamp

const MIN_BEG_REWARD = 1;
const MAX_BEG_REWARD = 1000;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Factory function to create the beg command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'beg',
    description: `Beg for coins! Get 1-${MAX_BEG_REWARD} coins every 5 minutes.`,
    slashCommandData: new SlashCommandBuilder()
        .setName('beg')
        .setDescription(`Beg for coins! Get 1-${MAX_BEG_REWARD} coins every 5 minutes.`),

    async executeCommand(userId, username, replyFunction) {
        const now = Date.now();
        const lastUsed = begCooldowns.get(userId);

        if (lastUsed && (now - lastUsed < COOLDOWN_MS)) {
            const timeLeft = COOLDOWN_MS - (now - lastUsed);
            const minutes = Math.floor(timeLeft / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            let timeString = '';
            if (minutes > 0) timeString += `${minutes} minute(s) `;
            if (seconds > 0) timeString += `${seconds} second(s) `;
            timeString = timeString.trim();

            return replyFunction(`${username}, you can beg again in ${timeString}.`);
        }

        try {
            const reward = Math.floor(Math.random() * (MAX_BEG_REWARD - MIN_BEG_REWARD + 1)) + MIN_BEG_REWARD;
            const newBalance = await coinManager.addCoins(userId, reward);
            begCooldowns.set(userId, now); // Update last used timestamp

            await replyFunction(`🙏 ${username}, you begged and received ${reward} 💰! Your new balance is ${newBalance} 💰.`);
        } catch (error) {
            console.error(`Error in beg command for ${username}:`, error);
            await replyFunction(`Sorry ${username}, there was an error while begging: ${error.message}`);
        }
    },

    async prefixExecute(message, args) {
        const userId = message.author.id;
        const username = message.author.username;
        await this.executeCommand(userId, username, (content) => message.channel.send(content));
    },

    async slashExecute(interaction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;
        await this.executeCommand(userId, username, (content) => interaction.followUp({ content, ephemeral: false }));
    },
});
