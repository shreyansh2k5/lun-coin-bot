// src/commands/profile.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

/**
 * Factory function to create the profile command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'profile',
    description: 'View your coin profile and server roles.',
    slashCommandData: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your coin profile and server roles.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose profile you want to view (defaults to yourself)')
                .setRequired(false)), // Not required, defaults to self

    async executeCommand(targetId, targetUsername, targetAvatarURL, targetMember, replyFunction) {
        try {
            // Fetch coin data for the target user
            const userData = await coinManager.getUserData(targetId);
            const coins = userData.coins;
            const isBanked = userData.isBanked; // Get only the isBanked status

            // Get roles if the command was run in a guild context and targetMember is available
            let rolesString = 'No roles found.';
            if (targetMember && targetMember.roles) {
                // Filter out @everyone role and map to role names
                const roles = targetMember.roles.cache
                    .filter(role => role.name !== '@everyone')
                    .map(role => role.name)
                    .join(', ');
                rolesString = roles.length > 0 ? roles : 'No special roles.';
            }

            // Create the embedded message
            const profileEmbed = new EmbedBuilder()
                .setColor(0x0099FF) // A nice blue color
                .setTitle(`${targetUsername}'s Profile`)
                .setThumbnail(targetAvatarURL) // Set user's avatar as thumbnail
                .addFields(
                    { name: '💰 Balance', value: `**${coins}** coins`, inline: true }, // Only main balance
                    { name: '🔒 Safe Mode Status', value: isBanked ? 'Active (Cannot be raided)' : 'Inactive (Can be raided)', inline: true }, // Changed field name
                    { name: '🎭 Server Roles', value: rolesString, inline: false }
                )
                .setTimestamp() // Adds a timestamp at the bottom
                .setFooter({ text: 'Lun Coin Bot Profile' }); // Footer text

            await replyFunction({ embeds: [profileEmbed] }, false); // Send the embed, not ephemeral

        } catch (error) {
            console.error(`Error in profile command for user ${targetId}:`, error);
            await replyFunction(`Sorry, there was an error fetching the profile: ${error.message}`, true); // Ephemeral error
        }
    },

    async prefixExecute(message, args) {
        const targetUser = message.mentions.users.first() || message.author;
        const targetMember = message.mentions.members.first() || message.member;

        const targetId = targetUser.id;
        const targetUsername = targetUser.username;
        const targetAvatarURL = targetUser.displayAvatarURL({ dynamic: true });

        await this.executeCommand(targetId, targetUsername, targetAvatarURL, targetMember, (content, ephemeral) => {
            if (content.embeds) {
                return message.channel.send({ embeds: content.embeds });
            }
            return message.channel.send(content);
        });
    },

    async slashExecute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetMember = interaction.options.getMember('user') || interaction.member;

        const targetId = targetUser.id;
        const targetUsername = targetUser.username;
        const targetAvatarURL = targetUser.displayAvatarURL({ dynamic: true });

        await this.executeCommand(targetId, targetUsername, targetAvatarURL, targetMember, (content, ephemeral) => interaction.followUp({ content, embeds: content.embeds, flags: ephemeral ? MessageFlags.Ephemeral : 0 }));
    },
});
