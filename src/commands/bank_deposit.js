// src/commands/bank_deposit.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { BANK_DEPOSIT_COOLDOWN_MS } = require('../config/gameConfig');
const admin = require('firebase-admin');

module.exports = (coinManager) => {
  return {
    name: 'bank_deposit',
    description: 'Activate safe mode. You cannot be raided and cannot raid others for 24 hours.',
    slashCommandData: new SlashCommandBuilder()
      .setName('bank_deposit')
      .setDescription('Activate safe mode. You cannot be raided and cannot raid others for 24 hours.'),

    prefixExecute: async (message) => {
      return message.reply('Use the slash command `/bank_deposit` instead.');
    },

    slashExecute: async (interaction) => {
      const userId = interaction.user.id;
      const username = interaction.user.username;

      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const now = Date.now();
        const userData = await coinManager.getUserData(userId);

        // Convert Firestore Timestamp to millis
        const lastDepositedMs = userData.lastBankDeposit instanceof admin.firestore.Timestamp
          ? userData.lastBankDeposit.toMillis()
          : (typeof userData.lastBankDeposit === 'number' ? userData.lastBankDeposit : 0);

        const timeSinceLastDeposit = now - lastDepositedMs;
        const timeLeft = BANK_DEPOSIT_COOLDOWN_MS - timeSinceLastDeposit;

        if (timeLeft > 0) {
          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

          let timeString = '';
          if (hours > 0) timeString += `${hours} hour(s) `;
          if (minutes > 0) timeString += `${minutes} minute(s) `;
          if (seconds > 0) timeString += `${seconds} second(s) `;
          timeString = timeString.trim();

          return await interaction.editReply({
            content: `⏳ You can deposit again in ${timeString}.`,
            flags: MessageFlags.Ephemeral
          });
        }

        if (userData.isBanked) {
          return await interaction.editReply({
            content: `⚠️ ${username}, you are already in safe mode!`,
            flags: MessageFlags.Ephemeral
          });
        }

        // ✅ Set banked status and lastBankDeposit
        await coinManager.setBankedStatus(userId, true);

        return await interaction.editReply({
          content: `✅ **${username}**, safe mode activated! You can't be raided and cannot raid others for 24 hours. Use \`/bank_withdraw\` to exit safe mode.`,
          flags: MessageFlags.Ephemeral
        });

      } catch (error) {
        console.error(`Error in /bank_deposit for ${username}:`, error);
        if (!interaction.replied) {
          try {
            await interaction.editReply({
              content: `❌ Error while processing your deposit: ${error.message}`,
              flags: MessageFlags.Ephemeral
            });
          } catch (e) {
            console.error("Failed to send fallback error message:", e);
          }
        }
      }
    }
  };
};
