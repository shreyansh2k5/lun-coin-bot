// src/commands/help.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { DAILY_REWARD, MIN_BEG_REWARD, MAX_BEG_REWARD } = require('../config/gameConfig'); // Import from gameConfig

/**
 * Factory function to create the help command.
 * @param {Collection} prefixCommands The collection of prefix commands.
 * @param {Array} slashCommandsData The array of slash command data.
 * @param {Collection} slashCommands The collection of slash command objects.
 * @returns {object} The command object.
 */
module.exports = (prefixCommands, slashCommandsData, slashCommands) => ({
    name: 'help',
    description: 'Lists all available commands.',
    slashCommandData: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Lists all available commands.'),

    async executeCommand(interactionOrMessage) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF) // Blue color
            .setTitle('📚 Lun Coin Bot Commands & Activities 📚') // Updated title
            .setDescription('This bot allows users to earn and spend coins through various activities.') // New description
            .setTimestamp()
            .setFooter({ text: 'Lun Coin Bot Help' });

        const excludedCommands = ['add_coins', 'deduct_coins']; // Commands to exclude from public help

        // --- Prefix Commands Section ---
        let prefixCmdsValue = '';
        prefixCommands.forEach(cmd => {
            if (cmd.prefixExecute && !excludedCommands.includes(cmd.name)) {
                const cmdLine = `\`$${cmd.name}\` - ${cmd.description}\n`;
                if ((prefixCmdsValue + cmdLine).length <= 1024) { // Check length limit
                    prefixCmdsValue += cmdLine;
                } else {
                    // If it exceeds, we could add another field, but for simplicity, we'll just stop
                    // For now, assume it fits. If it still errors, we'd need multiple fields.
                    console.warn(`Prefix commands list too long for single field. Truncating.`);
                }
            }
        });

        if (prefixCmdsValue) {
            helpEmbed.addFields({ name: 'Prefix Commands', value: prefixCmdsValue, inline: false });
        }

        // --- Slash Commands Section ---
        let slashCmdsValue = '';
        slashCommands.forEach(cmd => {
            if (cmd.slashExecute && !excludedCommands.includes(cmd.name)) {
                const cmdLine = `\`/${cmd.name}\` - ${cmd.description}\n`;
                if ((slashCmdsValue + cmdLine).length <= 1024) { // Check length limit
                    slashCmdsValue += cmdLine;
                } else {
                    // If it exceeds, we could add another field, but for simplicity, we'll just stop
                    // For now, assume it fits. If it still errors, we'd need multiple fields.
                    console.warn(`Slash commands list too long for single field. Truncating.`);
                }
            }
        });

        if (slashCmdsValue) {
            helpEmbed.addFields({ name: 'Slash Commands', value: slashCmdsValue, inline: false });
        }


        // --- Games & Activities Section (Manual listing for better formatting as per image) ---
        const gamesActivities = `
**Coin System:** Earn, lose, and transfer coins.
\` /flip <amount>\` / \`$flip <amount>\`: 50% chance to double your coins or lose them all.
\` /roll <amount>\` / \`$roll <amount>\`: Roll a dice, multiply your coins by 6 times if you win, or lose all.
\` /daily\` / \`$daily\`: Get **${DAILY_REWARD}** 💰 once every 24 hours.
\` /beg\` / \`$beg\`: Get **${MIN_BEG_REWARD}**-**${MAX_BEG_REWARD}** 💰, usable every 5 minutes.
\` /leaderboard\` / \`$leaderboard\`: See the top coin holders on the server.
\` /raid <@user>\`: Attempt to raid another user and steal their coins, or lose some of yours!
\` /bank_deposit\`: Activate safe mode. You cannot be raided and cannot raid others for 24 hours.
\` /bank_withdraw\`: Deactivate safe mode. You can now be raided and raid others.
\` /shop\`: Browse and buy pets!
`;
        helpEmbed.addFields({ name: 'Games & Activities', value: gamesActivities, inline: false });
        helpEmbed.setDescription(helpEmbed.description + "\n\nMore games and activities coming soon!");

        if (interactionOrMessage.followUp) {
            await interactionOrMessage.followUp({ embeds: [helpEmbed] });
        } else {
            await interactionOrMessage.channel.send({ embeds: [helpEmbed] });
        }
    },

    async prefixExecute(message, args) {
        await this.executeCommand(message);
    },

    async slashExecute(interaction) {
        try {
            // Defer reply first
            await interaction.deferReply({ flags: 0 }); // Help should be public
        } catch (deferError) {
            console.error(`Failed to defer reply for /${interaction.commandName}:`, deferError);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Sorry, I took too long to respond. Please try again.', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to send timeout error:", e));
            }
            return;
        }
        await this.executeCommand(interaction);
    },
});
