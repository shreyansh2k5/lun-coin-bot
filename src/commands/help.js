// src/commands/help.js
const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js'); // Import EmbedBuilder

/**
 * Factory function to create the help command.
 * Needs access to other registered commands to list them.
 * @param {Map<string, object>} prefixCommandsMap A map of all registered prefix commands.
 * @param {Array<object>} slashCommandsDataArray An array of all registered slash command data.
 * @param {Map<string, object>} slashCommandsMap A map of all registered slash commands (for descriptions).
 * @returns {object} The command object.
 */
module.exports = (prefixCommandsMap, slashCommandsDataArray, slashCommandsMap) => ({
    name: 'help',
    description: 'Explains all commands, activities, and games.',
    slashCommandData: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Explains all commands, activities, and games.'),

    async prefixExecute(message, args) {
        const helpEmbed = this.generateHelpEmbed(prefixCommandsMap, slashCommandsDataArray, slashCommandsMap);
        await message.channel.send({ embeds: [helpEmbed] });
    },

    async slashExecute(interaction) {
        const helpEmbed = this.generateHelpEmbed(prefixCommandsMap, slashCommandsDataArray, slashCommandsMap);
        await interaction.followUp({ embeds: [helpEmbed], flags: 0 });
    },

    generateHelpEmbed(prefixCommandsMap, slashCommandsDataArray, slashCommandsMap) {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF) // A nice blue color
            .setTitle('__Lun Coin Bot Commands & Activities__')
            .setDescription('This bot allows users to earn and spend coins through various activities.')
            .setTimestamp()
            .setFooter({ text: 'More games and activities coming soon!' });

        // --- Regular Commands ---
        let regularCommandsField = '';
        const processedCommands = new Set(); // To avoid duplicates if prefix and slash names are same

        // Add prefix commands
        prefixCommandsMap.forEach(cmd => {
            if (!cmd.description.includes('[ADMIN]')) { // Exclude admin commands
                regularCommandsField += `\`$${cmd.name}\` - ${cmd.description || 'No description provided.'}\n`;
                processedCommands.add(cmd.name);
            }
        });

        // Add slash commands that haven't been added yet (if their names are unique)
        slashCommandsDataArray.forEach(cmdData => {
            const cmd = slashCommandsMap.get(cmdData.name); // Get the full command object
            if (cmd && !cmd.description.includes('[ADMIN]') && !processedCommands.has(cmdData.name)) {
                regularCommandsField += `\`/${cmdData.name}\` - ${cmd.description || 'No description provided.'}\n`;
                processedCommands.add(cmdData.name);
            }
        });

        if (regularCommandsField) {
            embed.addFields({ name: 'Commands', value: regularCommandsField, inline: false });
        }

        // --- Games & Activities ---
        let gamesActivitiesField = '';
        gamesActivitiesField += '💰 **Coin System**: Earn, lose, and transfer coins.\n';
        gamesActivitiesField += '🎲 **`/flip <amount>` / `$flip <amount>`**: 50% chance to double your coins or lose them all.\n';
        gamesActivitiesField += '🎰 **`/roll <amount>` / `$roll <amount>`**: Roll a dice, multiply your coins by 6 times if you win, or lose all.\n';
        gamesActivitiesField += '📅 **`/daily` / `$daily`**: Get **5000** 💰 once every 24 hours.\n';
        gamesActivitiesField += '乞 **`/beg` / `$beg`**: Get **1-1000** 💰, usable every 5 minutes.\n';
        gamesActivitiesField += '🏆 **`/leaderboard` / `$leaderboard`**: See the top coin holders on the server.\n'; // NEW

        embed.addFields({ name: 'Games & Activities', value: gamesActivitiesField, inline: false });

        return embed;
    }
});
