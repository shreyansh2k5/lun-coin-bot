// src/commands/shop.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { PET_PRICES } = require('../config/gameConfig');

/**
 * Factory function to create the shop command.
 * @param {import('../services/coinManager')} coinManager The CoinManager instance.
 * @returns {object} The command object.
 */
module.exports = (coinManager) => ({
    name: 'shop',
    description: 'Browse and buy pets!',
    slashCommandData: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Browse and buy pets!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lists all available pets and their prices.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Buy a pet from the shop.')
                .addStringOption(option =>
                    option.setName('pet_name')
                        .setDescription('The name of the pet you want to buy (e.g., dog, cat)')
                        .setRequired(true)
                        .setAutocomplete(true))), // Enable autocomplete for pet names

    // Helper function to create the pet list embed
    createPetListEmbed() {
        const shopEmbed = new EmbedBuilder()
            .setColor(0x00FF00) // Green color
            .setTitle('🐾 Pet Shop 🐾')
            .setDescription('Here are the adorable pets you can buy!')
            .setTimestamp()
            .setFooter({ text: 'Lun Coin Bot Shop' });

        let description = '';
        for (const pet in PET_PRICES) {
            const { price, emoji } = PET_PRICES[pet];
            description += `${emoji} **${pet.charAt(0).toUpperCase() + pet.slice(1)}**: **${price}** 💰\n`;
        }

        if (description) {
            shopEmbed.addFields(
                { name: 'Available Pets', value: description, inline: false },
                { name: 'How to Buy', value: 'To purchase a pet, use `/shop buy <pet_name>` (e.g., `/shop buy dog`)', inline: false }
            );
        } else {
            shopEmbed.setDescription('No pets available in the shop right now.');
        }

        return shopEmbed;
    },

    async executeCommand(userId, username, subcommand, petName, interactionOrMessage) {
        // Defer reply is handled by commandHandler.js for slash commands
        // For prefix, we reply directly.

        try {
            if (subcommand === 'list' || !subcommand) { // If no subcommand is provided (for prefix or default slash behavior)
                const shopEmbed = this.createPetListEmbed();
                if (interactionOrMessage.followUp) { // It's a slash interaction
                    await interactionOrMessage.followUp({ embeds: [shopEmbed] });
                } else { // It's a prefix message
                    await interactionOrMessage.channel.send({ embeds: [shopEmbed] });
                }

            } else if (subcommand === 'buy') {
                const petInfo = PET_PRICES[petName.toLowerCase()];

                if (!petInfo) {
                    const errorMessage = `Sorry, '${petName}' is not a valid pet. Use \`/shop list\` to see available pets.`;
                    if (interactionOrMessage.followUp) {
                        return interactionOrMessage.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
                    } else {
                        return interactionOrMessage.channel.send(errorMessage);
                    }
                }

                const { price, emoji } = petInfo;

                try {
                    const { newBalance, ownedPets } = await coinManager.buyPet(userId, petName.toLowerCase(), price);
                    const successMessage = `🎉 **${username}**, you successfully bought a **${petName.charAt(0).toUpperCase() + petName.slice(1)}** ${emoji} for **${price}** 💰! Your new balance is **${newBalance}** 💰. You now own ${ownedPets.length} pets.`;
                    if (interactionOrMessage.followUp) {
                        await interactionOrMessage.followUp(successMessage);
                    } else {
                        await interactionOrMessage.channel.send(successMessage);
                    }
                } catch (buyError) {
                    let errorMessage = `Failed to buy ${petName}: ${buyError.message}`;
                    if (buyError.message.includes("Insufficient funds")) {
                        errorMessage = `You don't have enough coins to buy a **${petName.charAt(0).toUpperCase() + petName.slice(1)}**. You need **${price}** 💰.`;
                    }
                    if (interactionOrMessage.followUp) {
                        await interactionOrMessage.followUp({ content: `Sorry ${username}, ${errorMessage}`, flags: MessageFlags.Ephemeral });
                    } else {
                        await interactionOrMessage.channel.send(`Sorry ${username}, ${errorMessage}`);
                    }
                }
            }

        } catch (error) {
            console.error(`Error in shop command for ${username}:`, error);
            const errorMessage = `Sorry ${username}, an unexpected error occurred: ${error.message}`;
            if (interactionOrMessage.followUp) {
                await interactionOrMessage.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
            } else {
                await interactionOrMessage.channel.send(errorMessage);
            }
        }
    },

    async prefixExecute(message, args) {
        // For prefix command, always show the list
        await this.executeCommand(message.author.id, message.author.username, 'list', null, message);
    },

    async slashExecute(interaction) {
        try {
            // Defer reply first for slash commands
            await interaction.deferReply({ flags: 0 }); // Shop list should be public
        } catch (deferError) {
            console.error(`Failed to defer reply for /${interaction.commandName}:`, deferError);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Sorry, I took too long to respond. Please try again.', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to send timeout error:", e));
            }
            return;
        }

        const subcommand = interaction.options.getSubcommand(false); // false means it can be null if no subcommand is provided
        const petName = interaction.options.getString('pet_name');

        // If no subcommand is explicitly chosen (e.g., just /shop), default to 'list'
        await this.executeCommand(interaction.user.id, interaction.user.username, subcommand || 'list', petName, interaction);
    },

    // Autocomplete handler for the 'buy' subcommand's 'pet_name' option
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        let choices = [];

        if (focusedOption.name === 'pet_name') {
            const currentInput = focusedOption.value.toLowerCase();
            choices = Object.keys(PET_PRICES)
                .filter(pet => pet.startsWith(currentInput))
                .map(pet => ({ name: `${PET_PRICES[pet].emoji} ${pet.charAt(0).toUpperCase() + pet.slice(1)} (${PET_PRICES[pet].price} 💰)`, value: pet }));
        }

        await interaction.respond(choices);
    },
});
