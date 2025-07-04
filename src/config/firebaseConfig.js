// src/config/firebaseConfig.js
const admin = require('firebase-admin');

let db; // Variable to hold the Firestore database instance

/**
 * Initializes the Firebase Admin SDK.
 * It attempts to read the service account key from an environment variable first,
 * which is the recommended method for production environments like Render.
 *
 * @returns {FirebaseFirestore.Firestore | null} The Firestore database instance, or null if initialization fails.
 */
function initializeFirebase() {
    try {
        // Get the Firebase service account key JSON from an environment variable
        const serviceAccountKeyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (!serviceAccountKeyJson) {
            console.error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
            console.error('Please set it in Render environment variables with the full JSON content of your service account key.');
            return null;
        }

        // Parse the JSON string into a JavaScript object
        const serviceAccount = JSON.parse(serviceAccountKeyJson);

        // Initialize Firebase App if it hasn't been initialized already
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
                // You can add databaseURL here if using Realtime Database, but not strictly needed for Firestore
            });
            console.log('Firebase Admin SDK initialized successfully!');
        } else {
            console.log('Firebase Admin SDK already initialized.');
        }

        // Get the Firestore database instance
        db = admin.firestore();
        return db;

    } catch (error) {
        console.error('Error initializing Firebase Admin SDK:', error);
        return null;
    }
}

/**
 * Provides the initialized Firestore database instance.
 * @returns {FirebaseFirestore.Firestore | null} The Firestore database instance.
 */
function getFirestore() {
    if (!db) {
        console.warn('Firestore not initialized. Attempting to initialize...');
        return initializeFirebase(); // Attempt to initialize if called before explicit initialization
    }
    return db;
}

module.exports = {
    initializeFirebase,
    getFirestore
};
