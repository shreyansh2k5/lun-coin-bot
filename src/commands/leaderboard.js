// src/commands/leaderboard.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

/**
 * Factory function to create the leaderboard command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @param {import('discord.js').Client} client The Discord client instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager, client) => ({
    name: 'leaderboard',
    description: 'Shows the top 10 richest users.',
    slashCommandData: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Shows the top 10 richest users.'),

    async executeCommand(replyFunction) {
        try {
            const allUsers = await coinManager.getAllUserBalances();

            // Sort users by coins in descending order
            allUsers.sort((a, b) => b.coins - a.coins);

            // Get top 10 users
            const top10Users = allUsers.slice(0, 10);

            if (top10Users.length === 0) {
                return replyFunction('The leaderboard is currently empty!', false);
            }

            const leaderboardEmbed = new EmbedBuilder()
                .setColor(0xFFA500) // Orange color
                .setTitle('💰 Top 10 Richest Users 💰')
                .setDescription('Here are the users with the most coins!')
                .setTimestamp()
                .setFooter({ text: 'Lun Coin Bot Leaderboard' });

            for (let i = 0; i < top10Users.length; i++) {
                const user = top10Users[i];
                // Fetch Discord user object to get username
                const discordUser = await client.users.fetch(user.userId).catch(() => null); // Catch if user not found
                const username = discordUser ? discordUser.username : `Unknown User (${user.userId})`;

                leaderboardEmbed.addFields({
                    name: `#${i + 1} ${username}`,
                    value: `**${user.coins}** coins`,
                    inline: false,
                });
            }

            await replyFunction({ embeds: [leaderboardEmbed] }, false); // Send the embed, not ephemeral

        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            await replyFunction(`Sorry, there was an error fetching the leaderboard: ${error.message}`, true); // Ephemeral error
        }
    },

    async prefixExecute(message, args) {
        // Prefix commands don't use ephemeral replies in the same way as slash commands
        await this.executeCommand((content, ephemeral) => {
            if (content.embeds) {
                return message.channel.send({ embeds: content.embeds });
            }
            return message.channel.send(content);
        });
    },

    async slashExecute(interaction) {
        // DEFER REPLY IS REMOVED FROM HERE - IT'S NOW IN COMMANDHANDLER.JS
        // await interaction.deferReply({ flags: 0 }); // This line is removed

        // Pass interaction itself as replyFunction, so executeCommand can use defer/followUp
        await this.executeCommand((content, ephemeral) => {
            if (content.embeds) {
                return interaction.followUp({ embeds: content.embeds, flags: ephemeral ? MessageFlags.Ephemeral : 0 });
            }
            return interaction.followUp({ content, flags: ephemeral ? MessageFlags.Ephemeral : 0 });
        });
    },
});
