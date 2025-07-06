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
      return message.reply('The `$bank_deposit` command is only available as a slash command.');
    },

    slashExecute: async (interaction) => {
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const userId = interaction.user.id;
        const username = interaction.user.username;
        const now = Date.now();

        const userData = await coinManager.getUserData(userId);
        const lastDeposited = userData.lastBankDeposit;

        const lastMs = lastDeposited instanceof admin.firestore.Timestamp
          ? lastDeposited.toMillis()
          : lastDeposited;

        if (lastMs && (now - lastMs < BANK_DEPOSIT_COOLDOWN_MS)) {
          const timeLeft = BANK_DEPOSIT_COOLDOWN_MS - (now - lastMs);
          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          let timeStr = `${hours}h ${minutes}m ${seconds}s`.trim();

          return await interaction.editReply({
            content: `⏳ You can deposit again in ${timeStr}.`,
            flags: MessageFlags.Ephemeral
          });
        }

        if (userData.isBanked) {
          return await interaction.editReply({
            content: `⚠️ ${username}, you are already in safe mode.`,
            flags: MessageFlags.Ephemeral
          });
        }

        // ✅ Sets both isBanked + lastBankDeposit timestamp
        await coinManager.setBankedStatus(userId, true);

        await interaction.editReply({
          content: `🏦 **${username}**, safe mode activated! You are now safe from raids and cannot raid others. Use \`/bank_withdraw\` to disable.`,
          flags: MessageFlags.Ephemeral
        });

      } catch (error) {
        console.error('Failed to handle /bank_deposit:', error);
        if (!interaction.replied) {
          await interaction.editReply({
            content: `❌ Error while activating safe mode: ${error.message}`,
            flags: MessageFlags.Ephemeral
          }).catch(console.error);
        }
      }
    }
  };
};
