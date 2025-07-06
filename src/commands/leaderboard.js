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

    // executeCommand now accepts interactionOrMessage directly for unified handling
    async executeCommand(interactionOrMessage) {
        try {
            const allUsers = await coinManager.getAllUserBalances();

            // Sort users by coins in descending order
            allUsers.sort((a, b) => b.coins - a.coins);

            // Get top 10 users
            const top10Users = allUsers.slice(0, 10);

            if (top10Users.length === 0) {
                if (interactionOrMessage.followUp) {
                    return interactionOrMessage.followUp('The leaderboard is currently empty!');
                } else {
                    return interactionOrMessage.channel.send('The leaderboard is currently empty!');
                }
            }

            const leaderboardEmbed = new EmbedBuilder()
                .setColor(0xFFA500) // Orange color
                .setTitle('💰 Top 10 Richest Users �')
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

            if (interactionOrMessage.followUp) {
                await interactionOrMessage.followUp({ embeds: [leaderboardEmbed] });
            } else {
                await interactionOrMessage.channel.send({ embeds: [leaderboardEmbed] });
            }

        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            if (interactionOrMessage.followUp) {
                await interactionOrMessage.followUp({ content: `Sorry, there was an error fetching the leaderboard: ${error.message}`, flags: MessageFlags.Ephemeral });
            } else {
                await interactionOrMessage.channel.send(`Sorry, there was an error fetching the leaderboard: ${error.message}`);
            }
        }
    },

    async prefixExecute(message, args) {
        // Pass the message object directly
        await this.executeCommand(message);
    },

    async slashExecute(interaction) {
        try {
            // Defer reply first to prevent "Unknown interaction" error
            // This command can take time, so defer it here.
            await interaction.deferReply({ flags: 0 }); // Leaderboard should be public
        } catch (deferError) {
            console.error(`Failed to defer reply for /${interaction.commandName}:`, deferError);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Sorry, I took too long to respond. Please try again.', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to send timeout error:", e));
            }
            return;
        }

        // Pass interaction directly
        await this.executeCommand(interaction);
    },
});
