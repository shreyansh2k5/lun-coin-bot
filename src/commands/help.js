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

        // --- Unified Commands Section ---
        let allCommandsValue = '';
        const processedCommandNames = new Set(); // To avoid duplicates if a command is both prefix and slash

        // Iterate through all registered prefix commands first
        prefixCommands.forEach(cmd => {
            if (!excludedCommands.includes(cmd.name) && !processedCommandNames.has(cmd.name)) {
                let cmdLine = '';
                const hasPrefix = typeof cmd.prefixExecute === 'function';
                const hasSlash = typeof cmd.slashExecute === 'function';

                if (hasPrefix && hasSlash) {
                    cmdLine = `**\`/${cmd.name}\` / \`$${cmd.name}\`** - ${cmd.description}\n`;
                } else if (hasPrefix) {
                    cmdLine = `**\`$${cmd.name}\`** - ${cmd.description}\n`;
                } else if (hasSlash) { // Should ideally be covered by slashCommands iteration, but for completeness
                    cmdLine = `**\`/${cmd.name}\`** - ${cmd.description}\n`;
                }

                if (cmdLine && (allCommandsValue + cmdLine).length <= 1024) { // Check length limit
                    allCommandsValue += cmdLine;
                    processedCommandNames.add(cmd.name);
                } else if (cmdLine) {
                    console.warn(`Commands list too long for single field. Truncating.`);
                }
            }
        });

        // Add any slash-only commands that weren't caught by prefixCommands iteration
        slashCommands.forEach(cmd => {
            if (!excludedCommands.includes(cmd.name) && !processedCommandNames.has(cmd.name)) {
                const cmdLine = `**\`/${cmd.name}\`** - ${cmd.description}\n`;
                if ((allCommandsValue + cmdLine).length <= 1024) { // Check length limit
                    allCommandsValue += cmdLine;
                    processedCommandNames.add(cmd.name);
                } else {
                    console.warn(`Commands list too long for single field. Truncating.`);
                }
            }
        });


        if (allCommandsValue) {
            helpEmbed.addFields({ name: 'Commands', value: allCommandsValue, inline: false });
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
