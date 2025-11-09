#!/usr/bin/env node

import { RemoteCCServer } from './server.js';
import { parseArgs } from 'node:util';

// Parse command line arguments
const { values, positionals } = parseArgs({
  options: {
    port: {
      type: 'string',
      short: 'p',
    },
    help: {
      type: 'boolean',
      short: 'h',
    }
  },
  allowPositionals: true
});

if (values.help) {
  console.log(`
RemoteCC - Remote Claude Code

Usage:
  remotecc [command] [options]

Options:
  -p, --port <port>     Port to run server on (default: 3456)
  -h, --help            Show this help message

Examples:
  remotecc                          # Start with claude
  remotecc --port 8080              # Use custom port
  remotecc npm start                # Run custom command
`);
  process.exit(0);
}

// Get command and args
const command = positionals[0] || 'claude';
const commandArgs = positionals.slice(1);

// Create and start server
const server = new RemoteCCServer({
  port: values.port ? parseInt(values.port, 10) : 3456,
  command,
  commandArgs
});

// Handle graceful shutdown
const shutdown = () => {
  server.cleanup();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
server.start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
