// src/commands/commandHandler.js
const { Collection } = require('discord.js');

// Import all command files
const pingCommand = require('./ping');
const balanceCommand = require('./balance');
const addCoinsCommand = require('./add_coins');
const deductCoinsCommand = require('./deduct_coins');
const dailyCommand = require('./daily');
const begCommand = require('./beg');
const flipCommand = require('./flip');
const rollCommand = require('./roll');
const giveCommand = require('./give');
const leaderboardCommand = require('./leaderboard');
const helpCommand = require('./help');
const raidCommand = require('./raid'); // New
const bankDepositCommand = require('./bank_deposit'); // New
const bankWithdrawCommand = require('./bank_withdraw'); // New

/**
 * Initializes and loads all bot commands.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {{prefixCommands: Collection, slashCommands: Array}} An object containing collections of commands.
 */
module.exports = (coinManager) => {
    const prefixCommands = new Collection();
    const slashCommands = [];

    // Array of all command factory functions
    const commandFactories = [
        pingCommand,
        balanceCommand,
        addCoinsCommand,
        deductCoinsCommand,
        dailyCommand,
        begCommand,
        flipCommand,
        rollCommand,
        giveCommand,
        leaderboardCommand,
        helpCommand,
        raidCommand, // Add new command
        bankDepositCommand, // Add new command
        bankWithdrawCommand, // Add new command
    ];

    for (const factory of commandFactories) {
        const command = factory(coinManager); // Pass coinManager to each command
        prefixCommands.set(command.name, command);
        if (command.slashCommandData) {
            slashCommands.push(command.slashCommandData.toJSON());
        }
    }

    return { prefixCommands, slashCommands };
};
