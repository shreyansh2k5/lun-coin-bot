// index.js
require('dotenv').config(); // Load environment variables from .env file
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { initializeApp } = require('firebase/app'); // Import initializeApp from firebase/app
const { getFirestore } = require('firebase/firestore'); // Import getFirestore from firebase/firestore
const { getAuth, signInAnonymously, signInWithCustomToken } = require('firebase/auth'); // Import auth functions
const admin = require('firebase-admin'); // Import firebase-admin
const serviceAccount = require('./src/config/firebaseConfig.js'); // Your Firebase Admin SDK config
const CoinManager = require('./src/services/coinManager');
const commandHandler = require('./src/commands/commandHandler'); // Import the commandHandler module

// Initialize Firebase Admin SDK (for server-side operations if needed, e.g., auth token generation)
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

// Initialize Firebase Client SDK
// Ensure you have your client-side Firebase config in your environment variables or a separate config file.
const firebaseClientConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID // Optional
};

// Check if all required client config variables are present
const requiredClientConfig = [
    'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET', 'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_APP_ID'
];
const missingConfig = requiredClientConfig.filter(key => !process.env[key]);

if (missingConfig.length > 0) {
    console.error(`Missing Firebase client environment variables: ${missingConfig.join(', ')}. Please add them to your Render environment.`);
    process.exit(1); // Exit if critical config is missing
}

const firebaseApp = initializeApp(firebaseClientConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// Sign in anonymously or with a custom token if available
(async () => {
    try {
        // Check for __initial_auth_token which is provided by Canvas environment
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
            console.log('Signed in with custom token!');
        } else {
            // Fallback to anonymous sign-in if no custom token (e.g., local development)
            await signInAnonymously(auth);
            console.log('Signed in anonymously!');
        }
    } catch (error) {
        console.error('Firebase authentication failed:', error);
        // Handle authentication failure, maybe exit or log
        process.exit(1); // Exit if authentication fails, as Firestore operations will likely fail
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

// Event: Bot is ready
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot is online and ready.');

    // Register all commands using the commandHandler's function
    commandHandler.registerAllCommands(coinManager, client);

    // Register slash commands globally
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');
        // Use Routes.applicationCommands(clientId) for global commands
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandHandler.getSlashCommandsData() }, // Get slash command data from handler
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

    // Handle prefix command using the commandHandler's function
    await commandHandler.handlePrefixCommand(commandName, message, args, coinManager, client);
});

// Event: Interaction Create (for slash commands)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    // Handle slash command using the commandHandler's function
    await commandHandler.handleSlashCommand(interaction, coinManager, client);
});

// Start the keep-alive server
keepAlive();

// Log in to Discord
client.login(process.env.DISCORD_BOT_TOKEN);
