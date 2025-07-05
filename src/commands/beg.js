// src/commands/beg.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { MIN_BEG_REWARD, MAX_BEG_REWARD, BEG_COOLDOWN_MS } = require('../config/gameConfig'); //

const begCooldowns = new Map(); // Stores userId -> lastUsedTimestamp

// const MIN_BEG_REWARD = 1; // Removed
// const MAX_BEG_REWARD = 1000; // Removed
// const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes in milliseconds // Removed

/**
 * Factory function to create the beg command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'beg',
    description: `Beg for coins! Get ${MIN_BEG_REWARD}-${MAX_BEG_REWARD} coins every 5 minutes.`, //
    slashCommandData: new SlashCommandBuilder()
        .setName('beg')
        .setDescription(`Beg for coins! Get ${MIN_BEG_REWARD}-${MAX_BEG_REWARD} coins every 5 minutes.`), //

    async executeCommand(userId, username, replyFunction) {
        const now = Date.now();
        const lastUsed = begCooldowns.get(userId);

        if (lastUsed && (now - lastUsed < BEG_COOLDOWN_MS)) { //
            const timeLeft = BEG_COOLDOWN_MS - (now - lastUsed); //
            const minutes = Math.floor(timeLeft / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            let timeString = '';
            if (minutes > 0) timeString += `${minutes} minute(s) `;
            if (seconds > 0) timeString += `${seconds} second(s) `;
            timeString = timeString.trim();

            // Use flags: MessageFlags.Ephemeral for ephemeral replies in slash commands
            return replyFunction(`${username}, you can beg again in ${timeString}.`, true); // Pass true for ephemeral
        }

        try {
            const reward = Math.floor(Math.random() * (MAX_BEG_REWARD - MIN_BEG_REWARD + 1)) + MIN_BEG_REWARD; //
            const newBalance = await coinManager.addCoins(userId, reward);
            begCooldowns.set(userId, now); // Update last used timestamp

            await replyFunction(`🙏 ${username}, you begged and received **${reward}** 💰! Your new balance is **${newBalance}** 💰.`); // Bold coins
        } catch (error) {
            console.error(`Error in beg command for ${username}:`, error);
            await replyFunction(`Sorry ${username}, there was an error while begging: ${error.message}`, true); // Pass true for ephemeral
        }
    },

    async prefixExecute(message, args) {
        const userId = message.author.id;
        const username = message.author.username;
        await this.executeCommand(userId, username, (content, ephemeral) => message.channel.send(content)); // Prefix commands don't use ephemeral
    },

    async slashExecute(interaction) {
        await interaction.deferReply({ ephemeral: false });
        const userId = interaction.user.id;
        const username = interaction.user.username;
        await this.executeCommand(userId, username, (content, ephemeral) => interaction.followUp({ content, flags: ephemeral ? MessageFlags.Ephemeral : 0 }));
    },
});
