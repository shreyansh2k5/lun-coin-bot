// src/utils/richPresence.js
const { ActivityType } = require('discord.js');

/**
 * Sets the bot's activity (rich presence) on Discord.
 * @param {import('discord.js').ClientUser} clientUser The ClientUser object from client.user.
 * @param {string} activityName The name of the activity (e.g., "with coins").
 * @param {ActivityType} activityType The type of activity (e.g., ActivityType.Playing).
 * @param {string} [url] Optional URL for streaming activity type.
 */
function setBotActivity(clientUser, activityName, activityType, url = null) {
    const options = { type: activityType };
    if (url && activityType === ActivityType.Streaming) {
        options.url = url;
    }
    clientUser.setActivity(activityName, options);
    console.log(`Bot activity set to "${activityName}" (Type: ${ActivityType[activityType]}).`);
}

module.exports = {
    setBotActivity
};
