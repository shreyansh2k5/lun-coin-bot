// src/commands/commandHandler.js
const pingCommand = require('./ping');
const balanceCommand = require('./balance');
const giveCommand = require('./give');

// A map to store all commands
const commands = new Map();

/**
 * Registers a command with the handler.
 * @param {object} command The command object, must have a 'name' property and an 'execute' method.
 */
function registerCommand(command) {
    if (command.name && typeof command.execute === 'function') {
        commands.set(command.name, command);
    } else {
        console.warn(`Invalid command object: ${JSON.stringify(command)}`);
    }
}

// Register all your commands here
// Pass dependencies (like coinManager, client) to commands as needed
function registerAllCommands(coinManager, client) {
    registerCommand(pingCommand);
    registerCommand(balanceCommand(coinManager)); // balance needs coinManager
    registerCommand(giveCommand(coinManager, client)); // give needs coinManager and client
}

/**
 * Handles an incoming Discord message, attempting to execute a command.
 * @param {string} commandName The name of the command to execute.
 * @param {import('discord.js').Message} message The Discord message object.
 * @param {string[]} args An array of arguments passed to the command.
 * @param {CoinManager} coinManager The CoinManager instance.
 * @param {import('discord.js').Client} client The Discord client instance.
 */
async function handle(commandName, message, args, coinManager, client) {
    const command = commands.get(commandName);

    if (!command) {
        // Optionally, send a message if command is not found
        // message.channel.send(`Sorry, I don't recognize the command \`!${commandName}\`.`);
        return;
    }

    try {
        // Execute the command, passing necessary context
        await command.execute(message, args, coinManager, client);
    } catch (error) {
        console.error(`Error executing command !${commandName}:`, error);
        message.channel.send(`There was an error trying to execute that command: \`${error.message}\``);
    }
}

module.exports = {
    registerAllCommands,
    handle
};
