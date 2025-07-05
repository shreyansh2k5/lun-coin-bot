// src/commands/give.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

/**
 * Factory function to create the give command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @param {import('discord.js').Client} client The Discord client instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager, client) => ({
    name: 'give',
    description: 'Gives coins to another user.',
    // Slash command data for Discord API registration
    slashCommandData: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Gives coins to another user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to give coins to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of coins to give')
                .setRequired(true)
                .setMinValue(1)), // Ensure amount is positive

    /**
     * Executes the give command for prefix messages.
     * @param {import('discord.js').Message} message The Discord message object.
     * @param {string[]} args An array of arguments. Expected: [userMention, amount]
     */
    async prefixExecute(message, args) {
        const senderId = message.author.id;
        const senderUsername = message.author.username;

        if (args.length !== 2) {
            return message.channel.send('Usage: `$give @user <amount>`');
        }

        const mention = args[0];
        const amountStr = args[1];

        // Extract receiver ID from mention
        const receiverId = mention.replace(/[^0-9]/g, '');

        if (!receiverId) {
            return message.channel.send('Please mention a valid user to give coins to.');
        }

        if (senderId === receiverId) {
            return message.channel.send('You cannot give coins to yourself!');
        }

        const amount = parseInt(amountStr);

        if (isNaN(amount) || amount <= 0) {
            return message.channel.send('Invalid amount. Please provide a positive number.');
        }

        try {
            const receiverUser = await client.users.fetch(receiverId);
            if (!receiverUser) {
                return message.channel.send('Could not find the mentioned user.');
            }

            const success = await coinManager.transferCoins(senderId, receiverId, amount);

            if (success) {
                await message.channel.send(
                    `${senderUsername} successfully gave **${amount}** 💰 to ${receiverUser.username}!` // Bold coins
                );
            } else {
                await message.channel.send(
                    `${senderUsername}, you do not have enough coins to give **${amount}** 💰 to ${receiverUser.username}.` // Bold coins
                );
            }
        } catch (error) {
            console.error(`Error in $give command from ${senderUsername}:`, error);
            await message.channel.send(`An error occurred during the transfer: ${error.message}`);
        }
    },

    /**
     * Executes the give command for slash commands.
     * @param {import('discord.js').ChatInputCommandInteraction} interaction The interaction object.
     */
    async slashExecute(interaction) {
        await interaction.deferReply({ ephemeral: false });
        const senderId = interaction.user.id;
        const senderUsername = interaction.user.username;
        const targetUser = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');

        const receiverId = targetUser.id;
        const receiverUsername = targetUser.username;

        if (senderId === receiverId) {
            return interaction.followUp({ content: 'You cannot give coins to yourself!', flags: MessageFlags.Ephemeral });
        }

        try {
            const success = await coinManager.transferCoins(senderId, receiverId, amount);

            if (success) {
                await interaction.followUp(
                    `${senderUsername} successfully gave **${amount}** 💰 to ${receiverUsername}!` // Bold coins
                );
            } else {
                await interaction.followUp({
                    content: `${senderUsername}, you do not have enough coins to give **${amount}** 💰 to ${receiverUsername}.`, // Bold coins
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (error) {
            console.error(`Error in /give command from ${senderUsername}:`, error);
            await interaction.followUp({ content: `An error occurred during the transfer: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },
});
