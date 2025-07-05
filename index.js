// index.js
require('dotenv').config(); // Load environment variables from .env file
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js'); // Removed ActivityType from here
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { getAuth, signInAnonymously, signInWithCustomToken } = require('firebase/auth');
const admin = require('firebase-admin');
const CoinManager = require('./src/services/coinManager');
const commandHandler = require('./src/commands/commandHandler');
const keepAlive = require('./src/utils/keepAlive');
const { setBotActivity } = require('./src/utils/richPresence'); // Import the new richPresence utility
const { ActivityType } = require('discord.js'); // Re-import ActivityType for use here

let serviceAccount;
try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
    }
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    console.log('Firebase Service Account Key parsed successfully from environment variable.');
} catch (error) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error.message);
    console.error('Please ensure FIREBASE_SERVICE_ACCOUNT_KEY is a valid JSON string of your service account key file.');
    process.exit(1);
}

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully!');
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    process.exit(1);
}

const firebaseClientConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const requiredClientConfig = [
    'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET', 'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_APP_ID'
];
const missingConfig = requiredClientConfig.filter(key => !process.env[key]);

if (missingConfig.length > 0) {
    console.error(`Missing Firebase client environment variables: ${missingConfig.join(', ')}. Please add them to your Render environment.`);
    process.exit(1);
}

const firebaseApp = initializeApp(firebaseClientConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

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
        process.exit(1);
    }
})();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const coinManager = new CoinManager(db);

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot is online and ready.');

    // Set the bot's activity using the new utility function
    setBotActivity(client.user, 'with coins', ActivityType.Playing);

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

keepAlive();

client.login(process.env.DISCORD_BOT_TOKEN);
