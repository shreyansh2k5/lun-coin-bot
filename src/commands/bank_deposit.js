// src/commands/bank_deposit.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { BANK_DEPOSIT_COOLDOWN_MS } = require('../config/gameConfig');
const admin = require('firebase-admin'); // Import admin for Timestamp check

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

    async executeCommand(userId, username, interaction) {
        // Defer reply is handled by slashExecute, so no need to defer here again
        const now = Date.now();

        try {
            const userData = await coinManager.getUserData(userId);
            const lastDeposited = userData.lastBankDeposit; // Get last deposit timestamp from Firestore

            // Cooldown check for deposit using Firestore timestamp
            // lastDeposited can be a Firestore Timestamp object or a number (if it was from Date.now())
            // Convert to milliseconds if it's a Firestore Timestamp
            const lastDepositedMs = lastDeposited instanceof admin.firestore.Timestamp ? lastDeposited.toMillis() : lastDeposited;


            if (lastDepositedMs && (now - lastDepositedMs < BANK_DEPOSIT_COOLDOWN_MS)) {
                const timeLeft = BANK_DEPOSIT_COOLDOWN_MS - (now - lastDepositedMs);
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

                let timeString = '';
                if (hours > 0) timeString += `${hours} hour(s) `;
                if (minutes > 0) timeString += `${minutes} minute(s) `;
                if (seconds > 0) timeString += `${seconds} second(s) `;
                timeString = timeString.trim();

                return interaction.followUp({ content: `You can deposit (activate safe mode) again in ${timeString}.`, flags: MessageFlags.Ephemeral });
            }

            if (userData.isBanked) {
                return interaction.followUp({ content: `${username}, you are already in safe mode!`, flags: MessageFlags.Ephemeral });
            }

            // setBankedStatus will update the lastBankDeposit timestamp in Firestore
            await coinManager.setBankedStatus(userId, true);

            await interaction.followUp({ content: `🏦 **${username}**, you have activated safe mode! You are now safe from raids and cannot raid others. You can use \`/bank_withdraw\` anytime to deactivate.`, flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error(`Error in bank_deposit command for ${username}:`, error);
            await interaction.followUp({ content: `Sorry ${username}, an error occurred while activating safe mode: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },

    async prefixExecute(message, args) {
        return message.channel.send('The `$bank_deposit` command is only available as a slash command (`/bank_deposit`).');
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
