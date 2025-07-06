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
    description: 'Give coins to another user.',
    slashCommandData: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give coins to another user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to give coins to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of coins to give')
                .setRequired(true)
                .setMinValue(1)),

    async executeCommand(senderId, senderUsername, receiverId, receiverUsername, amount, interactionOrMessage) {
        if (senderId === receiverId) {
            if (interactionOrMessage.followUp) {
                return interactionOrMessage.followUp({ content: 'You cannot give coins to yourself!', flags: MessageFlags.Ephemeral });
            } else {
                return interactionOrMessage.channel.send('You cannot give coins to yourself!');
            }
        }

        try {
            const success = await coinManager.transferCoins(senderId, receiverId, amount);
            if (success) {
                const senderBalance = await coinManager.getBalance(senderId);
                const receiverBalance = await coinManager.getBalance(receiverId);
                const responseMessage = `💸 **${senderUsername}** gave **${amount}** 💰 to **${receiverUsername}**!
                **${senderUsername}**'s new balance: **${senderBalance}** 💰.
                **${receiverUsername}**'s new balance: **${receiverBalance}** 💰.`;

                if (interactionOrMessage.followUp) {
                    await interactionOrMessage.followUp(responseMessage);
                } else {
                    await interactionOrMessage.channel.send(responseMessage);
                }
            } else {
                const errorMessage = `Failed to give coins. Check console for details.`;
                if (interactionOrMessage.followUp) {
                    await interactionOrMessage.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
                } else {
                    await interactionOrMessage.channel.send(errorMessage);
                }
            }
        } catch (error) {
            console.error(`Error in give command from ${senderUsername} to ${receiverUsername}:`, error);
            let errorMessage = `Failed to give coins: ${error.message}`;
            if (error.message.includes("Insufficient funds")) {
                errorMessage = `You do not have enough coins to give **${amount}** 💰.`;
            }
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
            return message.channel.send('Usage: `$give <@user> <amount>`. Amount must be a positive number.');
        }

        await this.executeCommand(message.author.id, message.author.username, targetUser.id, targetUser.username, amount, message);
    },

    async slashExecute(interaction) {
        try {
            // Defer reply first
            await interaction.deferReply({ flags: 0 }); // Give command should be public
        } catch (deferError) {
            console.error(`Failed to defer reply for /${interaction.commandName}:`, deferError);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Sorry, I took too long to respond. Please try again.', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to send timeout error:", e));
            }
            return;
        }

        const senderId = interaction.user.id;
        const senderUsername = interaction.user.username;
        const receiverUser = interaction.options.getUser('target');
        const receiverId = receiverUser.id;
        const receiverUsername = receiverUser.username;
        const amount = interaction.options.getInteger('amount');

        await this.executeCommand(senderId, senderUsername, receiverId, receiverUsername, amount, interaction);
    },
});
