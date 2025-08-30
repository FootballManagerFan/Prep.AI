// Main server entry point
// This file serves as the entry point and imports the actual server from src/server

const path = require('path');
const server = require('./src/server');

// Start the server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Prep.AI Server running on port ${PORT}`);
  console.log(`📱 Frontend available at: http://localhost:${PORT}`);
  console.log(`🔧 API endpoints at: http://localhost:${PORT}/api`);
});
