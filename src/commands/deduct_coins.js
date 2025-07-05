// src/commands/deduct_coins.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

/**
 * Factory function to create the deduct_coins command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @param {import('discord.js').Client} client The Discord client instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager, client) => ({
    name: 'deduct_coins',
    description: 'Deducts coins from a user\'s balance (Admin only).',
    slashCommandData: new SlashCommandBuilder()
        .setName('deduct_coins')
        .setDescription('Deducts coins from a user\'s balance (Admin only).')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to deduct coins from')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of coins to deduct')
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
            const newBalance = await coinManager.removeCoins(targetId, amount);
            const responseMessage = `💸 Successfully deducted **${amount}** coins from **${targetUsername}**. New balance: **${newBalance}** 💰.`;

            if (interactionOrMessage.followUp) {
                await interactionOrMessage.followUp(responseMessage);
            } else {
                await interactionOrMessage.channel.send(responseMessage);
            }
        } catch (error) {
            console.error(`Error deducting coins from ${targetUsername}:`, error);
            const errorMessage = `Failed to deduct coins: ${error.message}`;
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
            return message.channel.send('Usage: `$deduct_coins <@user> <amount>`. Amount must be a positive number.');
        }

        await this.executeCommand(message.author.id, targetUser.id, targetUser.username, amount, message);
    },

    async slashExecute(interaction) {
        // DEFER REPLY IS REMOVED FROM HERE - IT'S NOW IN COMMANDHANDLER.JS
        const targetUser = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');

        await this.executeCommand(interaction.user.id, targetUser.id, targetUser.username, amount, interaction);
    },
});
