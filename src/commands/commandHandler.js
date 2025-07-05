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
const profileCommand = require('./profile');
const raidCommand = require('./raid'); // NEW: Re-add import
const bankDepositCommand = require('./bank_deposit'); // NEW: Re-add import
const bankWithdrawCommand = require('./bank_withdraw'); // NEW: Re-add import

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

    // Register NEW profile command
    registerCommand(profileCommand(coinManager));

    // Re-register Raid and Bank commands
    registerCommand(raidCommand(coinManager));
    registerCommand(bankDepositCommand(coinManager));
    registerCommand(bankWithdrawCommand(coinManager));

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
        await command.prefixExecute(message, args, coinManager, client);
    } catch (error) {
            console.error(`Error executing prefix command $${commandName}:`, error);
            // Check if the message has already been replied to or deleted to avoid errors
            if (!message.deleted) {
                message.channel.send(`There was an error trying to execute that command: \`${error.message}\``)
                    .catch(e => console.error("Failed to send error message:", e));
            }
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
        // If interaction is not yet replied/deferred, send an ephemeral error
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Sorry, that command was not found.', ephemeral: true }).catch(e => console.error("Failed to send command not found error:", e));
        }
        return;
    }

    try {
        // IMPORTANT: The individual command's slashExecute method is now responsible
        // for calling interaction.deferReply() or interaction.reply()
        await command.slashExecute(interaction, coinManager, client);
    } catch (error) {
        console.error(`Error executing slash command /${interaction.commandName}:`, error);
        // Check if the interaction has already been replied to or deferred
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: `There was an error trying to execute that command: \`${error.message}\``, flags: MessageFlags.Ephemeral })
                .catch(e => console.error("Failed to send followUp error message:", e));
        } else {
            await interaction.reply({ content: `There was an error trying to execute that command: \`${error.message}\``, flags: MessageFlags.Ephemeral })
                .catch(e => console.error("Failed to send reply error message:", e));
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
