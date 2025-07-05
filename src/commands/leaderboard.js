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
    description: 'Shows the top coin holders on the server.',
    slashCommandData: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Shows the top coin holders on the server.'),

    async executeCommand(replyFunction) {
        try {
            const allUsers = await coinManager.getAllUserBalances();

            // Sort users by coins in descending order
            allUsers.sort((a, b) => b.coins - a.coins);

            // Get top 10 users
            const topUsers = allUsers.slice(0, 10);

            const leaderboardEmbed = new EmbedBuilder()
                .setColor(0xFFA500) // Orange color for leaderboard
                .setTitle('🏆 __Top Coin Holders__ 🏆')
                .setDescription('Here are the richest users in the coin system!')
                .setTimestamp();

            if (topUsers.length === 0) {
                leaderboardEmbed.setDescription('No users found in the leaderboard yet. Start playing!');
            } else {
                let leaderboardText = '';
                for (let i = 0; i < topUsers.length; i++) {
                    const user = topUsers[i];
                    // Fetch user tag from Discord if available, otherwise use ID
                    let userTag = user.userId;
                    try {
                        const discordUser = await client.users.fetch(user.userId);
                        userTag = discordUser.username;
                    } catch (e) {
                        // User not found or bot doesn't have access to fetch
                        userTag = `Unknown User (${user.userId.substring(0, 5)}...)`;
                    }
                    leaderboardText += `**${i + 1}.** ${userTag}: **${user.coins}** 💰\n`;
                }
                leaderboardEmbed.addFields({ name: 'Rankings', value: leaderboardText, inline: false });
            }

            await replyFunction({ embeds: [leaderboardEmbed] });

        } catch (error) {
            console.error('Error generating leaderboard:', error);
            await replyFunction({ content: 'An error occurred while fetching the leaderboard.', flags: MessageFlags.Ephemeral });
        }
    },

    async prefixExecute(message, args, coinManager, client) {
        await this.executeCommand((content) => message.channel.send(content));
    },

    async slashExecute(interaction) {
        await interaction.deferReply({ ephemeral: false });
        await this.executeCommand((content) => interaction.followUp(content));
    },
});
