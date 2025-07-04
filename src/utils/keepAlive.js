// src/utils/keepAlive.js
const http = require('http'); // Import Node.js's built-in HTTP module

/**
 * Starts a simple HTTP server to keep the Render service alive.
 * This server listens on the port provided by Render's PORT environment variable.
 */
function startKeepAliveServer() {
    const PORT = process.env.PORT || 3000; // Render provides a PORT env var, default to 3000 for local testing

    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Discord bot is running!\n'); // Simple response
    });

    server.listen(PORT, () => {
        console.log(`Keep-alive server listening on port ${PORT}`);
    });

    // Return the server instance so it can be closed gracefully
    return server;
}

module.exports = {
    startKeepAliveServer
};
