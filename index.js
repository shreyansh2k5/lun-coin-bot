// index.js
// Load environment variables from .env file if running locally
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// Import necessary modules
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { initializeFirebase } = require('./src/config/firebaseConfig');
const CoinManager = require('./src/services/coinManager');
const commandHandler = require('./src/commands/commandHandler');
const { startKeepAliveServer } = require('./src/utils/keepAlive'); // Import the new keep-alive function

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
        GatewayIntentBits.Guilds,           // Required for guild-related events
        GatewayIntentBits.GuildMessages,    // Required for message-related events
        GatewayIntentBits.MessageContent,   // REQUIRED to read message content (enable in Discord Dev Portal)
    ],
    partials: [Partials.Channel, Partials.Message] // Recommended for partial data handling
});

// Event listener for when the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot is online and ready.');
    // Register all commands once the client is ready and dependencies are available
    commandHandler.registerAllCommands(coinManager, client);
});

// Event listener for incoming messages
client.on('messageCreate', async message => {
    // Ignore messages from bots to prevent infinite loops
    if (message.author.bot) return;

    // Define your command prefix
    const prefix = '!';

    // Check if the message starts with the prefix
    if (!message.content.startsWith(prefix)) return;

    // Extract command name and arguments
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Handle commands using the commandHandler
    commandHandler.handle(commandName, message, args, coinManager, client);
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
const keepAliveServer = startKeepAliveServer(); // Start the server and get its instance

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down bot...');
    client.destroy(); // Disconnect Discord client
    keepAliveServer.close(() => { // Close HTTP server gracefully
        console.log('Keep-alive server closed.');
        process.exit(0);
    });
});
