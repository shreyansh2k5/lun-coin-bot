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

    // Changed replyFunction to interaction (for slash) or message (for prefix) for direct use
    async executeCommand(targetId, targetUsername, targetAvatarURL, targetMember, interactionOrMessage) {
        try {
            // Fetch coin data for the target user
            const userData = await coinManager.getUserData(targetId);
            const coins = userData.coins;
            const isBanked = userData.isBanked;

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

            // Determine if it's an interaction or a message and reply accordingly
            if (interactionOrMessage.followUp) { // It's an interaction
                // Use followUp after deferReply
                await interactionOrMessage.followUp({ embeds: [profileEmbed] });
            } else { // It's a message
                await interactionOrMessage.channel.send({ embeds: [profileEmbed] });
            }

        } catch (error) {
            console.error(`Error in profile command for user ${targetId}:`, error);
            // Determine if it's an interaction or a message and reply accordingly for errors
            if (interactionOrMessage.followUp) { // It's an interaction
                // Use followUp after deferReply, and use flags
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

        // Pass the message object directly
        await this.executeCommand(targetId, targetUsername, targetAvatarURL, targetMember, message);
    },

    async slashExecute(interaction) {
        try {
            // Defer reply first to prevent "Unknown interaction" error
            // Use flags: 0 for public replies (not ephemeral)
            await interaction.deferReply({ flags: 0 });
        } catch (deferError) {
            console.error(`Failed to defer reply for /${interaction.commandName}:`, deferError);
            // If defer fails, try to reply ephemerally immediately as a last resort
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Sorry, I took too long to respond. Please try again.', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to send timeout error:", e));
            }
            return; // Stop execution if deferral failed
        }

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetMember = interaction.options.getMember('user') || interaction.member;

        const targetId = targetUser.id;
        const targetUsername = targetUser.username;
        const targetAvatarURL = targetUser.displayAvatarURL({ dynamic: true });

        // Pass the interaction object directly
        await this.executeCommand(targetId, targetUsername, targetAvatarURL, targetMember, interaction);
    },
});
