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

    async executeCommand(userId, username, subcommand, petName, interaction) {
        // Defer reply is handled by commandHandler.js

        try {
            if (subcommand === 'list') {
                const shopEmbed = new EmbedBuilder()
                    .setColor(0x00FF00) // Green color
                    .setTitle('🐾 Pet Shop 🐾')
                    .setDescription('Here are the adorable pets you can buy!')
                    .setTimestamp()
                    .setFooter({ text: 'Use /shop buy <pet_name> to purchase!' });

                let description = '';
                for (const pet in PET_PRICES) {
                    const { price, emoji } = PET_PRICES[pet];
                    description += `${emoji} **${pet.charAt(0).toUpperCase() + pet.slice(1)}**: **${price}** 💰\n`;
                }
                shopEmbed.setDescription(description || 'No pets available in the shop right now.');

                await interaction.followUp({ embeds: [shopEmbed] });

            } else if (subcommand === 'buy') {
                const petInfo = PET_PRICES[petName.toLowerCase()];

                if (!petInfo) {
                    return interaction.followUp({ content: `Sorry, '${petName}' is not a valid pet. Use \`/shop list\` to see available pets.`, flags: MessageFlags.Ephemeral });
                }

                const { price, emoji } = petInfo;

                try {
                    const { newBalance, ownedPets } = await coinManager.buyPet(userId, petName.toLowerCase(), price);
                    await interaction.followUp(`🎉 **${username}**, you successfully bought a **${petName.charAt(0).toUpperCase() + petName.slice(1)}** ${emoji} for **${price}** 💰! Your new balance is **${newBalance}** 💰. You now own ${ownedPets.length} pets.`);
                } catch (buyError) {
                    let errorMessage = `Failed to buy ${petName}: ${buyError.message}`;
                    if (buyError.message.includes("Insufficient funds")) {
                        errorMessage = `You don't have enough coins to buy a **${petName.charAt(0).toUpperCase() + petName.slice(1)}**. You need **${price}** 💰.`;
                    }
                    await interaction.followUp({ content: `Sorry ${username}, ${errorMessage}`, flags: MessageFlags.Ephemeral });
                }
            }

        } catch (error) {
            console.error(`Error in shop command for ${username}:`, error);
            await interaction.followUp({ content: `Sorry ${username}, an unexpected error occurred: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    },

    async prefixExecute(message, args) {
        return message.channel.send('The `$shop` command is only available as a slash command (`/shop`).');
    },

    async slashExecute(interaction) {
        // Deferral is handled by commandHandler.js
        const subcommand = interaction.options.getSubcommand();
        const petName = interaction.options.getString('pet_name');

        await this.executeCommand(interaction.user.id, interaction.user.username, subcommand, petName, interaction);
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
