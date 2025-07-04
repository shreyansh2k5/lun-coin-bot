// src/commands/raid.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { RAID_SUCCESS_CHANCE, RAID_MAX_PERCENTAGE, RAID_COOLDOWN_MS } = require('../config/gameConfig');

const raidCooldowns = new Map(); // Stores userId -> lastUsedTimestamp

/**
 * Factory function to create the raid command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'raid',
    description: 'Attempt to raid another user and steal their coins, or lose some of yours!',
    slashCommandData: new SlashCommandBuilder()
        .setName('raid')
        .setDescription('Attempt to raid another user and steal their coins, or lose some of yours!')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user you want to raid')
                .setRequired(true)),

    async executeCommand(raiderId, raiderUsername, targetUser, replyFunction) {
        const now = Date.now();
        const lastUsed = raidCooldowns.get(raiderId);

        // Cooldown check for raider
        if (lastUsed && (now - lastUsed < RAID_COOLDOWN_MS)) {
            const timeLeft = RAID_COOLDOWN_MS - (now - lastUsed);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            let timeString = '';
            if (hours > 0) timeString += `${hours} hour(s) `;
            if (minutes > 0) timeString += `${minutes} minute(s) `;
            if (seconds > 0) timeString += `${seconds} second(s) `;
            timeString = timeString.trim();

            return replyFunction(`You can attempt another raid in ${timeString}.`, true);
        }

        const targetId = targetUser.id;
        const targetUsername = targetUser.username;

        if (raiderId === targetId) {
            return replyFunction('You cannot raid yourself!', true);
        }

        try {
            const raiderData = await coinManager.getUserData(raiderId);
            const targetData = await coinManager.getUserData(targetId);

            // Check if raider or target is banked
            if (raiderData.isBanked) {
                return replyFunction(`${raiderUsername}, you cannot raid while your coins are in the bank! Withdraw them first.`, true);
            }
            if (targetData.isBanked) {
                return replyFunction(`${targetUsername}'s coins are safely in the bank. You cannot raid them!`, true);
            }

            const raiderCoins = raiderData.coins;
            const targetCoins = targetData.coins;

            // Determine the maximum possible amount to lose/gain based on the loser's current balance
            // This ensures that the amount is always within 25% of what the *loser* has.
            const maxRaidAmountFromRaider = Math.floor(raiderCoins * RAID_MAX_PERCENTAGE);
            const maxRaidAmountFromTarget = Math.floor(targetCoins * RAID_MAX_PERCENTAGE);

            // Ensure both parties have at least some minimum amount to make the raid meaningful
            if (raiderCoins < 100 || targetCoins < 100) { // Arbitrary minimum for a meaningful raid
                return replyFunction(`Both you and your target need at least 100 💰 to participate in a raid.`, true);
            }

            const isSuccess = Math.random() < RAID_SUCCESS_CHANCE; // 50% chance

            let raidAmount;
            let resultMessage;

            if (isSuccess) {
                // Raider wins: target loses coins, raider gains. Amount is based on target's coins.
                raidAmount = Math.min(Math.floor(targetCoins * RAID_MAX_PERCENTAGE), targetCoins);
                if (raidAmount === 0) { // If target has very few coins, raidAmount might be 0
                    return replyFunction(`You successfully attempted to raid ${targetUsername}, but they had no coins to steal!`, false);
                }
                await coinManager.transferCoins(targetId, raiderId, raidAmount);
                resultMessage = `🎉 **${raiderUsername}** successfully raided **${targetUsername}** and stole **${raidAmount}** 💰!`;
            } else {
                // Raider loses: raider loses coins, target gains. Amount is based on raider's coins.
                raidAmount = Math.min(Math.floor(raiderCoins * RAID_MAX_PERCENTAGE), raiderCoins);
                if (raidAmount === 0) { // If raider has very few coins, raidAmount might be 0
                    return replyFunction(`You failed to raid ${targetUsername}, but you had no coins to lose!`, false);
                }
                await coinManager.transferCoins(raiderId, targetId, raidAmount);
                resultMessage = `💔 **${raiderUsername}** failed to raid **${targetUsername}** and had to pay them **${raidAmount}** 💰!`;
            }

            raidCooldowns.set(raiderId, now); // Set cooldown for the raider

            // Fetch updated balances for the message
            const updatedRaiderData = await coinManager.getUserData(raiderId);
            const updatedTargetData = await coinManager.getUserData(targetId);

            resultMessage += `\n**${raiderUsername}**'s new balance: **${updatedRaiderData.coins}** 💰.`;
            resultMessage += `\n**${targetUsername}**'s new balance: **${updatedTargetData.coins}** 💰.`;

            await replyFunction(resultMessage, false); // Not ephemeral, as it affects two users

        } catch (error) {
            console.error(`Error in raid command for ${raiderUsername} raiding ${targetUsername}:`, error);
            let errorMessage = `An error occurred during the raid: ${error.message}`;
            if (error.message.includes("Insufficient funds")) {
                errorMessage = `You don't have enough coins to cover the potential loss for this raid. You need at least ${Math.ceil(raiderCoins * RAID_MAX_PERCENTAGE)} 💰 to attempt this raid.`;
            }
            await replyFunction(`Sorry ${raiderUsername}, ${errorMessage}`, true);
        }
    },

    async prefixExecute(message, args) {
        // Prefix commands don't support user mentions as easily as slash commands
        // For simplicity, we'll only implement this as a slash command.
        // If you need prefix support, you'd parse args[0] to get a user ID.
        return message.channel.send('The `$raid` command is only available as a slash command (`/raid`).');
    },

    async slashExecute(interaction) {
        const raiderId = interaction.user.id;
        const raiderUsername = interaction.user.username;
        const targetUser = interaction.options.getUser('target'); // Get the target user object

        await this.executeCommand(raiderId, raiderUsername, targetUser, (content, ephemeral) => interaction.followUp({ content, flags: ephemeral ? MessageFlags.Ephemeral : 0 }));
    },
});
