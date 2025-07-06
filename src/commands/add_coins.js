// src/commands/add_coins.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

/**
 * Factory function to create the add_coins command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @param {import('discord.js').Client} client The Discord client instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager, client) => ({
    name: 'add_coins',
    description: 'Adds coins to a user\'s balance (Admin only).',
    slashCommandData: new SlashCommandBuilder()
        .setName('add_coins')
        .setDescription('Adds coins to a user\'s balance (Admin only).')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to add coins to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of coins to add')
                .setRequired(true)
                .setMinValue(1)),

    async executeCommand(executorId, targetId, targetUsername, amount, interactionOrMessage) {
        // Check if the executor is the bot owner (replace with your actual bot owner ID)
        const botOwnerId = process.env.BOT_OWNER_ID;
        if (executorId !== botOwnerId) {
            if (interactionOrMessage.followUp) {
                return interactionOrMessage.followUp({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
            } else {
                return interactionOrMessage.channel.send('You do not have permission to use this command.');
            }
        }

        try {
            const newBalance = await coinManager.addCoins(targetId, amount);
            const responseMessage = `💰 Successfully added **${amount}** coins to **${targetUsername}**. New balance: **${newBalance}** 💰.`;

            if (interactionOrMessage.followUp) {
                await interactionOrMessage.followUp(responseMessage);
            } else {
                await interactionOrMessage.channel.send(responseMessage);
            }
        } catch (error) {
            console.error(`Error adding coins to ${targetUsername}:`, error);
            const errorMessage = `Failed to add coins: ${error.message}`;
            if (interactionOrMessage.followUp) {
                await interactionOrMessage.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
            } else {
                await interactionOrMessage.channel.send(errorMessage);
            }
        }
    },

    async prefixExecute(message, args) {
        const targetUser = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!targetUser || isNaN(amount) || amount <= 0) {
            return message.channel.send('Usage: `$add_coins <@user> <amount>`. Amount must be a positive number.');
        }

        await this.executeCommand(message.author.id, targetUser.id, targetUser.username, amount, message);
    },

   async slashExecute(interaction) {
    try {
        // Defer reply first to prevent "Unknown interaction" error
        // Use flags: 0 for public replies, or MessageFlags.Ephemeral for private replies
        await interaction.deferReply({ flags: 0 }); // Adjust flags based on whether the command's primary response should be public or private
    } catch (deferError) {
        console.error(`Failed to defer reply for /${interaction.commandName}:`, deferError);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Sorry, I took too long to respond. Please try again.', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to send timeout error:", e));
        }
        return; // Stop execution if deferral failed
    }
        const targetUser = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');

        await this.executeCommand(interaction.user.id, targetUser.id, targetUser.username, amount, interaction);
    },
});
