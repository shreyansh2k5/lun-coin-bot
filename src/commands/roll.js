// src/commands/roll.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { ROLL_WIN_MULTIPLIER, ROLL_WIN_CONDITION } = require('../config/gameConfig'); //

/**
 * Factory function to create the roll command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'roll',
    description: 'Roll a dice! If you win, your coins multiply by 6 times, otherwise you lose all.',
    slashCommandData: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll a dice! If you win, your coins multiply by 6 times, otherwise you lose all.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of coins to bet')
                .setRequired(true)
                .setMinValue(1)),

    async prefixExecute(message, args) {
        const userId = message.author.id;
        const username = message.author.username;
        const amount = parseInt(args[0]);

        if (isNaN(amount) || amount <= 0) {
            return message.channel.send('Usage: `$roll <amount>`. Amount must be a positive number.');
        }

        try {
            const balance = await coinManager.getBalance(userId);
            if (balance < amount) {
                return message.channel.send(`${username}, you only have **${balance}** 💰. You cannot bet **${amount}** 💰.`); // Bold coins
            }

            const diceRoll = Math.floor(Math.random() * 6) + 1; // Roll a 6-sided dice
            // const winCondition = 6; // Example: Win if you roll a 6 // Removed
            let newBalance;
            let resultMessage;

            if (diceRoll === ROLL_WIN_CONDITION) { //
                const winnings = amount * (ROLL_WIN_MULTIPLIER - 1); // Original bet + 5 times original bet = 6 times total
                newBalance = await coinManager.addCoins(userId, winnings); // Add winnings
                resultMessage = `🎲 ${username}, you rolled a ${diceRoll} and WON! You gained **${winnings}** 💰. Your new balance is **${newBalance}** 💰.`; // Bold coins
            } else {
                newBalance = await coinManager.removeCoins(userId, amount); // Lose original bet
                resultMessage = `💔 ${username}, you rolled a ${diceRoll} and LOST. You lost **${amount}** 💰. Your new balance is **${newBalance}** 💰.`; // Bold coins
            }
            await message.channel.send(resultMessage);

        } catch (error) {
            console.error(`Error in $roll command for ${username}:`, error);
            await message.channel.send(`An error occurred during the dice roll: ${error.message}`);
        }
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

        const userId = interaction.user.id;
        const username = interaction.user.username;
        const amount = interaction.options.getInteger('amount');

        try {
            const balance = await coinManager.getBalance(userId);
            if (balance < amount) {
                return interaction.followUp({ content: `${username}, you only have **${balance}** 💰. You cannot bet **${amount}** 💰.`, flags: MessageFlags.Ephemeral }); // Bold coins
            }

            const diceRoll = Math.floor(Math.random() * 6) + 1;
            // const winCondition = 6; // Removed
            let newBalance;
            let resultMessage;

            if (diceRoll === ROLL_WIN_CONDITION) { //
                const winnings = amount * (ROLL_WIN_MULTIPLIER - 1); //
                newBalance = await coinManager.addCoins(userId, winnings);
                resultMessage = `🎲 ${username}, you rolled a ${diceRoll} and WON! You gained **${winnings}** 💰. Your new balance is **${newBalance}** 💰.`; // Bold coins
            } else {
                newBalance = await coinManager.removeCoins(userId, amount);
                resultMessage = `💔 ${username}, you rolled a ${diceRoll} and LOST. You lost **${amount}** 💰. Your new balance is **${newBalance}** 💰.`; // Bold coins
            }
            await interaction.followUp(resultMessage);

        } catch (error) {
            console.error(`Error in /roll command for ${username}:`, error);
            await interaction.followUp({ content: `An error occurred during the dice roll: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },
});
