// src/commands/raid.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { RAID_SUCCESS_CHANCE, RAID_MAX_PERCENTAGE, RAID_COOLDOWN_MS } = require('../config/gameConfig');

const raidCooldowns = new Map(); // Stores userId -> lastUsedTimestamp

/**
 * Factory function to create the raid command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @param {import('discord.js').Client} client The Discord client instance. // NEW: Added client
 * @returns {object} The command object.
 */
module.exports = (coinManager, client) => ({ // NEW: Accept client
    name: 'raid',
    description: 'Attempt to raid another user and steal their coins, or lose some of yours!',
    slashCommandData: new SlashCommandBuilder()
        .setName('raid')
        .setDescription('Attempt to raid another user and steal their coins, or lose some of yours!')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user you want to raid')
                .setRequired(true)),

    async executeCommand(raiderId, raiderUsername, targetUser, interaction) {
        // Defer reply is already handled in slashExecute, so no need to defer here again
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

            return interaction.followUp({ content: `You can attempt another raid in ${timeString}.`, flags: MessageFlags.Ephemeral });
        }

        const targetId = targetUser.id;
        const targetUsername = targetUser.username;

        if (raiderId === targetId) {
            return interaction.followUp({ content: 'You cannot raid yourself!', flags: MessageFlags.Ephemeral });
        }

        try {
            const raiderData = await coinManager.getUserData(raiderId);
            const targetData = await coinManager.getUserData(targetId);

            // Check if raider or target is in safe mode
            if (raiderData.isBanked) {
                return interaction.followUp({ content: `${raiderUsername}, you cannot raid while you are in safe mode! Use \`/withdraw\` first.`, flags: MessageFlags.Ephemeral });
            }
            if (targetData.isBanked) {
                return interaction.followUp({ content: `${targetUsername} is currently in safe mode. You cannot raid them!`, flags: MessageFlags.Ephemeral });
            }

            const raiderCoins = raiderData.coins;
            const targetCoins = targetData.coins;

            // Ensure both parties have at least some minimum amount to make the raid meaningful
            if (raiderCoins < 100 || targetCoins < 100) { // Arbitrary minimum for a meaningful raid
                return interaction.followUp({ content: `Both you and your target need at least 100 💰 to participate in a raid.`, flags: MessageFlags.Ephemeral });
            }

            const isSuccess = Math.random() < RAID_SUCCESS_CHANCE; // 50% chance

            let raidAmount;
            let resultMessage;
            let dmMessageToTarget;

            if (isSuccess) {
                // Raider wins: target loses coins, raider gains. Amount is based on target's coins.
                raidAmount = Math.min(Math.floor(targetCoins * RAID_MAX_PERCENTAGE), targetCoins);
                if (raidAmount === 0) {
                    return interaction.followUp(`You successfully attempted to raid ${targetUsername}, but they had no coins to steal!`);
                }
                await coinManager.transferCoins(targetId, raiderId, raidAmount);
                resultMessage = `🎉 **${raiderUsername}** successfully raided **${targetUsername}** and stole **${raidAmount}** 💰!`;
                dmMessageToTarget = `💔 You were raided by **${raiderUsername}** and lost **${raidAmount}** 💰!`;
            } else {
                // Raider loses: raider loses coins, target gains. Amount is based on raider's coins.
                raidAmount = Math.min(Math.floor(raiderCoins * RAID_MAX_PERCENTAGE), raiderCoins);
                if (raidAmount === 0) {
                    return interaction.followUp(`You failed to raid ${targetUsername}, but you had no coins to lose!`);
                }
                await coinManager.transferCoins(raiderId, targetId, raidAmount);
                resultMessage = `💔 **${raiderUsername}** failed to raid **${targetUsername}** and had to pay them **${raidAmount}** 💰!`;
                dmMessageToTarget = `🎉 **${raiderUsername}** attempted to raid you and FAILED! They had to pay you **${raidAmount}** 💰!`;
            }

            raidCooldowns.set(raiderId, now); // Set cooldown for the raider

            // Fetch updated balances for the message
            const updatedRaiderData = await coinManager.getUserData(raiderId);
            const updatedTargetData = await coinManager.getUserData(targetId);

            resultMessage += `\n**${raiderUsername}**'s new balance: **${updatedRaiderData.coins}** 💰.`;
            resultMessage += `\n**${targetUsername}**'s new balance: **${updatedTargetData.coins}** 💰.`;

            // Send DM to the raided user
            try {
                const targetDiscordUser = await client.users.fetch(targetId);
                await targetDiscordUser.send(`${dmMessageToTarget}\nYour new balance: **${updatedTargetData.coins}** 💰.`);
            } catch (dmError) {
                console.error(`Failed to send DM to ${targetUsername} (${targetId}):`, dmError);
                resultMessage += `\n*(Could not send DM notification to ${targetUsername}.)*`;
            }

            await interaction.followUp(resultMessage);

        } catch (error) {
            console.error(`Error in raid command for ${raiderUsername} raiding ${targetUsername}:`, error);
            let errorMessage = `An error occurred during the raid: ${error.message}`;
            if (error.message.includes("Insufficient funds")) {
                errorMessage = `You don't have enough coins to cover the potential loss for this raid.`;
            }
            await interaction.followUp({ content: `Sorry ${raiderUsername}, ${errorMessage}`, flags: MessageFlags.Ephemeral });
        }
    },

    async prefixExecute(message, args) {
        return message.channel.send('The `$raid` command is only available as a slash command (`/raid`).');
    },

    async slashExecute(interaction) {
        // Deferral is handled by commandHandler.js
        const raiderId = interaction.user.id;
        const raiderUsername = interaction.user.username;
        const targetUser = interaction.options.getUser('target');

        await this.executeCommand(raiderId, raiderUsername, targetUser, interaction);
    },
});
