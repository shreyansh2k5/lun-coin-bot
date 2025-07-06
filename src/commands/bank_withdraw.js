// src/commands/bank_withdraw.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = (coinManager) => {
  const executeCommand = async (userId, username, interaction) => {
    try {
      const userData = await coinManager.getUserData(userId);
      if (!userData.isBanked) {
        return interaction.editReply({
          content: `${username}, you are not currently in safe mode.`,
          flags: MessageFlags.Ephemeral
        });
      }

      await coinManager.setBankedStatus(userId, false);

      await interaction.editReply({
        content: `🔓 **${username}**, you have deactivated safe mode. You can now be raided and raid others.`,
        flags: MessageFlags.Ephemeral
      });

    } catch (error) {
      console.error(`Error in bank_withdraw command for ${username}:`, error);
      await interaction.editReply({
        content: `❌ An error occurred while deactivating safe mode: ${error.message}`,
        flags: MessageFlags.Ephemeral
      });
    }
  };

  return {
    name: 'bank_withdraw',
    description: 'Deactivate safe mode. You can now be raided and raid others.',
    slashCommandData: new SlashCommandBuilder()
      .setName('bank_withdraw')
      .setDescription('Deactivate safe mode. You can now be raided and raid others.'),

    async prefixExecute(message, args) {
      return message.channel.send('The `$bank_withdraw` command is only available as a slash command (`/bank_withdraw`).');
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
  };
};
