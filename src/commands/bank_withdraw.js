// src/commands/bank_withdraw.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { BANK_TOGGLE_COOLDOWN_MS } = require('../config/gameConfig');

const bankToggleCooldowns = new Map(); // Stores userId -> lastUsedTimestamp for bank toggle

/**
 * Factory function to create the bank_withdraw command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'bank_withdraw',
    description: 'Deactivate safe mode. You can now be raided and raid others.',
    slashCommandData: new SlashCommandBuilder()
        .setName('bank_withdraw')
        .setDescription('Deactivate safe mode. You can now be raided and raid others.'),

    async executeCommand(userId, username, interaction) {
        // Defer reply is handled by slashExecute, so no need to defer here again
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
            if (!userData.isBanked) {
                return interaction.followUp({ content: `${username}, you are not currently in safe mode.`, flags: MessageFlags.Ephemeral });
            }

            await coinManager.setBankedStatus(userId, false);
            bankToggleCooldowns.set(userId, now); // Set cooldown

            await interaction.followUp({ content: `🔓 **${username}**, you have deactivated safe mode. You can now be raided and raid others.`, flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error(`Error in bank_withdraw command for ${username}:`, error);
            await interaction.followUp({ content: `Sorry ${username}, an error occurred while deactivating safe mode: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },

    async prefixExecute(message, args) {
        return message.channel.send('The `$bank_withdraw` command is only available as a slash command (`/bank_withdraw`).');
    },

    async slashExecute(interaction) {
        try {
            // Defer reply first
            await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // Bank commands are personal
        } catch (deferError) {
            console.error(`Failed to defer reply for /${interaction.commandName}:`, deferError);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Sorry, I took too long to respond. Please try again.', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to send timeout error:", e));
            }
            return;
        }
        await this.executeCommand(interaction.user.id, interaction.user.username, interaction);
    },
});
