// src/commands/give.js

/**
 * Factory function to create the give command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @param {import('discord.js').Client} client The Discord client instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager, client) => ({
    name: 'give',
    description: 'Gives coins to another user. Usage: !give @user <amount>',
    /**
     * Executes the give command.
     * @param {import('discord.js').Message} message The Discord message object.
     * @param {string[]} args An array of arguments. Expected: [userMention, amount]
     */
    async execute(message, args) {
        const senderId = message.author.id;
        const senderUsername = message.author.username;

        if (args.length !== 2) {
            return message.channel.send('Usage: `!give @user <amount>`');
        }

        const mention = args[0];
        const amountStr = args[1];

        // Extract receiver ID from mention
        const receiverId = mention.replace(/[^0-9]/g, ''); // Remove non-numeric characters

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
            // Fetch the receiver user object to display their username
            const receiverUser = await client.users.fetch(receiverId);
            if (!receiverUser) {
                return message.channel.send('Could not find the mentioned user.');
            }

            const success = await coinManager.transferCoins(senderId, receiverId, amount);

            if (success) {
                await message.channel.send(
                    `${senderUsername} successfully gave ${amount} 💰 to ${receiverUser.username}!`
                );
            } else {
                // This typically means insufficient funds
                await message.channel.send(
                    `${senderUsername}, you do not have enough coins to give ${amount} 💰 to ${receiverUser.username}.`
                );
            }
        } catch (error) {
            console.error(`Error in !give command from ${senderUsername}:`, error);
            await message.channel.send(`An error occurred during the transfer: ${error.message}`);
        }
    },
});
