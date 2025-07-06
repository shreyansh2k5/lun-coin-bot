// src/commands/commandHandler.js
const { Collection, MessageFlags } = require('discord.js');

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
const raidCommand = require('./raid');
const bankDepositCommand = require('./bank_deposit');
const bankWithdrawCommand = require('./bank_withdraw');
const shopCommand = require('./shop'); // Import the shop command

// Maps to store commands, accessible by their name
const prefixCommands = new Collection();
const slashCommands = new Collection();
const slashCommandsData = [];

/**
 * Registers a command with the handler.
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
        slashCommandsData.push(command.slashCommandData.toJSON());
    }
}

/**
 * Registers all available commands.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @param {import('discord.js').Client} client The Discord client instance.
 */
function registerAllCommands(coinManager, client) {
    registerCommand(pingCommand());
    registerCommand(balanceCommand(coinManager));
    registerCommand(giveCommand(coinManager, client));
    registerCommand(helpCommand(prefixCommands, slashCommandsData, slashCommands));
    registerCommand(flipCommand(coinManager));
    registerCommand(rollCommand(coinManager));
    registerCommand(dailyCommand(coinManager));
    registerCommand(begCommand(coinManager));
    registerCommand(addCoinsCommand(coinManager, client));
    registerCommand(deductCoinsCommand(coinManager, client));
    registerCommand(leaderboardCommand(coinManager, client));
    registerCommand(profileCommand(coinManager));
    registerCommand(raidCommand(coinManager, client));
    registerCommand(bankDepositCommand(coinManager));
    registerCommand(bankWithdrawCommand(coinManager));
    registerCommand(shopCommand(coinManager)); // Register the shop command

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
        return;
    }

    try {
        await command.prefixExecute(message, args, coinManager, client);
    } catch (error) {
            console.error(`Error executing prefix command $${commandName}:`, error);
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
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Sorry, that command was not found.', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to send command not found error:", e));
        }
        return;
    }

    try {
        // IMPORTANT: Deferral is now handled by individual command's slashExecute method.
        // This command handler just passes the interaction.
        await command.slashExecute(interaction, coinManager, client);
    } catch (error) {
        console.error(`Error executing slash command /${interaction.commandName}:`, error);
        // This catch block will handle errors from the individual command's slashExecute.
        // It's crucial to check if interaction has been replied/deferred to avoid "InteractionAlreadyReplied".
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: `An error occurred during command execution: ${error.message}`, flags: MessageFlags.Ephemeral })
                .catch(e => console.error("Failed to send followUp error message:", e));
        } else {
            await interaction.reply({ content: `An unexpected error occurred: ${error.message}`, flags: MessageFlags.Ephemeral })
                .catch(e => console.error("Failed to send initial error reply:", e));
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
