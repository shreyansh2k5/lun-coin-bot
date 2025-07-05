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

    async executeCommand(targetId, targetUsername, targetAvatarURL, targetMember, interactionOrMessage) {
        try {
            const userData = await coinManager.getUserData(targetId);
            const coins = userData.coins;
            const isBanked = userData.isBanked;

            let rolesString = 'No roles found.';
            if (targetMember && targetMember.roles) {
                const roles = targetMember.roles.cache
                    .filter(role => role.name !== '@everyone')
                    .map(role => role.name)
                    .join(', ');
                rolesString = roles.length > 0 ? roles : 'No special roles.';
            }

            const profileEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`${targetUsername}'s Profile`)
                .setThumbnail(targetAvatarURL)
                .addFields(
                    { name: '💰 Balance', value: `**${coins}** coins`, inline: true },
                    { name: '🔒 Safe Mode Status', value: isBanked ? 'Active (Cannot be raided)' : 'Inactive (Can be raided)', inline: true },
                    { name: '🎭 Server Roles', value: rolesString, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Lun Coin Bot Profile' });

            if (interactionOrMessage.followUp) { // It's an interaction
                await interactionOrMessage.followUp({ embeds: [profileEmbed] });
            } else { // It's a message
                await interactionOrMessage.channel.send({ embeds: [profileEmbed] });
            }

        } catch (error) {
            console.error(`Error in profile command for user ${targetId}:`, error);
            if (interactionOrMessage.followUp) { // It's an interaction
                await interactionOrMessage.followUp({ content: `Sorry, there was an error fetching the profile: ${error.message}`, flags: MessageFlags.Ephemeral });
            } else { // It's a message
                await interactionOrMessage.channel.send(`Sorry, there was an error fetching the profile: ${error.message}`);
            }
        }
    },

    async prefixExecute(message, args) {
        const targetUser = message.mentions.users.first() || message.author;
        const targetMember = message.mentions.members.first() || message.member;

        const targetId = targetUser.id;
        const targetUsername = targetUser.username;
        const targetAvatarURL = targetUser.displayAvatarURL({ dynamic: true });

        await this.executeCommand(targetId, targetUsername, targetAvatarURL, targetMember, message);
    },

    async slashExecute(interaction) {
        // DEFER REPLY IS REMOVED FROM HERE - IT'S NOW IN COMMANDHANDLER.JS
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetMember = interaction.options.getMember('user') || interaction.member;

        const targetId = targetUser.id;
        const targetUsername = targetUser.username;
        const targetAvatarURL = targetUser.displayAvatarURL({ dynamic: true });

        await this.executeCommand(targetId, targetUsername, targetAvatarURL, targetMember, interaction);
    },
});
