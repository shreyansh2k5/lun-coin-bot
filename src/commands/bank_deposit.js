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

      let hasDeferred = false;
      try {
        // 🟢 Always defer within 3 seconds
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        hasDeferred = true;

        const now = Date.now();
        const userData = await coinManager.getUserData(userId);

        const lastDepositedMs = userData.lastBankDeposit instanceof admin.firestore.Timestamp
          ? userData.lastBankDeposit.toMillis()
          : (typeof userData.lastBankDeposit === 'number' ? userData.lastBankDeposit : 0);

        const timeLeft = BANK_DEPOSIT_COOLDOWN_MS - (now - lastDepositedMs);
        if (timeLeft > 0) {
          const h = Math.floor(timeLeft / 3600000);
          const m = Math.floor((timeLeft % 3600000) / 60000);
          const s = Math.floor((timeLeft % 60000) / 1000);
          const timeStr = `${h ? `${h}h ` : ''}${m ? `${m}m ` : ''}${s}s`.trim();

          return await interaction.editReply({
            content: `⏳ You can deposit again in ${timeStr}.`,
            flags: MessageFlags.Ephemeral
          });
        }

        if (userData.isBanked) {
          return await interaction.editReply({
            content: `⚠️ ${username}, you're already in safe mode!`,
            flags: MessageFlags.Ephemeral
          });
        }

        await coinManager.setBankedStatus(userId, true);

        return await interaction.editReply({
          content: `✅ ${username}, safe mode is now active! You can't be raided or raid others for 24 hours.\nUse \`/bank_withdraw\` to disable safe mode.`,
          flags: MessageFlags.Ephemeral
        });

      } catch (err) {
        console.error(`Error in /bank_deposit for ${username}:`, err);

        try {
          if (hasDeferred && !interaction.replied) {
            await interaction.editReply({
              content: '❌ An error occurred. Please try again later.',
              flags: MessageFlags.Ephemeral
            });
          } else if (!hasDeferred && !interaction.replied) {
            await interaction.reply({
              content: '❌ Something went wrong before I could respond.',
              flags: MessageFlags.Ephemeral
            });
          }
        } catch (e) {
          console.error("⚠️ Failed to send fallback error:", e);
        }
      }
    }
  };
};
