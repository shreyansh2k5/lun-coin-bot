// src/utils/keepAlive.js
const express = require('express');
const app = express();
const port = process.env.PORT || 10000; // Use environment variable for port

/**
 * Starts a simple HTTP server to keep the bot alive on platforms like Render.
 * It listens on a specified port and responds to basic GET requests.
 */
function keepAlive() {
  app.get('/', (req, res) => {
    res.send('Bot is alive!');
  });

  app.listen(port, () => {
    console.log(`Keep-alive server listening on port ${port}`);
  });
}

// Export the keepAlive function as a named export
module.exports = {
    keepAlive
};
