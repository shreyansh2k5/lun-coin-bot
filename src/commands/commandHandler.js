// src/commands/commandHandler.js
// Import all command modules
const pingCommand = require('./ping');
const balanceCommand = require('./balance');
const giveCommand = require('./give');
const helpCommand = require('./help'); // NEW
const flipCommand = require('./flip'); // NEW
const rollCommand = require('./roll'); // NEW
const dailyCommand = require('./daily'); // NEW
const begCommand = require('./beg'); // NEW

// Maps to store commands, accessible by their name
const prefixCommands = new Map();
const slashCommands = new Map();
const slashCommandsData = []; // Array to hold data for Discord API registration

/**
 * Registers a command with the handler.
 * Commands must have a 'name' property.
 * If they have 'prefixExecute', they are registered as prefix commands.
 * If they have 'slashExecute' and 'slashCommandData', they are registered as slash commands.
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
    registerCommand(helpCommand(prefixCommands, slashCommandsData)); // Help needs access to registered commands

    // Register new game/activity commands
    registerCommand(flipCommand(coinManager));
    registerCommand(rollCommand(coinManager));
    registerCommand(dailyCommand(coinManager));
    registerCommand(begCommand(coinManager));

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
        await interaction.deferReply({ ephemeral: false }); // ephemeral: true for private replies

        await command.slashExecute(interaction, coinManager, client);
    } catch (error) {
        console.error(`Error executing slash command /${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: `There was an error trying to execute that command: \`${error.message}\``, ephemeral: true });
        } else {
            await interaction.reply({ content: `There was an error trying to execute that command: \`${error.message}\``, ephemeral: true });
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
