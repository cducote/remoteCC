# RemoteCC - Remote Claude Code

Control Claude Code from your mobile device. Run Claude Code on your computer, scan a QR code with your phone, and interact with it from anywhere in your home or office.

## Features

- **Zero Configuration**: No API keys, no cloud services, no complex setup
- **Local-First**: Everything runs on your local network
- **QR Code Pairing**: Scan and connect in seconds
- **Real-Time Streaming**: See terminal output instantly on your phone
- **Quick Actions**: One-tap buttons for common inputs (y/n, Ctrl+C, Tab, etc.)
- **Auto-Reconnect**: Handles network interruptions gracefully

## Use Cases

- Walk away from your desk while Claude Code works
- Review and approve changes from your couch
- Monitor long-running tasks from another room
- Use Claude Code without being tied to your computer

## Quick Start

### Prerequisites

- **Computer**: Node.js 18+ installed
- **Mobile**: Expo Go app installed ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Both devices on the same WiFi network

### Installation

```bash
# Clone this repository
git clone https://github.com/yourusername/remotecc.git
cd remotecc

# Install server dependencies
cd server
npm install

# Install mobile dependencies
cd ../mobile
npm install
```

### Usage

**1. Start the server on your computer:**

```bash
cd server
npm start
```

A QR code will appear in your terminal.

**2. Start the mobile app:**

```bash
cd mobile
npm start
```

Then:
- Press `i` for iOS simulator, `a` for Android emulator
- Or scan the Expo QR code with Expo Go app on your physical device

**3. Connect to your server:**

- In the mobile app, scan the RemoteCC server QR code
- You'll be connected and see Claude Code output streaming to your phone
- Start chatting with Claude Code from your mobile device!

## How It Works

```
┌─────────────┐                      ┌─────────────┐
│             │   WebSocket (WiFi)   │             │
│  Computer   │ ◄──────────────────► │   Phone     │
│             │                      │             │
│ ┌─────────┐ │                      │ ┌─────────┐ │
│ │ Node.js │ │                      │ │  Expo   │ │
│ │ Server  │ │                      │ │  App    │ │
│ └────┬────┘ │                      │ └────▲────┘ │
│      │      │                      │      │      │
│      ▼      │                      │      │      │
│ ┌─────────┐ │                      │   Displays  │
│ │   PTY   │ │                      │   Output &  │
│ │(claude- │ │                      │   Sends     │
│ │ code)   │ │                      │   Input     │
│ └─────────┘ │                      │             │
└─────────────┘                      └─────────────┘
```

1. Server spawns `claude-code` in a pseudo-terminal (PTY)
2. Server displays a QR code with WebSocket connection details
3. Mobile app scans QR code and connects via WebSocket
4. All terminal output streams to both local terminal AND your phone
5. Input from phone is sent back to the PTY
6. Walk away and keep interacting!

## Project Structure

```
remotecc/
├── server/              # Node.js WebSocket server
│   ├── src/
│   │   ├── index.js    # CLI entry point
│   │   └── server.js   # WebSocket & PTY logic
│   └── package.json
│
├── mobile/              # React Native Expo app
│   ├── src/
│   │   ├── screens/
│   │   │   ├── QRScannerScreen.js
│   │   │   └── TerminalScreen.js
│   │   └── services/
│   │       └── websocket.js
│   ├── App.js
│   └── package.json
│
└── README.md
```

## Advanced Usage

### Custom Commands

Run any command instead of `claude-code`:

```bash
npm start -- npm test        # Run tests
npm start -- python app.py   # Run Python script
```

### Custom Port

```bash
npm start -- --port 8080
```

## Troubleshooting

### QR Code Won't Scan

- Make sure both devices are on the same WiFi network
- Try increasing brightness on your computer screen
- If the QR code is too small, zoom in on your terminal

### Connection Failed

- Check that both devices are on the same WiFi
- Make sure no firewall is blocking the port (default: 3456)
- Try a different port with `--port` flag

### PTY/Command Not Found

- Make sure `claude-code` is installed and in your PATH
- Try running `claude-code` directly in terminal first to verify it works

### Mobile App Won't Connect

- Ensure Expo Go is up to date
- Try restarting the Expo dev server
- Check that camera permissions are granted for QR scanning

## Security

- **Token-based authentication**: Each session generates a unique token
- **Local network only**: No internet connection required or used
- **No data collection**: Everything stays on your devices
- **Temporary sessions**: Tokens expire after connection

## Limitations

- Both devices must be on the same WiFi network
- Terminal is fixed at 80x30 for mobile compatibility
- ANSI color codes are displayed as-is (basic terminal rendering)
- Maximum 1000 lines of output kept in memory

## Future Enhancements

- [ ] Smart prompt detection (auto-show y/n buttons)
- [ ] ANSI color code rendering
- [ ] Multiple terminal sessions
- [ ] Terminal size negotiation
- [ ] Push notifications for prompts
- [ ] Output search/filtering
- [ ] Session history

## Contributing

PRs welcome! This is a community project to make Claude Code more accessible.

## License

MIT

## Credits

Built with:
- [node-pty](https://github.com/microsoft/node-pty) - PTY bindings for Node.js
- [ws](https://github.com/websockets/ws) - WebSocket implementation
- [Expo](https://expo.dev) - React Native framework
- [qrcode-terminal](https://github.com/gtanner/qrcode-terminal) - QR code generation

---

**Note**: This is an unofficial community tool and is not affiliated with Anthropic.
