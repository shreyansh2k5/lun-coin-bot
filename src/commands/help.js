// src/commands/help.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

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

        // Commands Section
        let commandsList = '';
        const excludedCommands = ['add_coins', 'deduct_coins']; // Commands to exclude from public help

        // Iterate through all registered prefix commands
        prefixCommands.forEach(cmd => {
            if (cmd.prefixExecute && !excludedCommands.includes(cmd.name)) {
                commandsList += `\`$${cmd.name}\` - ${cmd.description}\n`;
            }
        });

        // Iterate through all registered slash commands (ensure no duplicates if both prefix/slash exist)
        slashCommands.forEach(cmd => {
            // Only add if it's a slash command and not already added via prefix, and not excluded
            if (cmd.slashExecute && !commandsList.includes(`\`/${cmd.name}\``) && !excludedCommands.includes(cmd.name)) {
                 commandsList += `\`/${cmd.name}\` - ${cmd.description}\n`;
            }
        });

        if (commandsList) {
            helpEmbed.addFields({ name: 'Commands', value: commandsList, inline: false });
        }

        // Games & Activities Section (Manual listing for better formatting as per image)
        const gamesActivities = `
**Coin System:** Earn, lose, and transfer coins.
\`/flip <amount>\` / \`$flip <amount>\`: 50% chance to double your coins or lose them all.
\`/roll <amount>\` / \`$roll <amount>\`: Roll a dice, multiply your coins by 6 times if you win, or lose all.
\`/daily\` / \`$daily\`: Get ${process.env.DAILY_REWARD || '5000'} 💰 once every 24 hours.
\`/beg\` / \`$beg\`: Get ${process.env.MIN_BEG_REWARD || '1'}-${process.env.MAX_BEG_REWARD || '1000'} 💰, usable every 5 minutes.
\`/leaderboard\` / \`$leaderboard\`: See the top coin holders on the server.
\`/raid <@user>\`: Attempt to raid another user and steal their coins, or lose some of yours!
\`/bank_deposit\`: Activate safe mode. You cannot be raided and cannot raid others for 24 hours.
\`/bank_withdraw\`: Deactivate safe mode. You can now be raided and raid others.
\`/shop\`: Browse and buy pets!
`;
        helpEmbed.addFields({ name: 'Games & Activities', value: gamesActivities, inline: false });
        helpEmbed.setDescription(helpEmbed.description + "\n\nMore games and activities coming soon!"); // Add "More games..." line

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
