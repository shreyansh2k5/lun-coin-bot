// src/services/coinManager.js
const { DEFAULT_BALANCE } = require('../config/gameConfig');
const { doc, getDoc, setDoc, runTransaction, collection, getDocs } = require('firebase/firestore'); // Import Firestore functions

class CoinManager {
    constructor(db) {
        this.db = db;
        this.usersCollection = 'users'; // Name of the Firestore collection for users
        this.coinsField = 'coins';     // Name of the field storing coin balance
        this.bankedCoinsField = 'bankedCoins'; // New: Field for banked coins
        this.isBankedField = 'isBanked';       // New: Field to indicate if user is banked
        this.lastBankDepositField = 'lastBankDeposit'; // New: Timestamp for last deposit
        this.lastBankWithdrawField = 'lastBankWithdraw'; // New: Timestamp for last withdrawal
        this.defaultBalance = DEFAULT_BALANCE;   // Default balance for new users
    }

    /**
     * Gets the current coin balance and bank balance for a user.
     * If the user's document does not exist in Firestore, it will be created
     * and initialized with the default balance.
     *
     * @param {string} userId The Discord user ID.
     * @returns {Promise<{coins: number, bankedCoins: number, isBanked: boolean, lastBankDeposit: number, lastBankWithdraw: number}>} A Promise that resolves with the user's coin and bank balance, and bank status.
     */
    async getUserData(userId) {
        try {
            const userRef = doc(this.db, this.usersCollection, userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                return {
                    coins: typeof data[this.coinsField] === 'number' ? data[this.coinsField] : 0,
                    bankedCoins: typeof data[this.bankedCoinsField] === 'number' ? data[this.bankedCoinsField] : 0,
                    isBanked: typeof data[this.isBankedField] === 'boolean' ? data[this.isBankedField] : false,
                    lastBankDeposit: typeof data[this.lastBankDepositField] === 'number' ? data[this.lastBankDepositField] : 0,
                    lastBankWithdraw: typeof data[this.lastBankWithdrawField] === 'number' ? data[this.lastBankWithdrawField] : 0,
                };
            } else {
                // User does not exist, initialize with default balance and bank status
                const initialData = {
                    [this.coinsField]: this.defaultBalance,
                    [this.bankedCoinsField]: 0,
                    [this.isBankedField]: false,
                    [this.lastBankDepositField]: 0,
                    [this.lastBankWithdrawField]: 0,
                };
                await setDoc(userRef, initialData);
                return initialData;
            }
        } catch (error) {
            console.error(`Error getting user data for user ${userId}:`, error);
            // Return default values on error to prevent bot from crashing
            return {
                coins: 0,
                bankedCoins: 0,
                isBanked: false,
                lastBankDeposit: 0,
                lastBankWithdraw: 0,
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

        // Use a Firestore transaction for atomic read-modify-write operations
        try {
            await runTransaction(this.db, async (transaction) => {
                const senderRef = doc(this.db, this.usersCollection, senderId);
                const receiverRef = doc(this.db, this.usersCollection, receiverId);

                const [senderSnap, receiverSnap] = await Promise.all([
                    transaction.get(senderRef),
                    transaction.get(receiverRef)
                ]);

                let senderCoins = senderSnap.exists() ? (senderSnap.data()[this.coinsField] || 0) : 0;
                let receiverCoins = receiverSnap.exists() ? (receiverSnap.data()[this.coinsField] || 0) : 0;

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
            await runTransaction(this.db, async (transaction) => {
                const userRef = doc(this.db, this.usersCollection, userId);
                const userSnap = await transaction.get(userRef);

                let currentCoins = userSnap.exists() ? (userSnap.data()[this.coinsField] || 0) : 0;
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
     * Deposits coins from a user's main balance to their bank balance.
     * Sets isBanked to true.
     * @param {string} userId The Discord user ID.
     * @param {number} amount The amount to deposit.
     * @returns {Promise<{coins: number, bankedCoins: number}>} The new main and banked balances.
     * @throws {Error} If amount is invalid or insufficient funds.
     */
    async depositCoins(userId, amount) {
        if (amount <= 0) {
            throw new Error("Deposit amount must be positive.");
        }

        try {
            let newCoins, newBankedCoins;
            await runTransaction(this.db, async (transaction) => {
                const userRef = doc(this.db, this.usersCollection, userId);
                const userSnap = await transaction.get(userRef);

                const userData = userSnap.exists() ? userSnap.data() : {
                    [this.coinsField]: 0,
                    [this.bankedCoinsField]: 0,
                    [this.isBankedField]: false,
                    [this.lastBankDepositField]: 0,
                    [this.lastBankWithdrawField]: 0,
                };

                let currentCoins = userData[this.coinsField] || 0;
                let currentBankedCoins = userData[this.bankedCoinsField] || 0;

                if (currentCoins < amount) {
                    throw new Error("Insufficient funds in your main balance to deposit.");
                }

                newCoins = currentCoins - amount;
                newBankedCoins = currentBankedCoins + amount;

                transaction.update(userRef, {
                    [this.coinsField]: newCoins,
                    [this.bankedCoinsField]: newBankedCoins,
                    [this.isBankedField]: true, // User is now banked
                    [this.lastBankDepositField]: Date.now(), // Update timestamp
                });
            });
            return { coins: newCoins, bankedCoins: newBankedCoins };
        } catch (error) {
            console.error(`Error depositing coins for user ${userId}:`, error.message);
            throw error;
        }
    }

    /**
     * Withdraws coins from a user's bank balance to their main balance.
     * Sets isBanked to false if all banked coins are withdrawn.
     * @param {string} userId The Discord user ID.
     * @param {number} amount The amount to withdraw.
     * @returns {Promise<{coins: number, bankedCoins: number}>} The new main and banked balances.
     * @throws {Error} If amount is invalid or insufficient banked funds.
     */
    async withdrawCoins(userId, amount) {
        if (amount <= 0) {
            throw new Error("Withdrawal amount must be positive.");
        }

        try {
            let newCoins, newBankedCoins;
            await runTransaction(this.db, async (transaction) => {
                const userRef = doc(this.db, this.usersCollection, userId);
                const userSnap = await transaction.get(userRef);

                const userData = userSnap.exists() ? userSnap.data() : {
                    [this.coinsField]: 0,
                    [this.bankedCoinsField]: 0,
                    [this.isBankedField]: false,
                    [this.lastBankDepositField]: 0,
                    [this.lastBankWithdrawField]: 0,
                };

                let currentCoins = userData[this.coinsField] || 0;
                let currentBankedCoins = userData[this.bankedCoinsField] || 0;

                if (currentBankedCoins < amount) {
                    throw new Error("Insufficient funds in your bank to withdraw.");
                }

                newCoins = currentCoins + amount;
                newBankedCoins = currentBankedCoins - amount;
                const isBanked = newBankedCoins > 0; // Only unbank if all coins are withdrawn

                transaction.update(userRef, {
                    [this.coinsField]: newCoins,
                    [this.bankedCoinsField]: newBankedCoins,
                    [this.isBankedField]: isBanked, // Update bank status
                    [this.lastBankWithdrawField]: Date.now(), // Update timestamp
                });
            });
            return { coins: newCoins, bankedCoins: newBankedCoins };
        } catch (error) {
            console.error(`Error withdrawing coins for user ${userId}:`, error.message);
            throw error;
        }
    }

    /**
     * Checks if a user is currently 'banked' (has coins in the bank).
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
            const usersColRef = collection(this.db, this.usersCollection);
            const snapshot = await getDocs(usersColRef);
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
