// src/commands/daily.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { DAILY_REWARD, DAILY_COOLDOWN_MS } = require('../config/gameConfig');

const dailyCooldowns = new Map(); // Stores userId -> lastUsedTimestamp

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

    async executeCommand(userId, username, replyFunction) { // replyFunction here is a generic callback for prefix
        const now = Date.now();
        const lastUsed = dailyCooldowns.get(userId);

        if (lastUsed && (now - lastUsed < DAILY_COOLDOWN_MS)) {
            const timeLeft = DAILY_COOLDOWN_MS - (now - lastUsed);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            let timeString = '';
            if (hours > 0) timeString += `${hours} hour(s) `;
            if (minutes > 0) timeString += `${minutes} minute(s) `;
            if (seconds > 0) timeString += `${seconds} second(s) `;
            timeString = timeString.trim();

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
        try {
            // Defer reply first
            await interaction.deferReply({ flags: 0 }); // Daily command should be public
        } catch (deferError) {
            console.error(`Failed to defer reply for /${interaction.commandName}:`, deferError);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Sorry, I took too long to respond. Please try again.', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to send timeout error:", e));
            }
            return;
        }

        const userId = interaction.user.id;
        const username = interaction.user.username;
        const now = Date.now();
        const lastUsed = dailyCooldowns.get(userId);

        if (lastUsed && (now - lastUsed < DAILY_COOLDOWN_MS)) {
            const timeLeft = DAILY_COOLDOWN_MS - (now - lastUsed);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            let timeString = '';
            if (hours > 0) timeString += `${hours} hour(s) `;
            if (minutes > 0) timeString += `${minutes} minute(s) `;
            if (seconds > 0) timeString += `${seconds} second(s) `;
            timeString = timeString.trim();

            return interaction.followUp({ content: `${username}, you can claim your daily coins again in ${timeString}.`, flags: MessageFlags.Ephemeral });
        }

        try {
            const newBalance = await coinManager.addCoins(userId, DAILY_REWARD);
            dailyCooldowns.set(userId, now); // Update last used timestamp
            await interaction.followUp(`🎉 ${username}, you claimed your daily **${DAILY_REWARD}** 💰! Your new balance is **${newBalance}** 💰.`);
        } catch (error) {
            console.error(`Error in /daily command for ${username}:`, error);
            await interaction.followUp({ content: `Sorry ${username}, there was an error claiming your daily coins: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },
});
