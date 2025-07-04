// src/commands/help.js
const { SlashCommandBuilder } = require('discord.js');

/**
 * Factory function to create the help command.
 * Needs access to other registered commands to list them.
 * @param {Map<string, object>} prefixCommandsMap A map of all registered prefix commands.
 * @param {Array<object>} slashCommandsDataArray An array of all registered slash command data.
 * @returns {object} The command object.
 */
module.exports = (prefixCommandsMap, slashCommandsDataArray) => ({
    name: 'help',
    description: 'Explains all commands, activities, and games.',
    slashCommandData: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Explains all commands, activities, and games.'),

    async prefixExecute(message, args) {
        const helpMessage = this.generateHelpMessage(prefixCommandsMap, slashCommandsDataArray);
        await message.channel.send(helpMessage);
    },

    async slashExecute(interaction) {
        const helpMessage = this.generateHelpMessage(prefixCommandsMap, slashCommandsDataArray);
        await interaction.followUp({ content: helpMessage, ephemeral: false }); // Can be ephemeral: true for private help
    },

    generateHelpMessage(prefixCommandsMap, slashCommandsDataArray) {
        let msg = '**__Lun Coin Bot Commands & Activities__**\n\n';
        msg += 'This bot allows users to earn and spend coins through various activities.\n\n';

        msg += '**Prefix Commands (Start with `$`)**:\n';
        prefixCommandsMap.forEach(cmd => {
            msg += `\`$${cmd.name}\` - ${cmd.description || 'No description provided.'}\n`;
        });

        msg += '\n**Slash Commands (Start with `/`)**:\n';
        slashCommandsDataArray.forEach(cmdData => {
            msg += `\`/${cmdData.name}\` - ${cmdData.description || 'No description provided.'}\n`;
        });

        msg += '\n**Games & Activities**:\n';
        msg += '💰 **Coin System**: Earn, lose, and transfer coins.\n';
        msg += '🎲 **`/flip <amount>`**: 50% chance to double your coins or lose them all.\n';
        msg += '🎰 **`/roll <amount>`**: Roll a dice, multiply your coins by 6 times if you win, or lose all.\n';
        msg += '📅 **`/daily`**: Get 5000 coins once every 24 hours.\n';
        msg += '乞 **`/beg`**: Get 1-1000 coins, usable every 5 minutes.\n';

        msg += '\n*More games and activities coming soon!*';
        return msg;
    }
});
