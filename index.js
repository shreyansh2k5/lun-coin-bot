// index.js
require('dotenv').config(); // Load environment variables from .env file
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const admin = require('firebase-admin'); // Keep admin SDK import
const { initializeFirebase, getFirestore } = require('./src/config/firebaseConfig.js'); // Import from your original firebaseConfig.js
const CoinManager = require('./src/services/coinManager');
const commandHandler = require('./src/commands/commandHandler');
const { keepAlive } = require('./src/utils/keepAlive'); // Corrected: Destructure keepAlive
const { setBotActivity } = require('./src/utils/richPresence');
const { ActivityType } = require('discord.js');

// Initialize Firebase Admin SDK and get Firestore instance using your original method
const db = initializeFirebase(); // Call your initializeFirebase function

// Exit if Firebase initialization fails (db will be null)
if (!db) {
    console.error('Failed to initialize Firebase. Exiting bot process.');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Initialize CoinManager with the Firestore database instance obtained from Admin SDK
const coinManager = new CoinManager(db);

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot is online and ready.');

    // Set the bot's activity using the new utility function
    setBotActivity(client.user); // Uses default 'type $help to start'

    commandHandler.registerAllCommands(coinManager, client);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandHandler.getSlashCommandsData() },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const prefix = process.env.PREFIX || '$';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    await commandHandler.handlePrefixCommand(commandName, message, args, coinManager, client);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    await commandHandler.handleSlashCommand(interaction, coinManager, client);
});

keepAlive(); // Now keepAlive is correctly imported as a function

client.login(process.env.DISCORD_BOT_TOKEN);
