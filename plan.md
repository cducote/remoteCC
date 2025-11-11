# Terminal Rendering Issue - Fix Required

## Problem Description

The mobile app is currently displaying duplicate/repeated output for every character that gets typed or output by Claude Code. This creates a poor user experience where the terminal view shows every intermediate state of the text instead of just the current state.

### Example:
**Desktop terminal shows:**
```
> hello
```

**Mobile app shows:**
```
> h
> he
> hel
> hell
> hello
```

---

## Root Cause

The issue is a fundamental difference between how terminal emulators work vs. how the current mobile implementation works:

### How Desktop Terminals Work:
- Maintain a **screen buffer** (e.g., 80 columns × 30 rows)
- Interpret **ANSI escape codes** that control:
  - Cursor positioning (`ESC[H` = move cursor to home position)
  - Screen clearing (`ESC[2J` = clear entire screen, `ESC[K` = clear line)
  - Cursor movement (up/down/left/right)
  - Text overwriting
- Render the **current state** of the buffer, not a historical log

### How Current Mobile App Works:
- Treats output as an **append-only log stream**
- Every character received gets appended to a ScrollView
- Does NOT interpret ANSI escape codes
- Shows every intermediate state as a separate entry

### What's Actually Being Sent:

When Claude types "hello" character by character, the PTY output includes:
```
ESC[2J ESC[H > h
ESC[2J ESC[H > he
ESC[2J ESC[H > hel
ESC[2J ESC[H > hell
ESC[2J ESC[H > hello
```

Where:
- `ESC[2J` = "Clear the screen"
- `ESC[H` = "Move cursor to top-left corner"

Desktop terminals interpret these codes and only show the final state. The mobile app ignores them and shows everything.

---

## Solution: Implement Terminal Emulation

We need to make the mobile app behave like a real terminal emulator, not a text log viewer.

### Recommended Approach: Use xterm.js in a WebView

This is the **easiest and most correct** solution. xterm.js is a full terminal emulator that handles all ANSI codes properly.

#### Implementation:

**File: `mobile/src/components/TerminalWebView.js`**

```javascript
import React, { useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View } from 'react-native';

const terminalHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" />
  <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background: #000000;
      overflow: hidden;
    }
    #terminal {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 10px;
    }
  </style>
</head>
<body>
  <div id="terminal"></div>
  <script>
    // Initialize terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#d19a66',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#d19a66',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#ffffff'
      },
      cols: 80,
      rows: 30,
      scrollback: 1000,
      convertEol: true
    });
    
    term.open(document.getElementById('terminal'));
    
    // Make terminal fit container
    function fitTerminal() {
      const container = document.getElementById('terminal');
      const cols = Math.floor(container.clientWidth / 9); // Approximate char width
      const rows = Math.floor(container.clientHeight / 17); // Approximate line height
      term.resize(cols, rows);
    }
    
    fitTerminal();
    window.addEventListener('resize', fitTerminal);
    
    // Listen for output from React Native
    window.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'output') {
          term.write(data.data);
        } else if (data.type === 'clear') {
          term.clear();
        }
      } catch (e) {
        console.error('Error handling message:', e);
      }
    });
    
    // Send input back to React Native
    term.onData(data => {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'input',
        data: data
      }));
    });
    
    // Prevent accidental page navigation
    term.attachCustomKeyEventHandler((event) => {
      // Allow Ctrl+C, Ctrl+V, etc.
      return true;
    });
  </script>
</body>
</html>
`;

const TerminalWebView = ({ onInput, onReady }) => {
  const webViewRef = useRef(null);

  useEffect(() => {
    // Signal that terminal is ready
    if (onReady) {
      const timer = setTimeout(() => onReady(), 500);
      return () => clearTimeout(timer);
    }
  }, [onReady]);

  const writeOutput = (data) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'output',
        data: data
      }));
    }
  };

  const clearTerminal = () => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'clear'
      }));
    }
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'input' && onInput) {
        onInput(data.data);
      }
    } catch (e) {
      console.error('Error parsing message from WebView:', e);
    }
  };

  // Expose methods to parent component
  React.useImperativeHandle(webViewRef, () => ({
    writeOutput,
    clearTerminal
  }));

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: terminalHTML }}
        onMessage={handleMessage}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        // Performance optimizations
        androidHardwareAccelerationDisabled={false}
        androidLayerType="hardware"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  }
});

export default TerminalWebView;
```

#### Update TerminalScreen to Use the New Component:

**File: `mobile/src/screens/TerminalScreen.js`**

```javascript
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import TerminalWebView from '../components/TerminalWebView';
import { useWebSocket } from '../services/websocket'; // Your existing WebSocket hook

const TerminalScreen = ({ route }) => {
  const { url, token } = route.params;
  const terminalRef = useRef(null);
  const { connect, send, disconnect, isConnected } = useWebSocket();

  useEffect(() => {
    // Connect to WebSocket
    connect(url, token, {
      onOutput: (data) => {
        // Write output to terminal
        if (terminalRef.current) {
          terminalRef.current.writeOutput(data);
        }
      },
      onConnected: () => {
        console.log('Connected to server');
      },
      onDisconnected: () => {
        console.log('Disconnected from server');
      }
    });

    return () => {
      disconnect();
    };
  }, [url, token]);

  const handleInput = (data) => {
    // Send input to server via WebSocket
    send({
      type: 'input',
      data: data
    });
  };

  return (
    <View style={styles.container}>
      <TerminalWebView
        ref={terminalRef}
        onInput={handleInput}
        onReady={() => console.log('Terminal ready')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  }
});

export default TerminalScreen;
```

---

## Alternative Solution: Manual ANSI Code Parsing

If you don't want to use a WebView (for performance or other reasons), you can implement basic ANSI code parsing. However, this is **much more complex** and won't handle all edge cases.

### Basic Implementation:

```javascript
// File: mobile/src/utils/ansiParser.js

export class TerminalBuffer {
  constructor(cols = 80, rows = 30) {
    this.cols = cols;
    this.rows = rows;
    this.buffer = Array(rows).fill(null).map(() => Array(cols).fill(' '));
    this.cursorX = 0;
    this.cursorY = 0;
    this.savedCursor = { x: 0, y: 0 };
  }

  write(data) {
    let i = 0;
    while (i < data.length) {
      // Check for escape sequence
      if (data[i] === '\x1b' && data[i + 1] === '[') {
        i += 2;
        let code = '';
        while (i < data.length && !this.isLetter(data[i])) {
          code += data[i];
          i++;
        }
        const command = data[i];
        this.handleEscapeSequence(code, command);
        i++;
      } else if (data[i] === '\r') {
        // Carriage return - move to start of line
        this.cursorX = 0;
        i++;
      } else if (data[i] === '\n') {
        // Newline
        this.cursorY++;
        if (this.cursorY >= this.rows) {
          this.scrollUp();
          this.cursorY = this.rows - 1;
        }
        i++;
      } else if (data[i] === '\b') {
        // Backspace
        if (this.cursorX > 0) this.cursorX--;
        i++;
      } else {
        // Regular character
        this.buffer[this.cursorY][this.cursorX] = data[i];
        this.cursorX++;
        if (this.cursorX >= this.cols) {
          this.cursorX = 0;
          this.cursorY++;
          if (this.cursorY >= this.rows) {
            this.scrollUp();
            this.cursorY = this.rows - 1;
          }
        }
        i++;
      }
    }
  }

  handleEscapeSequence(code, command) {
    const parts = code.split(';').map(n => parseInt(n) || 0);
    
    switch (command) {
      case 'H': // Cursor position
        this.cursorY = Math.max(0, Math.min(parts[0] - 1, this.rows - 1));
        this.cursorX = Math.max(0, Math.min(parts[1] - 1, this.cols - 1));
        break;
      case 'A': // Cursor up
        this.cursorY = Math.max(0, this.cursorY - (parts[0] || 1));
        break;
      case 'B': // Cursor down
        this.cursorY = Math.min(this.rows - 1, this.cursorY + (parts[0] || 1));
        break;
      case 'C': // Cursor forward
        this.cursorX = Math.min(this.cols - 1, this.cursorX + (parts[0] || 1));
        break;
      case 'D': // Cursor back
        this.cursorX = Math.max(0, this.cursorX - (parts[0] || 1));
        break;
      case 'J': // Erase display
        if (parts[0] === 2) {
          this.clearScreen();
        }
        break;
      case 'K': // Erase line
        for (let x = this.cursorX; x < this.cols; x++) {
          this.buffer[this.cursorY][x] = ' ';
        }
        break;
      case 's': // Save cursor position
        this.savedCursor = { x: this.cursorX, y: this.cursorY };
        break;
      case 'u': // Restore cursor position
        this.cursorX = this.savedCursor.x;
        this.cursorY = this.savedCursor.y;
        break;
    }
  }

  clearScreen() {
    this.buffer = Array(this.rows).fill(null).map(() => Array(this.cols).fill(' '));
    this.cursorX = 0;
    this.cursorY = 0;
  }

  scrollUp() {
    this.buffer.shift();
    this.buffer.push(Array(this.cols).fill(' '));
  }

  isLetter(char) {
    return /[a-zA-Z]/.test(char);
  }

  getLines() {
    return this.buffer.map(row => row.join(''));
  }
}
```

**Note:** This manual approach is simplified and won't handle colors, complex cursor movements, or many other terminal features. **Use xterm.js instead.**

---

## Dependencies to Add

For the recommended xterm.js solution:

```bash
cd mobile
npm install react-native-webview
```

Or if using Expo:
```bash
npx expo install react-native-webview
```

---

## Testing

After implementing this fix, you should see:

1. ✅ Terminal output updates in-place (no duplication)
2. ✅ Cursor movements work correctly
3. ✅ Screen clears work properly
4. ✅ Colors are displayed (if using xterm.js)
5. ✅ Text overwrites work as expected
6. ✅ Scrollback history works

Test with Claude Code's animated output and you should see it render exactly like it does on desktop.

---

## Summary

**Problem:** Mobile app is appending all output as a log instead of maintaining a terminal screen buffer.

**Solution:** Use xterm.js in a WebView to get proper terminal emulation with full ANSI escape code support.

**Benefit:** Mobile terminal will behave exactly like desktop terminal, with proper cursor movements, screen clearing, and text overwriting.

**Complexity:** Medium (mostly integrating WebView component)

**Time Estimate:** 1-2 hours to implement and test