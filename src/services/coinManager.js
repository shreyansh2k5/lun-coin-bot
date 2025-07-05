// src/services/coinManager.js
const { DEFAULT_BALANCE } = require('../config/gameConfig');
const admin = require('firebase-admin');
const { FieldValue } = admin.firestore;

class CoinManager {
    constructor(db) {
        this.db = db;
        this.usersCollection = 'users'; // Name of the Firestore collection for users
        this.coinsField = 'coins';     // Name of the field storing coin balance
        this.isBankedField = 'isBanked';       // Field to indicate if user is in safe mode
        this.lastBankToggleField = 'lastBankToggle'; // Timestamp for last deposit/withdraw action
        this.defaultBalance = DEFAULT_BALANCE;   // Default balance for new users
    }

    /**
     * Gets the current coin balance and bank status for a user.
     * If the user's document does not exist in Firestore, it will be created
     * and initialized with the default balance.
     *
     * @param {string} userId The Discord user ID.
     * @returns {Promise<{coins: number, isBanked: boolean, lastBankToggle: number}>} A Promise that resolves with the user's coin balance and bank status.
     */
    async getUserData(userId) {
        try {
            const userRef = this.db.collection(this.usersCollection).doc(userId);
            const userSnap = await userRef.get();

            if (userSnap.exists) {
                const data = userSnap.data();
                return {
                    coins: typeof data[this.coinsField] === 'number' ? data[this.coinsField] : 0,
                    isBanked: typeof data[this.isBankedField] === 'boolean' ? data[this.isBankedField] : false,
                    lastBankToggle: typeof data[this.lastBankToggleField] === 'number' ? data[this.lastBankToggleField] : 0,
                };
            } else {
                // User does not exist, initialize with default balance and bank status
                const initialData = {
                    [this.coinsField]: this.defaultBalance,
                    [this.isBankedField]: false,
                    [this.lastBankToggleField]: 0,
                };
                await userRef.set(initialData);
                return initialData;
            }
        } catch (error) {
            console.error(`Error getting user data for user ${userId}:`, error);
            // Return default values on error to prevent bot from crashing
            return {
                coins: 0,
                isBanked: false,
                lastBankToggle: 0,
            };
        }
    }

    /**
     * Gets the current coin balance for a user.
     * @param {string} userId The Discord user ID.
     * @returns {Promise<number>} A Promise that resolves with the user's coin balance.
     */
    async getBalance(userId) {
        const userData = await this.getUserData(userId);
        return userData.coins;
    }

    /**
     * Adds coins to a user's balance.
     *
     * @param {string} userId The Discord user ID.
     * @param {number} amount The amount of coins to add. Must be positive.
     * @returns {Promise<number>} A Promise that resolves with the new balance.
     * @throws {Error} If amount is non-positive.
     */
    async addCoins(userId, amount) {
        if (amount <= 0) {
            throw new Error("Amount to add must be positive.");
        }
        return this.updateCoins(userId, amount);
    }

    /**
     * Removes coins from a user's balance.
     *
     * @param {string} userId The Discord user ID.
     * @param {number} amount The amount of coins to remove. Must be positive.
     * @returns {Promise<number>} A Promise that resolves with the new balance.
     * @throws {Error} If amount is non-positive or if balance would go negative.
     */
    async removeCoins(userId, amount) {
        if (amount <= 0) {
            throw new Error("Amount to remove must be positive.");
        }
        return this.updateCoins(userId, -amount); // Use negative amount for removal
    }

    /**
     * Transfers coins from one user to another.
     * Uses a Firestore transaction for atomicity to ensure consistency.
     *
     * @param {string} senderId The Discord user ID of the sender.
     * @param {string} receiverId The Discord user ID of the receiver.
     * @param {number} amount The amount of coins to transfer. Must be positive.
     * @returns {Promise<boolean>} A Promise that resolves with true if successful, false otherwise.
     */
    async transferCoins(senderId, receiverId, amount) {
        if (amount <= 0) {
            throw new Error("Transfer amount must be positive.");
        }

        try {
            await this.db.runTransaction(async transaction => {
                const senderRef = this.db.collection(this.usersCollection).doc(senderId);
                const receiverRef = this.db.collection(this.usersCollection).doc(receiverId);

                const [senderDoc, receiverDoc] = await Promise.all([
                    transaction.get(senderRef),
                    transaction.get(receiverRef)
                ]);

                let senderCoins = senderDoc.exists ? (senderDoc.data()[this.coinsField] || 0) : 0;
                let receiverCoins = receiverDoc.exists ? (receiverDoc.data()[this.coinsField] || 0) : 0;

                if (senderCoins < amount) {
                    throw new Error("Insufficient funds for transfer.");
                }

                // Update sender's balance
                transaction.set(senderRef, { [this.coinsField]: senderCoins - amount }, { merge: true });

                // Update receiver's balance
                transaction.set(receiverRef, { [this.coinsField]: receiverCoins + amount }, { merge: true });
            });
            return true; // Transaction successful
        } catch (error) {
            console.error(`Error during coin transfer from ${senderId} to ${receiverId}:`, error.message);
            throw error; // Re-throw the error for the calling command to handle
        }
    }

    /**
     * Internal helper to update coin balance.
     * Uses a Firestore transaction for atomic read-modify-write operations.
     *
     * @param {string} userId The Discord user ID.
     * @param {number} delta The amount to change (positive for add, negative for remove).
     * @returns {Promise<number>} A Promise that resolves with the new balance.
     * @throws {Error} If balance would go negative.
     */
    async updateCoins(userId, delta) {
        try {
            let newCoins;
            await this.db.runTransaction(async transaction => {
                const userRef = this.db.collection(this.usersCollection).doc(userId);
                const doc = await transaction.get(userRef);

                let currentCoins = doc.exists ? (doc.data()[this.coinsField] || 0) : 0;
                newCoins = currentCoins + delta;

                if (newCoins < 0) {
                    throw new Error("Insufficient funds. Cannot go below zero coins.");
                }

                transaction.set(userRef, { [this.coinsField]: newCoins }, { merge: true });
            });
            return newCoins; // Return the new balance after successful transaction
        } catch (error) {
            console.error(`Error updating coins for user ${userId}:`, error.message);
            throw error; // Re-throw the error for the calling command to handle
        }
    }

    /**
     * Toggles the user's banked status (safe mode).
     * @param {string} userId The Discord user ID.
     * @param {boolean} status The new status (true for safe, false for vulnerable).
     * @returns {Promise<boolean>} The new banked status.
     * @throws {Error} If update fails.
     */
    async setBankedStatus(userId, status) {
        try {
            const userRef = this.db.collection(this.usersCollection).doc(userId);
            await userRef.update({
                [this.isBankedField]: status,
                [this.lastBankToggleField]: FieldValue.serverTimestamp(),
            });
            return status;
        } catch (error) {
            console.error(`Error setting banked status for user ${userId} to ${status}:`, error.message);
            throw error;
        }
    }

    /**
     * Checks if a user is currently 'banked' (in safe mode).
     * @param {string} userId The Discord user ID.
     * @returns {Promise<boolean>} True if the user is banked, false otherwise.
     */
    async isUserBanked(userId) {
        const userData = await this.getUserData(userId);
        return userData.isBanked;
    }

    /**
     * Fetches all users and their coin balances from Firestore.
     * @returns {Promise<Array<{userId: string, coins: number}>>} A promise that resolves to an array of user objects.
     */
    async getAllUserBalances() {
        try {
            const usersColRef = this.db.collection(this.usersCollection);
            const snapshot = await usersColRef.get();
            const users = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (typeof data[this.coinsField] === 'number') {
                    users.push({ userId: doc.id, coins: data[this.coinsField] });
                }
            });
            return users;
        } catch (error) {
            console.error('Error fetching all user balances:', error);
            return [];
        }
    }
}

module.exports = CoinManager;
