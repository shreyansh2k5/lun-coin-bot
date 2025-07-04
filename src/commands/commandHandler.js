// src/commands/commandHandler.js
const { Collection, MessageFlags } = require('discord.js'); // Import Collection and MessageFlags

// Import all command modules
const pingCommand = require('./ping');
const balanceCommand = require('./balance');
const giveCommand = require('./give');
const helpCommand = require('./help');
const flipCommand = require('./flip');
const rollCommand = require('./roll');
const dailyCommand = require('./daily');
const begCommand = require('./beg');
const addCoinsCommand = require('./add_coins');
const deductCoinsCommand = require('./deduct_coins');
const leaderboardCommand = require('./leaderboard');
const raidCommand = require('./raid'); // NEW
const bankDepositCommand = require('./bank_deposit'); // NEW
const bankWithdrawCommand = require('./bank_withdraw'); // NEW

// Maps to store commands, accessible by their name
const prefixCommands = new Collection();
const slashCommands = new Collection(); // Use Collection for slash commands as well for consistent lookup
const slashCommandsData = []; // Array to hold data for Discord API registration

/**
 * Registers a command with the handler.
 * Commands must have a 'name' property.
 * If they have 'prefixExecute', they are registered as prefix commands.
 * If they have 'slashExecute', and 'slashCommandData', they are registered as slash commands.
 * @param {object} command The command object.
 */
function registerCommand(command) {
    if (!command.name) {
        console.warn(`Command object is missing a 'name' property: ${JSON.stringify(command)}`);
        return;
    }

    if (typeof command.prefixExecute === 'function') {
        prefixCommands.set(command.name, command);
    }

    if (typeof command.slashExecute === 'function' && command.slashCommandData) {
        slashCommands.set(command.name, command);
        slashCommandsData.push(command.slashCommandData.toJSON()); // Store JSON data for API registration
    }
}

/**
 * Registers all available commands.
 * This function should be called once when the bot is ready.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @param {import('discord.js').Client} client The Discord client instance.
 */
function registerAllCommands(coinManager, client) {
    // Register core commands
    registerCommand(pingCommand);
    registerCommand(balanceCommand(coinManager));
    registerCommand(giveCommand(coinManager, client));
    // Pass all command maps/data to help command for dynamic listing
    registerCommand(helpCommand(prefixCommands, slashCommandsData, slashCommands)); // Pass slashCommands map too

    // Register new game/activity commands
    registerCommand(flipCommand(coinManager));
    registerCommand(rollCommand(coinManager));
    registerCommand(dailyCommand(coinManager));
    registerCommand(begCommand(coinManager));

    // Register admin commands
    registerCommand(addCoinsCommand(coinManager, client));
    registerCommand(deductCoinsCommand(coinManager, client));

    // Register leaderboard command
    registerCommand(leaderboardCommand(coinManager, client));

    // Register NEW commands
    registerCommand(raidCommand(coinManager)); // Raid command
    registerCommand(bankDepositCommand(coinManager)); // Bank Deposit command
    registerCommand(bankWithdrawCommand(coinManager)); // Bank Withdraw command

    console.log(`Registered ${prefixCommands.size} prefix commands.`);
    console.log(`Registered ${slashCommands.size} slash commands.`);
}

/**
 * Handles an incoming Discord message, attempting to execute a prefix command.
 * @param {string} commandName The name of the command to execute.
 * @param {import('discord.js').Message} message The Discord message object.
 * @param {string[]} args An array of arguments passed to the command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @param {import('discord.js').Client} client The Discord client instance.
 */
async function handlePrefixCommand(commandName, message, args, coinManager, client) {
    const command = prefixCommands.get(commandName);

    if (!command) {
        // Optionally, send a message if command is not found
        // message.channel.send(`Sorry, I don't recognize the command \`$${commandName}\`.`);
        return;
    }

    try {
        // Ensure that prefixExecute is called with the arguments it expects
        // Many of your commands (like daily, beg, flip, roll) expect only (message, args)
        // while others (give, add_coins, deduct_coins) expect (message, args, coinManager, client).
        // We'll pass all arguments for maximum compatibility, and commands can pick what they need.
        await command.prefixExecute(message, args, coinManager, client);
    } catch (error) {
        console.error(`Error executing prefix command $${commandName}:`, error);
        message.channel.send(`There was an error trying to execute that command: \`${error.message}\``);
    }
}

/**
 * Handles an incoming Discord interaction, attempting to execute a slash command.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction The Discord chat input command interaction object.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @param {import('discord.js').Client} client The Discord client instance.
 */
async function handleSlashCommand(interaction, coinManager, client) {
    const command = slashCommands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        // Defer reply to give more time for processing, then follow up
        // Use flags: 0 for public replies (not ephemeral)
        // Note: The individual command's executeCommand or slashExecute should handle ephemeral replies.
        await interaction.deferReply({ ephemeral: false }); // Defer as non-ephemeral by default

        // Ensure that slashExecute is called with the arguments it expects
        // Many of your commands (like daily, beg, flip, roll) expect only (interaction)
        // while others (give, add_coins, deduct_coins) expect (interaction, coinManager, client).
        // We'll pass all arguments for maximum compatibility, and commands can pick what they need.
        await command.slashExecute(interaction, coinManager, client);
    } catch (error) {
        console.error(`Error executing slash command /${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
            // Use flags: MessageFlags.Ephemeral for ephemeral replies
            await interaction.followUp({ content: `There was an error trying to execute that command: \`${error.message}\``, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: `There was an error trying to execute that command: \`${error.message}\``, flags: MessageFlags.Ephemeral });
        }
    }
}

/**
 * Returns the array of slash command data for Discord API registration.
 * @returns {Array<object>} An array of slash command JSON objects.
 */
function getSlashCommandsData() {
    return slashCommandsData;
}

module.exports = {
    registerAllCommands,
    handlePrefixCommand,
    handleSlashCommand,
    getSlashCommandsData
};
