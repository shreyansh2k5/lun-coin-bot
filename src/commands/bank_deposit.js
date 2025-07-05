// src/commands/bank_deposit.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { BANK_TOGGLE_COOLDOWN_MS } = require('../config/gameConfig');

const bankToggleCooldowns = new Map(); // Stores userId -> lastUsedTimestamp for bank toggle

/**
 * Factory function to create the bank_deposit command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'bank_deposit',
    description: 'Activate safe mode. You cannot be raided and cannot raid others for 24 hours.',
    slashCommandData: new SlashCommandBuilder()
        .setName('bank_deposit')
        .setDescription('Activate safe mode. You cannot be raided and cannot raid others for 24 hours.'),

    // Changed replyFunction to interaction for direct access
    async executeCommand(userId, username, interaction) {
        // Defer reply first
        await interaction.deferReply({ ephemeral: true });

        const now = Date.now();
        const lastUsed = bankToggleCooldowns.get(userId);

        // Cooldown check for bank toggle
        if (lastUsed && (now - lastUsed < BANK_TOGGLE_COOLDOWN_MS)) {
            const timeLeft = BANK_TOGGLE_COOLDOWN_MS - (now - lastUsed);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            let timeString = '';
            if (hours > 0) timeString += `${hours} hour(s) `;
            if (minutes > 0) timeString += `${minutes} minute(s) `;
            if (seconds > 0) timeString += `${seconds} second(s) `;
            timeString = timeString.trim();

            return interaction.followUp({ content: `You can change your safe mode status again in ${timeString}.`, flags: MessageFlags.Ephemeral });
        }

        try {
            const userData = await coinManager.getUserData(userId);
            if (userData.isBanked) {
                return interaction.followUp({ content: `${username}, you are already in safe mode!`, flags: MessageFlags.Ephemeral });
            }

            await coinManager.setBankedStatus(userId, true);
            bankToggleCooldowns.set(userId, now); // Set cooldown

            await interaction.followUp({ content: `🏦 **${username}**, you have activated safe mode! You are now safe from raids and cannot raid others. This status will last until you use \`/withdraw\` or the cooldown expires.`, flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error(`Error in bank_deposit command for ${username}:`, error);
            await interaction.followUp({ content: `Sorry ${username}, an error occurred while activating safe mode: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },

    async prefixExecute(message, args) {
        // For simplicity, this command will be slash-only.
        return message.channel.send('The `$bank_deposit` command is only available as a slash command (`/bank_deposit`).');
    },

    async slashExecute(interaction) {
        await this.executeCommand(interaction.user.id, interaction.user.username, interaction);
    },
});
