// src/commands/add_coins.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

// Get the bot owner ID from environment variables
const BOT_OWNER_ID = process.env.BOT_OWNER_ID;

/**
 * Factory function to create the add_coins command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @param {import('discord.js').Client} client The Discord client instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager, client) => ({
    name: 'add_coins',
    description: '[ADMIN] Add coins to a user\'s balance.',
    slashCommandData: new SlashCommandBuilder()
        .setName('add_coins')
        .setDescription('[ADMIN] Add coins to a user\'s balance.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to add coins to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of coins to add')
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
            const newBalance = await coinManager.addCoins(targetUser.id, amount);
            await replyFunction(`✅ Added **${amount}** 💰 to ${targetUser.username}'s balance. New balance: **${newBalance}** 💰.`);
        } catch (error) {
            console.error(`Error adding coins to ${targetUser.username}:`, error);
            await replyFunction(`An error occurred while adding coins: ${error.message}`, true);
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
        await interaction.deferReply({ ephemeral: false });
        const executorId = interaction.user.id;
        const targetUser = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');

        await this.executeAdminCommand(executorId, targetUser, amount,
            (content, ephemeral) => interaction.followUp({ content, flags: ephemeral ? MessageFlags.Ephemeral : 0 })
        );
    },
});

