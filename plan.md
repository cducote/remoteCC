# Remote Terminal Viewer - Implementation Plan

## Project Overview

A local-first tool that allows developers to view and interact with their terminal (specifically Claude Code sessions) from their mobile device while on the same WiFi network.

### Core Workflow
1. User runs the terminal program on their computer
2. Program displays a QR code
3. User scans QR with mobile app (Expo)
4. Program automatically starts Claude Code in a PTY
5. All terminal output streams to both local terminal AND phone
6. User can send input from phone back to terminal
7. User can walk away from computer and continue interacting via phone

### Key Principles
- **Local-first**: No cloud infrastructure, everything runs on local network
- **Zero-config**: Works out of the box, no API keys or authentication setup
- **Simple pairing**: QR code handles all connection details
- **Developer-friendly**: Git clone, npm install, run

---

## Phase 1: Core Terminal Streaming (MVP)

### Goal
Get basic terminal output streaming from computer to phone working reliably.

### Terminal Program (Node.js)

#### 1.1 Project Setup
```bash
npm init -y
```

**Dependencies needed:**
```json
{
  "dependencies": {
    "node-pty": "^1.0.0",
    "ws": "^8.14.0",
    "qrcode-terminal": "^0.12.0",
    "internal-ip": "^7.0.0",
    "nanoid": "^5.0.0",
    "strip-ansi": "^7.1.0"
  }
}
```

#### 1.2 Core Server Implementation

**File: `src/server.js`**

Create WebSocket server that:
- Generates a random session token
- Gets local IP address
- Starts WebSocket server on a random available port (3000-9000 range)
- Displays QR code with connection URL: `ws://[LOCAL_IP]:[PORT]?token=[TOKEN]`
- Waits for phone connection (with timeout)
- Once connected, spawns PTY with `claude-code` command
- Streams all PTY output to connected phone clients
- Forwards input from phone to PTY stdin
- Also outputs to local terminal so user can see it before walking away

**Key functions to implement:**
```javascript
// Get local network IP address
async function getLocalIP()

// Generate secure random token
function generateToken()

// Create WebSocket server
function createServer(port, token)

// Display QR code in terminal
function displayQRCode(url)

// Spawn PTY with claude-code
function spawnTerminal(command = 'claude-code', args = [])

// Handle WebSocket connections
function handleConnection(ws, token)

// Broadcast output to all connected clients
function broadcast(data)

// Inject input into PTY
function injectInput(data)
```

**Connection flow:**
1. Start server
2. Show QR code
3. Wait for WebSocket connection with valid token
4. On connection: send "connected" message to phone
5. Start PTY with claude-code
6. Begin streaming

**PTY Configuration:**
- Columns: 80 (reasonable for mobile)
- Rows: 30
- Terminal type: `xterm-256color`
- Inherit environment variables from parent process
- Use current working directory

#### 1.3 CLI Entry Point

**File: `src/index.js`**

Simple CLI that:
- Accepts optional command argument (defaults to `claude-code`)
- Accepts optional `--port` flag
- Handles graceful shutdown (SIGINT, SIGTERM)
- Cleans up PTY on exit

```bash
node src/index.js                    # Runs claude-code
node src/index.js --command "npm start"  # Runs custom command
```

---

### Mobile App (Expo/React Native)

#### 1.4 Expo Project Setup

```bash
npx create-expo-app remote-terminal-mobile
cd remote-terminal-mobile
```

**Dependencies needed:**
```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "expo-camera": "~14.0.0",
    "expo-barcode-scanner": "~12.0.0",
    "react-native-webview": "13.6.3"
  }
}
```

#### 1.5 App Structure

**Screens needed:**
1. **QR Scanner Screen** (`screens/QRScannerScreen.js`)
   - Camera view to scan QR code
   - Extract WebSocket URL from QR data
   - Navigate to Terminal screen on successful scan

2. **Terminal Screen** (`screens/TerminalScreen.js`)
   - Display scrolling terminal output
   - Text input field at bottom
   - Send button
   - Auto-scroll to bottom (with manual scroll lock)
   - Connection status indicator

#### 1.6 WebSocket Client Implementation

**File: `services/websocket.js`**

WebSocket client that:
- Connects to URL from QR code
- Validates connection with token
- Receives terminal output messages
- Sends input messages
- Handles reconnection on disconnect
- Emits events for React components to listen to

**Message format:**
```javascript
// Server -> Phone
{
  type: "output",
  data: "terminal output string with ANSI codes"
}

{
  type: "connected",
  message: "Phone connected successfully"
}

{
  type: "error",
  message: "Connection error message"
}

// Phone -> Server
{
  type: "input",
  data: "y\n"  // User input with newline
}
```

#### 1.7 Terminal Display Component

**File: `components/TerminalDisplay.js`**

React Native component that:
- Renders terminal output in a ScrollView
- Uses monospace font
- Handles ANSI color codes (basic support: strip or render)
- Auto-scrolls to bottom by default
- Allows user to scroll up (disables auto-scroll)
- Re-enables auto-scroll when user scrolls to bottom
- Buffers output (keep last 1000 lines to prevent memory issues)

**Text styling:**
- Font: `Platform.OS === 'ios' ? 'Courier' : 'monospace'`
- Background: dark theme (black or dark gray)
- Text color: white/light gray
- Font size: adjustable (12-16pt)

---

## Phase 2: Enhanced UX & Reliability

### Goal
Make the tool robust and pleasant to use daily.

### 2.1 ANSI Code Handling

**Server-side:**
- Option to strip ANSI codes before sending (add query param `?stripAnsi=true`)
- Send both raw and stripped versions

**Client-side:**
- Install `ansi-to-react` equivalent for React Native
- Parse ANSI color codes and render with proper colors
- Handle cursor movements (at least basic ones)

### 2.2 Connection Management

**Features to add:**

**Server:**
- Keep-alive pings every 30 seconds
- Detect client disconnection
- Allow multiple clients to connect (broadcast to all)
- Clean up on last client disconnect (but keep PTY running)

**Client:**
- Reconnection with exponential backoff
- Show connection status: "Connected", "Connecting...", "Disconnected"
- Persist WebSocket URL in AsyncStorage for quick reconnect
- Option to "forget" connection and scan new QR

**Session persistence:**
- Server maintains output buffer (last 100 lines)
- Send buffer to newly connected clients
- Client sees recent history immediately on connection

### 2.3 Input Improvements

**Mobile keyboard handling:**
- Show/hide keyboard button
- Quick action row above keyboard:
  - Common keys: `Enter`, `Tab`, `Ctrl+C`, `Ctrl+D`, `y`, `n`
  - These send respective control characters/strings

**Text input field:**
- Multiline support
- Clear button
- Send on Enter (with modifier key for newline)

### 2.4 Terminal Size Handling

**Options:**
1. Force phone to match server terminal size (80x30)
2. Let phone have its own size, accept wrapping differences
3. Send terminal size from phone to server, resize PTY dynamically

**Recommended:** Option 1 for MVP (fixed 80x30), Option 3 for polish

### 2.5 Visual Polish

**Server terminal:**
- Better status messages with emojis
- Color-coded logs (green for success, yellow for waiting, red for errors)
- Show connected client IPs
- Graceful exit message

**Mobile app:**
- Dark theme (terminal aesthetic)
- Connection indicator dot (green/yellow/red)
- Haptic feedback on button taps
- Loading states

---

## Phase 3: Smart Features

### Goal
Make interactions with Claude Code specifically more intuitive.

### 3.1 Prompt Detection

**Server-side implementation:**

**File: `src/promptDetector.js`**

Buffer and analyze terminal output for common patterns:

**Patterns to detect:**
```javascript
const patterns = [
  {
    regex: /Apply these changes\?\s*\(y\/n\)/i,
    type: 'yes_no',
    question: 'Apply these changes?',
    options: [
      { label: '✓ Yes', value: 'y\n', style: 'primary' },
      { label: '✗ No', value: 'n\n', style: 'secondary' }
    ]
  },
  {
    regex: /Continue\?\s*\(y\/n\)/i,
    type: 'yes_no',
    question: 'Continue?',
    options: [
      { label: '✓ Yes', value: 'y\n', style: 'primary' },
      { label: '✗ No', value: 'n\n', style: 'secondary' }
    ]
  },
  {
    regex: /\(yes\/no\/view\)/i,
    type: 'multiple_choice',
    question: 'What would you like to do?',
    options: [
      { label: '✓ Yes', value: 'yes\n', style: 'primary' },
      { label: '✗ No', value: 'no\n', style: 'secondary' },
      { label: '👁 View', value: 'view\n', style: 'tertiary' }
    ]
  }
];
```

**Detection logic:**
- Maintain rolling buffer of last 500 characters
- Strip ANSI codes before pattern matching
- When pattern matches, send structured prompt to phone
- Debounce detection (don't send duplicate prompts)

**New message type:**
```javascript
{
  type: "prompt",
  question: "Apply these changes?",
  options: [
    { label: "✓ Yes", value: "y\n", style: "primary" },
    { label: "✗ No", value: "n\n", style: "secondary" }
  ],
  timestamp: Date.now()
}
```

### 3.2 Smart Button UI (Mobile)

**File: `components/PromptOverlay.js`**

When prompt is detected, show overlay with:
- Semi-transparent backdrop
- Card with question text
- Large, tappable buttons for each option
- Buttons send the corresponding value via WebSocket
- Overlay dismisses after selection
- Option to manually type instead (show text input toggle)

**Button styling:**
- Primary: green/blue, prominent
- Secondary: gray, neutral
- Tertiary: orange/purple, informational

### 3.3 Diff Viewer (Optional, Complex)

**Goal:** When Claude shows file diffs, parse and display them nicely

**Challenges:**
- Detecting diff boundaries in output
- Parsing unified diff format
- Rendering syntax-highlighted diffs on mobile

**Recommended approach:**
- Detect diff blocks (lines starting with `+++`, `---`, `@@`)
- Extract diff content
- Send as separate message type with file path and changes
- Mobile renders with `react-native-syntax-highlighter`

**Defer to Phase 4 or later** - this is complex and not essential for MVP

### 3.4 Notification Support (Nice-to-Have)

When app is in background and prompt is detected:
- Send local notification: "Claude is waiting for input"
- Tap notification opens app to terminal screen
- Use Expo's notification API

---

## Phase 4: Testing & Polish

### 4.1 Testing Checklist

**Server:**
- [ ] Starts successfully on various ports
- [ ] Handles multiple client connections
- [ ] Gracefully handles client disconnects
- [ ] PTY spawns correctly with various commands
- [ ] Input injection works reliably
- [ ] Cleans up resources on exit
- [ ] Works on macOS, Linux, Windows (WSL)

**Mobile:**
- [ ] QR code scanning works in various lighting
- [ ] WebSocket connects reliably
- [ ] Terminal displays output correctly
- [ ] Input sends correctly
- [ ] Handles app backgrounding/foregrounding
- [ ] Reconnection works after network interruption
- [ ] Works on iOS and Android

**Integration:**
- [ ] Server and client communicate correctly
- [ ] Prompt detection triggers on real Claude Code sessions
- [ ] Button actions work as expected
- [ ] No memory leaks during long sessions
- [ ] Performance is acceptable with rapid output

### 4.2 Error Handling

**Server errors to handle:**
- Port already in use → try next port
- PTY spawn fails → show error, exit gracefully
- Invalid token from client → reject connection
- PTY exits unexpectedly → notify clients, close connections

**Client errors to handle:**
- QR code invalid format → show error message
- WebSocket connection fails → retry with backoff
- Connection lost → show reconnecting status
- Server not responding → timeout and show error

### 4.3 Configuration Options

**Server config file** (`config.json`):
```json
{
  "port": 3456,
  "defaultCommand": "claude-code",
  "pty": {
    "cols": 80,
    "rows": 30,
    "scrollback": 1000
  },
  "token": {
    "length": 32,
    "expiresIn": 300000
  },
  "output": {
    "stripAnsi": false,
    "bufferSize": 100
  }
}
```

**Mobile settings:**
- Font size adjustment
- Theme (dark/light)
- Auto-scroll behavior
- Notification preferences

### 4.4 Documentation

**README.md** should include:
- Project description and use case
- Prerequisites (Node.js version, Expo Go app)
- Installation instructions
- Usage instructions with screenshots
- Troubleshooting common issues
- Architecture diagram
- Contributing guidelines

**Additional docs:**
- ARCHITECTURE.md - Technical details
- DEVELOPMENT.md - Development setup
- TROUBLESHOOTING.md - Common issues and solutions

---

## Implementation Order

### Week 1: Foundation
1. Set up Node.js server project
2. Implement basic WebSocket server
3. Add QR code generation and display
4. Implement PTY spawning with claude-code
5. Test basic terminal output streaming locally

### Week 2: Mobile App
6. Set up Expo project
7. Implement QR scanner screen
8. Implement WebSocket client
9. Create terminal display component
10. Test basic connection and output display

### Week 3: Polish
11. Add input handling (text field → WebSocket → PTY)
12. Implement connection management and reconnection
13. Add ANSI code handling
14. Improve terminal display (scrolling, formatting)
15. Add connection status indicators

### Week 4: Smart Features
16. Implement prompt detection on server
17. Create button overlay UI on mobile
18. Test with real Claude Code sessions
19. Add quick action buttons
20. Polish UX and fix bugs

---

## Technical Considerations

### Security
- Token-based authentication (random 32-char token)
- Tokens expire after 5 minutes if not used
- Only accept connections from local network IPs
- No need for HTTPS (local network only)
- Optional: add PIN code as second factor

### Performance
- Throttle output streaming if too rapid (batch every 50ms)
- Limit buffer size on both server and client
- Clean up old output from memory
- Use efficient string concatenation (Buffer on server)

### Cross-Platform
- Server: Works on macOS, Linux, Windows (via WSL)
- Mobile: iOS and Android via Expo
- Test on various screen sizes
- Handle different terminal emulators

### Fallback Behavior
- If phone disconnects, terminal continues locally
- User can still interact with local terminal
- Phone reconnects and catches up with buffered output
- No data loss

---

## Future Enhancements (Post-Launch)

- **History/Session Management**: Save terminal sessions, replay them
- **Multi-Terminal**: Support multiple PTY sessions, switch between them
- **File Transfer**: Send files from phone to computer (e.g., images)
- **Voice Input**: Speak commands instead of typing
- **Collaboration**: Multiple phones can view same terminal
- **Web Version**: Browser-based client (no app needed)
- **Recording**: Record terminal sessions as video or text
- **Search**: Search through terminal output history
- **Snippets**: Save and replay common command sequences
- **Integration**: Work with other CLI tools beyond Claude Code

---

## Success Metrics

**MVP is successful if:**
- [ ] User can start server with one command
- [ ] Phone connects via QR scan within 10 seconds
- [ ] Terminal output appears on phone with <500ms latency
- [ ] User can send input from phone successfully
- [ ] Connection is stable for 30+ minute sessions
- [ ] Works reliably on primary platforms (macOS + iOS)

**Tool is useful if:**
- [ ] Users actually walk away from computer and use phone
- [ ] Prompt detection saves time vs. typing
- [ ] No significant bugs during regular use
- [ ] Setup takes <5 minutes for new users

---

## File Structure

```
remote-terminal/
├── server/                      # Node.js server
│   ├── src/
│   │   ├── index.js            # CLI entry point
│   │   ├── server.js           # WebSocket server
│   │   ├── pty.js              # PTY management
│   │   ├── promptDetector.js   # Pattern detection
│   │   └── utils.js            # Helper functions
│   ├── config.json
│   ├── package.json
│   └── README.md
│
├── mobile/                      # Expo/React Native app
│   ├── src/
│   │   ├── screens/
│   │   │   ├── QRScannerScreen.js
│   │   │   └── TerminalScreen.js
│   │   ├── components/
│   │   │   ├── TerminalDisplay.js
│   │   │   └── PromptOverlay.js
│   │   ├── services/
│   │   │   └── websocket.js
│   │   └── App.js
│   ├── app.json
│   ├── package.json
│   └── README.md
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   └── TROUBLESHOOTING.md
│
└── README.md                    # Main project README
```

---

## Getting Started Command for Claude Code

```bash
# Create the project structure
mkdir -p remote-terminal/{server/src,mobile/src/{screens,components,services},docs}

# Start with the server implementation
cd remote-terminal/server
npm init -y

# Begin implementing src/server.js with the WebSocket server and PTY handling
```

Start with Phase 1.1 and work through sequentially. Focus on getting basic streaming working before adding smart features.