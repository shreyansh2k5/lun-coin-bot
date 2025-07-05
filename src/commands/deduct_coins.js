// src/commands/deduct_coins.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

// Get the bot owner ID from environment variables
const BOT_OWNER_ID = process.env.BOT_OWNER_ID;

/**
 * Factory function to create the deduct_coins command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @param {import('discord.js').Client} client The Discord client instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager, client) => ({
    name: 'deduct_coins',
    description: '[ADMIN] Deduct coins from a user\'s balance.',
    slashCommandData: new SlashCommandBuilder()
        .setName('deduct_coins')
        .setDescription('[ADMIN] Deduct coins from a user\'s balance.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to deduct coins from')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of coins to deduct')
                .setRequired(true)
                .setMinValue(1)),

    // Helper function for owner check and execution
    async executeAdminCommand(executorId, targetUser, amount, replyFunction) {
        if (executorId !== BOT_OWNER_ID) {
            return replyFunction('You do not have permission to use this command.', true); // Ephemeral for unauthorized attempts
        }

        if (!targetUser) {
            return replyFunction('Please mention a valid user.', true);
        }

        if (isNaN(amount) || amount <= 0) {
            return replyFunction('Invalid amount. Please provide a positive number.', true);
        }

        try {
            const newBalance = await coinManager.removeCoins(targetUser.id, amount);
            await replyFunction(`✅ Deducted **${amount}** 💰 from ${targetUser.username}'s balance. New balance: **${newBalance}** 💰.`);
        } catch (error) {
            console.error(`Error deducting coins from ${targetUser.username}:`, error);
            await replyFunction(`An error occurred while deducting coins: ${error.message}`, true);
        }
    },

    async prefixExecute(message, args, coinManager, client) {
        const executorId = message.author.id;
        const mention = args[0];
        const amount = parseInt(args[1]);

        const targetId = mention ? mention.replace(/[^0-9]/g, '') : null;
        let targetUser = null;
        if (targetId) {
            try {
                targetUser = await client.users.fetch(targetId);
            } catch (e) {
                // User not found
            }
        }

        await this.executeAdminCommand(executorId, targetUser, amount,
            (content, ephemeral) => message.channel.send(content) // Prefix commands don't use ephemeral
        );
    },

    async slashExecute(interaction) {
    try {
        // Defer reply first to prevent "Unknown interaction" error
        // Use flags: 0 for public replies, or MessageFlags.Ephemeral for private replies
        await interaction.deferReply({ flags: 0 }); // Adjust flags based on whether the command's primary response should be public or private
    } catch (deferError) {
        console.error(`Failed to defer reply for /${interaction.commandName}:`, deferError);
        // If defer fails, try to reply ephemerally immediately as a last resort
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Sorry, I took too long to respond. Please try again.', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to send timeout error:", e));
        }
        return; // Stop execution if deferral failed
    }

        const executorId = interaction.user.id;
        const targetUser = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');

        await this.executeAdminCommand(executorId, targetUser, amount,
            (content, ephemeral) => interaction.followUp({ content, flags: ephemeral ? MessageFlags.Ephemeral : 0 })
        );
    },
});
