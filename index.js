// index.js
require('dotenv').config(); // Load environment variables from .env file
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { initializeApp } = require('firebase/app'); // Import initializeApp from firebase/app
const { getFirestore } = require('firebase/firestore'); // Import getFirestore from firebase/firestore
const { getAuth, signInAnonymously, signInWithCustomToken } = require('firebase/auth'); // Import auth functions
const admin = require('firebase-admin'); // Import firebase-admin
const serviceAccount = require('./src/config/firebaseConfig.js'); // Your Firebase Admin SDK config
const CoinManager = require('./src/services/coinManager');
const commandHandler = require('./src/commands/commandHandler');
const keepAlive = require('./src/utils/keepAlive');

// Initialize Firebase Admin SDK (for server-side operations if needed, e.g., auth token generation)
// This part is crucial for your bot to interact with Firestore securely.
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully!');
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    // Exit if Firebase Admin SDK fails to initialize, as it's critical for the bot's functionality.
    process.exit(1);
}

// Initialize Firebase Client SDK (for front-end like operations, though here used for Firestore)
// This is the configuration for the client-side Firebase, which is what getFirestore uses directly.
// Ensure you have your client-side Firebase config in your environment variables or a separate config file.
const firebaseClientConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const firebaseApp = initializeApp(firebaseClientConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// Sign in anonymously or with a custom token if available
// This is important for Firebase security rules that require authentication.
(async () => {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
            console.log('Signed in with custom token!');
        } else {
            await signInAnonymously(auth);
            console.log('Signed in anonymously!');
        }
    } catch (error) {
        console.error('Firebase authentication failed:', error);
        // Handle authentication failure, maybe exit or log
    }
})();


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Required for accessing message.content
    ],
});

// Initialize CoinManager with the Firestore database instance
const coinManager = new CoinManager(db);

// Initialize commands using the commandHandler factory function
const { prefixCommands, slashCommands } = commandHandler(coinManager); // Correctly call commandHandler

client.commands = prefixCommands; // Store prefix commands in client.commands for easy access

// Event: Bot is ready
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot is online and ready.');

    // Register slash commands globally
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');
        // Use Routes.applicationCommands(clientId) for global commands
        // or Routes.applicationGuildCommands(clientId, guildId) for guild-specific commands
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: slashCommands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

// Event: Message Create (for prefix commands)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const prefix = process.env.PREFIX || '$'; // Get prefix from environment variables, default to '$'
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        if (command.prefixExecute) {
            await command.prefixExecute(message, args);
        } else {
            message.reply('This command does not support prefix usage.');
        }
    } catch (error) {
        console.error(`Error executing prefix command ${commandName}:`, error);
        message.reply('There was an error trying to execute that command!');
    }
});

// Event: Interaction Create (for slash commands)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        if (command.slashExecute) {
            await interaction.deferReply({ ephemeral: false }); // Defer the reply to give more time for processing
            await command.slashExecute(interaction);
        } else {
            await interaction.reply({ content: 'This command does not support slash command usage.', ephemeral: true });
        }
    } catch (error) {
        console.error(`Error executing slash command ${commandName}:`, error);
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: 'There was an error trying to execute that command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error trying to execute that command!', ephemeral: true });
        }
    }
});

// Start the keep-alive server
keepAlive();

// Log in to Discord
client.login(process.env.DISCORD_BOT_TOKEN);
