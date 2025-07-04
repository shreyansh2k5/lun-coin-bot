// index.js
// Load environment variables from .env file if running locally
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// Import necessary modules
const { Client, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const { initializeFirebase } = require('./src/config/firebaseConfig');
const CoinManager = require('./src/services/coinManager');
const commandHandler = require('./src/commands/commandHandler');
const { startKeepAliveServer } = require('./src/utils/keepAlive');

// Define the command prefix
const PREFIX = '$'; // Changed prefix to '$'

// Initialize Firebase and get the Firestore DB instance
const db = initializeFirebase();
if (!db) {
    console.error('Failed to initialize Firebase. Exiting.');
    process.exit(1);
}
const coinManager = new CoinManager(db);

// Create a new Discord client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           // Required for guild-related events (e.g., slash commands)
        GatewayIntentBits.GuildMessages,    // Required for message-related events
        GatewayIntentBits.MessageContent,   // REQUIRED to read message content (enable in Discord Dev Portal)
    ],
    partials: [Partials.Channel, Partials.Message] // Recommended for partial data handling
});

// Event listener for when the bot is ready
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot is online and ready.');

    // Register all commands and get slash command data
    commandHandler.registerAllCommands(coinManager, client);
    const slashCommandsData = commandHandler.getSlashCommandsData();

    // Register slash commands globally (for simplicity, guild-specific is faster for testing)
    if (slashCommandsData.length > 0) {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
        try {
            console.log('Started refreshing application (/) commands.');

            // Use client.application.id for global commands
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: slashCommandsData },
            );

            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error('Error refreshing application (/) commands:', error);
        }
    }
});

// Event listener for incoming messages (for prefix commands)
client.on('messageCreate', async message => {
    // Ignore messages from bots to prevent infinite loops
    if (message.author.bot) return;

    // Check if the message starts with the prefix
    if (!message.content.startsWith(PREFIX)) return;

    // Extract command name and arguments
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Handle prefix commands
    commandHandler.handlePrefixCommand(commandName, message, args, coinManager, client);
});

// Event listener for interactions (for slash commands)
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // Handle slash commands
    commandHandler.handleSlashCommand(interaction, coinManager, client);
});

// Log in to Discord with your bot token
const botToken = process.env.DISCORD_BOT_TOKEN;
if (!botToken) {
    console.error('DISCORD_BOT_TOKEN environment variable is not set.');
    process.exit(1);
}

client.login(botToken)
    .catch(error => {
        console.error('Failed to log in to Discord:', error);
        process.exit(1);
    });

// --- Start Keep-Alive HTTP Server for Render ---
const keepAliveServer = startKeepAliveServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down bot...');
    client.destroy();
    keepAliveServer.close(() => {
        console.log('Keep-alive server closed.');
        process.exit(0);
    });
});
