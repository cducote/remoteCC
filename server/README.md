# RemoteCC Server

Node.js server that spawns a terminal process and streams it to mobile clients via WebSocket.

## Installation

```bash
npm install
```

## Usage

### Basic

```bash
npm start
```

This will:
1. Start a WebSocket server on port 3456
2. Display a QR code in your terminal
3. Wait for a mobile device to connect
4. Spawn `claude-code` when connected
5. Stream all output to connected devices

### With Custom Command

```bash
node src/index.js npm test
node src/index.js python app.py
node src/index.js bash
```

### With Custom Port

```bash
node src/index.js --port 8080
```

## How It Works

1. **WebSocket Server**: Listens for connections from mobile clients
2. **Token Authentication**: Each session gets a unique token embedded in QR code
3. **PTY Management**: Spawns commands in a pseudo-terminal for proper TTY support
4. **Bidirectional Streaming**: Terminal output → mobile, mobile input → terminal
5. **Multi-Client**: Multiple phones can connect to the same session

## Message Protocol

### Server → Client

```javascript
// Connection successful
{
  type: "connected",
  message: "Connected to RemoteCC server"
}

// Terminal output
{
  type: "output",
  data: "terminal output string"
}

// Process exited
{
  type: "exit",
  exitCode: 0,
  signal: null
}

// Error
{
  type: "error",
  message: "Error description"
}
```

### Client → Server

```javascript
// User input
{
  type: "input",
  data: "command text\n"
}
```

## Configuration

Edit these values in `src/server.js`:

- `port`: WebSocket server port (default: 3456)
- `cols/rows`: Terminal size (default: 80x30)
- `maxBufferSize`: Lines to keep in history (default: 100)

## Troubleshooting

### Port Already in Use

```bash
node src/index.js --port 3457
```

### Command Not Found

Make sure the command is in your PATH:

```bash
which claude-code
```

### Permission Denied

Some commands may need sudo. The server runs with your user permissions.

## Development

Watch mode for development:

```bash
npm run dev
```
