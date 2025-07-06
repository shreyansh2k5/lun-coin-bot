// src/commands/beg.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { MIN_BEG_REWARD, MAX_BEG_REWARD, BEG_COOLDOWN_MS } = require('../config/gameConfig');

const begCooldowns = new Map(); // Stores userId -> lastUsedTimestamp

/**
 * Factory function to create the beg command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'beg',
    description: `Beg for coins! Get ${MIN_BEG_REWARD}-${MAX_BEG_REWARD} coins every 5 minutes.`,
    slashCommandData: new SlashCommandBuilder()
        .setName('beg')
        .setDescription(`Beg for coins! Get ${MIN_BEG_REWARD}-${MAX_BEG_REWARD} coins every 5 minutes.`),

    async executeCommand(userId, username, replyFunction) {
        const now = Date.now();
        const lastUsed = begCooldowns.get(userId);

        if (lastUsed && (now - lastUsed < BEG_COOLDOWN_MS)) {
            const timeLeft = BEG_COOLDOWN_MS - (now - lastUsed);
            const minutes = Math.floor(timeLeft / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            let timeString = '';
            if (minutes > 0) timeString += `${minutes} minute(s) `;
            if (seconds > 0) timeString += `${seconds} second(s) `;
            timeString = timeString.trim();

            return replyFunction(`${username}, you can beg again in ${timeString}.`, true);
        }

        try {
            const reward = Math.floor(Math.random() * (MAX_BEG_REWARD - MIN_BEG_REWARD + 1)) + MIN_BEG_REWARD;
            const newBalance = await coinManager.addCoins(userId, reward);
            begCooldowns.set(userId, now); // Update last used timestamp

            await replyFunction(`🙏 ${username}, you begged and received **${reward}** 💰! Your new balance is **${newBalance}** 💰.`);
        } catch (error) {
            console.error(`Error in beg command for ${username}:`, error);
            await replyFunction(`Sorry ${username}, there was an error while begging: ${error.message}`, true);
        }
    },

    async prefixExecute(message, args) {
        const userId = message.author.id;
        const username = message.author.username;
        await this.executeCommand(userId, username, (content, ephemeral) => message.channel.send(content));
    },

    async slashExecute(interaction) {
        try {
            // Defer reply first
            await interaction.deferReply({ flags: 0 }); // Beg command should be public
        } catch (deferError) {
            console.error(`Failed to defer reply for /${interaction.commandName}:`, deferError);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Sorry, I took too long to respond. Please try again.', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to send timeout error:", e));
            }
            return;
        }

        const userId = interaction.user.id;
        const username = interaction.user.username;
        const now = Date.now();
        const lastUsed = begCooldowns.get(userId);

        if (lastUsed && (now - lastUsed < BEG_COOLDOWN_MS)) {
            const timeLeft = BEG_COOLDOWN_MS - (now - lastUsed);
            const minutes = Math.floor(timeLeft / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            let timeString = '';
            if (minutes > 0) timeString += `${minutes} minute(s) `;
            if (seconds > 0) timeString += `${seconds} second(s) `;
            timeString = timeString.trim();

            return interaction.followUp({ content: `${username}, you can beg again in ${timeString}.`, flags: MessageFlags.Ephemeral });
        }

        try {
            const reward = Math.floor(Math.random() * (MAX_BEG_REWARD - MIN_BEG_REWARD + 1)) + MIN_BEG_REWARD;
            const newBalance = await coinManager.addCoins(userId, reward);
            begCooldowns.set(userId, now); // Update last used timestamp

            await interaction.followUp(`🙏 ${username}, you begged and received **${reward}** 💰! Your new balance is **${newBalance}** 💰.`);
        } catch (error) {
            console.error(`Error in /beg command for ${username}:`, error);
            await interaction.followUp({ content: `Sorry ${username}, there was an error while begging: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },
});
