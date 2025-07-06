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
        const allCommands = [];
        const processedCommandNames = new Set(); // To avoid duplicates if a command is both prefix and slash

        // Collect all prefix commands
        prefixCommands.forEach(cmd => {
            if (!excludedCommands.includes(cmd.name) && !processedCommandNames.has(cmd.name)) {
                const hasPrefix = typeof cmd.prefixExecute === 'function';
                const hasSlash = typeof cmd.slashExecute === 'function';
                let cmdLine = '';

                if (hasPrefix && hasSlash) {
                    cmdLine = `**\`/${cmd.name}\` / \`$${cmd.name}\`** - ${cmd.description}`;
                } else if (hasPrefix) {
                    cmdLine = `**\`$${cmd.name}\`** - ${cmd.description}`;
                }
                // Slash-only commands will be caught in the next loop if not already added

                if (cmdLine) {
                    allCommands.push(cmdLine);
                    processedCommandNames.add(cmd.name);
                }
            }
        });

        // Collect any slash-only commands that weren't caught by prefixCommands iteration
        slashCommands.forEach(cmd => {
            if (!excludedCommands.includes(cmd.name) && !processedCommandNames.has(cmd.name)) {
                const cmdLine = `**\`/${cmd.name}\`** - ${cmd.description}`;
                allCommands.push(cmdLine);
                processedCommandNames.add(cmd.name);
            }
        });

        // Sort commands alphabetically for consistent display
        allCommands.sort();

        let currentCommandsValue = '';
        let fieldCount = 0;
        const maxFieldLength = 1000; // Keep slightly under 1024 to be safe

        for (const cmdLine of allCommands) {
            const lineToAdd = cmdLine + '\n';
            if ((currentCommandsValue + lineToAdd).length <= maxFieldLength) {
                currentCommandsValue += lineToAdd;
            } else {
                if (currentCommandsValue) { // Add the current field if it's not empty
                    helpEmbed.addFields({ name: `Commands${fieldCount > 0 ? ` (Cont.)` : ''}`, value: currentCommandsValue, inline: false });
                    fieldCount++;
                }
                currentCommandsValue = lineToAdd; // Start new field with the current line
            }
        }
        // Add any remaining commands in the last field
        if (currentCommandsValue) {
            helpEmbed.addFields({ name: `Commands${fieldCount > 0 ? ` (Cont.)` : ''}`, value: currentCommandsValue, inline: false });
        }


        // --- Games & Activities Section (Manual listing for better formatting as per image) ---
        // Ensure backticks are correct for combined commands
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
