// src/config/gameConfig.js

module.exports = {
    // Coin System Defaults
    DEFAULT_BALANCE: 5000,

    // Daily Command
    DAILY_REWARD: 3000,
    DAILY_COOLDOWN_MS: 24 * 60 * 60 * 1000, // 24 hours

    // Beg Command
    MIN_BEG_REWARD: 1,
    MAX_BEG_REWARD: 1000,
    BEG_COOLDOWN_MS: 5 * 60 * 1000, // 5 minutes

    // Flip Command
    FLIP_WIN_CHANCE: 0.5, // 50% chance

    // Roll Command
    ROLL_WIN_MULTIPLIER: 6, // Win amount is bet * (multiplier - 1)
    ROLL_WIN_CONDITION: 6, // Roll a 6 to win

    // Raid Command
    RAID_SUCCESS_CHANCE: 0.5, // 50% chance
    RAID_MAX_PERCENTAGE: 0.25, // Max 25% of loser's balance
    RAID_COOLDOWN_MS: 1 * 60 * 60 * 1000, // 1 hour cooldown for raider

    // Bank Toggle Command (Deposit/Withdraw)
    BANK_TOGGLE_COOLDOWN_MS: 24 * 60 * 60 * 1000, // 24 hours cooldown for changing bank status

    // Pet Shop (NEW)
    PET_PRICES: {
        dog: { price: 90000, emoji: '🐶' },
        cat: { price: 70000, emoji: '🐱' },
        hamster: { price: 10000000, emoji: '🐹' },
        rabbit: { price: 15000, emoji: '🐰' },
        parrot: { price: 12000, emoji: '🦜' },
        horse: { price: 45000, emoji: '🐎' },
        squirrel: { price: 10000, emoji: '🐿️' },
        goldfish: { price: 7000, emoji: '🐠' },
        eagle: { price: 100000, emoji: '🦅' },
        lion: { price: 230000, emoji: '🦁' },
        tiger: { price: 350000, emoji: '🐯' },
    },
};
