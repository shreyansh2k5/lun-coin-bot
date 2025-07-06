// src/commands/bank_deposit.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { BANK_DEPOSIT_COOLDOWN_MS } = require('../config/gameConfig');
const admin = require('firebase-admin');

module.exports = (coinManager) => ({
  name: 'bank_deposit',
  description: 'Activate safe mode. You cannot be raided and cannot raid others for 24 hours.',
  slashCommandData: new SlashCommandBuilder()
    .setName('bank_deposit')
    .setDescription('Activate safe mode. You cannot be raided and cannot raid others for 24 hours.'),

  async executeCommand(userId, username, interaction) {
    const now = Date.now();

    try {
      const userData = await coinManager.getUserData(userId);
      const lastDeposited = userData.lastBankDeposit;

      const lastDepositedMs = lastDeposited instanceof admin.firestore.Timestamp
        ? lastDeposited.toMillis()
        : lastDeposited;

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

        return await interaction.editReply({
          content: `⏳ You can deposit again in ${timeString}.`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (userData.isBanked) {
        return await interaction.editReply({
          content: `${username}, you are already in safe mode!`,
          flags: MessageFlags.Ephemeral
        });
      }

      await coinManager.setBankedStatus(userId, true);

      await interaction.editReply({
        content: `🏦 **${username}**, you have activated safe mode! You are now safe from raids and cannot raid others. Use \`/bank_withdraw\` to deactivate.`,
        flags: MessageFlags.Ephemeral
      });

    } catch (error) {
      console.error(`Error in bank_deposit command for ${username}:`, error);
      await interaction.editReply({
        content: `❌ An error occurred while activating safe mode: ${error.message}`,
        flags: MessageFlags.Ephemeral
      });
    }
  },

  async prefixExecute(message, args) {
    return message.channel.send('The `$bank_deposit` command is only available as a slash command (`/bank_deposit`).');
  },

  async slashExecute(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true }); // ✅ Correct way to defer with ephemeral

    const userId = interaction.user.id;
    const username = interaction.user.username;

    await executeCommand(userId, username, interaction);
  } catch (err) {
    console.error(`Failed to handle /${interaction.commandName}:`, err);

    if (!interaction.deferred && !interaction.replied) {
      try {
        await interaction.reply({
          content: "⚠️ I took too long to respond. Please try again.",
          ephemeral: true
        });
      } catch (replyError) {
        console.error("Failed to send fallback error:", replyError);
      }
    }
  }
}
});
