// src/commands/bank_withdraw.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
// Cooldown constant no longer needed here
// const { BANK_TOGGLE_COOLDOWN_MS } = require('../config/gameConfig');

// Cooldown map no longer needed here
// const bankToggleCooldowns = new Map();

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
        // No cooldown check for withdraw

        try {
            const userData = await coinManager.getUserData(userId);
            if (!userData.isBanked) {
                return interaction.followUp({ content: `${username}, you are not currently in safe mode.`, flags: MessageFlags.Ephemeral });
            }

            await coinManager.setBankedStatus(userId, false);
            // No need to set cooldown in Map or Firestore for withdraw

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
