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
            .setTitle('📚 Bot Commands 📚')
            .setDescription('Here are all the commands you can use:')
            .setTimestamp()
            .setFooter({ text: 'Lun Coin Bot Help' });

        // Prefix Commands
        let prefixCmds = '';
        prefixCommands.forEach(cmd => {
            if (cmd.prefixExecute) { // Only list commands that actually have a prefix executor
                prefixCmds += `\`$${cmd.name}\` - ${cmd.description}\n`;
            }
        });
        if (prefixCmds) {
            helpEmbed.addFields({ name: 'Prefix Commands', value: prefixCmds, inline: false });
        }

        // Slash Commands
        let slashCmds = '';
        slashCommands.forEach(cmd => {
            if (cmd.slashExecute) { // Only list commands that actually have a slash executor
                slashCmds += `\`/${cmd.name}\` - ${cmd.description}\n`;
            }
        });
        if (slashCmds) {
            helpEmbed.addFields({ name: 'Slash Commands', value: slashCmds, inline: false });
        }

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
