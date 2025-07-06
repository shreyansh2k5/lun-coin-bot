// src/commands/bank_deposit.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { BANK_DEPOSIT_COOLDOWN_MS } = require('../config/gameConfig');
const admin = require('firebase-admin');

module.exports = (coinManager) => {
  // Main logic
  const executeCommand = async (userId, username, interaction) => {
    const now = Date.now();

    try {
      const userData = await coinManager.getUserData(userId);
      const lastDeposited = userData.lastBankDeposit;
      const lastDepositedMs = lastDeposited instanceof admin.firestore.Timestamp
        ? lastDeposited.toMillis()
        : lastDeposited;

      // ⏳ Cooldown check
      if (lastDepositedMs && now - lastDepositedMs < BANK_DEPOSIT_COOLDOWN_MS) {
        const timeLeft = BANK_DEPOSIT_COOLDOWN_MS - (now - lastDepositedMs);
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

      // Already in banked mode?
      if (userData.isBanked) {
        return await interaction.editReply({
          content: `⚠️ ${username}, you are already in safe mode!`,
          flags: MessageFlags.Ephemeral
        });
      }

      // ✅ Activate safe mode + save deposit time
      await coinManager.setBankedStatus(userId, true);

      await interaction.editReply({
        content: `🏦 **${username}**, safe mode activated! You are now protected from raids and cannot raid others.\nUse \`/bank_withdraw\` to exit safe mode.`,
        flags: MessageFlags.Ephemeral
      });

    } catch (error) {
      console.error(`Error in bank_deposit command for ${username}:`, error);
      await interaction.editReply({
        content: `❌ Error while activating safe mode: ${error.message}`,
        flags: MessageFlags.Ephemeral
      });
    }
  };

  return {
    name: 'bank_deposit',
    description: 'Activate safe mode. You cannot be raided or raid others for 24 hours.',
    slashCommandData: new SlashCommandBuilder()
      .setName('bank_deposit')
      .setDescription('Activate safe mode. You cannot be raided or raid others for 24 hours.'),

    prefixExecute: async (message) => {
      return message.channel.send('❌ This command is only available as a slash command: `/bank_deposit`');
    },

    slashExecute: async (interaction) => {
      try {
        // ✅ Defer early to prevent interaction timeout
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const username = interaction.user.username;

        await executeCommand(userId, username, interaction);
      } catch (err) {
        console.error(`Failed to handle /bank_deposit:`, err);

        if (!interaction.deferred && !interaction.replied) {
          try {
            await interaction.reply({
              content: '⚠️ I took too long to respond. Please try again.',
              ephemeral: true
            });
          } catch (replyErr) {
            console.error("Failed to send fallback error:", replyErr);
          }
        }
      }
    }
  };
};
