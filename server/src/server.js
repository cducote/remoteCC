import { WebSocketServer } from 'ws';
import { spawn } from 'node-pty';
import qrcode from 'qrcode-terminal';
import { internalIpV4 } from 'internal-ip';
import { nanoid } from 'nanoid';
import stateLogger from './stateLogger.js';

export class RemoteCCServer {
  constructor(options = {}) {
    this.port = options.port || 3456;
    this.command = options.command || 'claude';
    this.commandArgs = options.commandArgs || [];
    this.token = nanoid(32);
    this.wss = null;
    this.pty = null;
    this.clients = new Set();
    this.outputBuffer = [];
    this.maxBufferSize = 100;

    // Frame buffering for mobile clients
    this.mobileFrameBuffer = '';
    this.mobileFrameTimer = null;
    this.inSyncedOutput = false;

    // State tracking
    this.currentState = 'working'; // 'waiting' or 'working' - default to working!
    this.stateBuffer = ''; // Buffer to analyze for state detection
  }

  async start() {
    try {
      // Start state logging
      stateLogger.startSession();

      // Get local IP address
      const localIP = await internalIpV4();
      if (!localIP) {
        throw new Error('Could not determine local IP address');
      }

      // Create WebSocket server
      this.wss = new WebSocketServer({ port: this.port });

      const wsUrl = `ws://${localIP}:${this.port}?token=${this.token}`;

      console.log('\n🚀 RemoteCC Server Started\n');
      console.log('📱 Scan this QR code with your mobile app:\n');

      // Display QR code
      qrcode.generate(wsUrl, { small: true });

      console.log(`\n🔗 Connection URL: ${wsUrl}`);
      console.log(`🔑 Token: ${this.token}`);
      console.log(`⏳ Waiting for mobile connection...\n`);

      // Handle WebSocket connections
      this.wss.on('connection', (ws, req) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const clientToken = url.searchParams.get('token');

        // Validate token
        if (clientToken !== this.token) {
          console.log('❌ Rejected connection: invalid token');
          ws.close(1008, 'Invalid token');
          return;
        }

        console.log('✅ Mobile device connected!');
        this.clients.add(ws);

        // Send connection confirmation
        ws.send(JSON.stringify({
          type: 'connected',
          message: 'Connected to RemoteCC server'
        }));

        // Send current state
        ws.send(JSON.stringify({
          type: 'state',
          state: this.currentState
        }));

        // Send buffered output to new client
        if (this.outputBuffer.length > 0) {
          ws.send(JSON.stringify({
            type: 'output',
            data: this.outputBuffer.join('')
          }));
        }

        // Start PTY if not already running
        if (!this.pty) {
          this.startPTY();
        }

        // Handle messages from client
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            stateLogger.log(`Received message: ${JSON.stringify(message)}`);

            if (message.type === 'input' && this.pty) {
              stateLogger.log(`Writing to PTY: "${message.data}"`);
              this.pty.write(message.data);
            } else if (message.type === 'forceState') {
              // Manual state override for testing
              console.log(`🧪 Force state to: ${message.state}`);
              this.currentState = message.state;
              if (message.state === 'waiting') {
                const parsed = this.parseQuestion(this.stateBuffer);
                this.broadcast({
                  type: 'state',
                  state: message.state,
                  question: parsed.question,
                  options: parsed.options,
                  rawText: parsed.rawText
                });
              } else {
                this.broadcast({
                  type: 'state',
                  state: message.state
                });
              }
            }
          } catch (err) {
            console.error('Error parsing client message:', err);
          }
        });

        // Handle client disconnect
        ws.on('close', () => {
          this.clients.delete(ws);
          console.log(`📱 Client disconnected (${this.clients.size} remaining)`);
        });

        // Handle errors
        ws.on('error', (err) => {
          console.error('WebSocket error:', err);
          this.clients.delete(ws);
        });
      });

      // Handle server errors
      this.wss.on('error', (err) => {
        console.error('Server error:', err);
      });

    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${this.port} is already in use. Try a different port with --port flag.`);
      } else {
        console.error('❌ Failed to start server:', err.message);
      }
      throw err;
    }
  }

  startPTY() {
    console.log(`🖥️  Starting ${this.command}...\n`);
    console.log('─'.repeat(80));

    try {
      this.pty = spawn(this.command, this.commandArgs, {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: process.env
      });

      // Handle PTY output
      this.pty.onData((data) => {
        // Add to buffer (keeping ANSI codes for proper terminal emulation)
        this.outputBuffer.push(data);
        if (this.outputBuffer.length > this.maxBufferSize) {
          this.outputBuffer.shift();
        }

        // Output to local terminal (with ANSI codes for colors/formatting)
        process.stdout.write(data);

        // Handle mobile frame buffering
        this.handleMobileOutput(data);
      });

      // Handle local keyboard input
      process.stdin.setRawMode(true);
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (data) => {
        // Ctrl+C - exit the server
        if (data === '\x03') {
          console.log('\n\nReceived Ctrl+C, shutting down...');
          process.exit(0);
          return;
        }

        // Send other input to PTY
        if (this.pty) {
          this.pty.write(data);
        }
      });

      // Handle PTY exit
      this.pty.onExit(({ exitCode, signal }) => {
        console.log(`\n─${'─'.repeat(79)}`);
        console.log(`\n💀 Process exited (code: ${exitCode}, signal: ${signal})`);

        this.broadcast({
          type: 'exit',
          exitCode,
          signal
        });

        this.pty = null;
      });

    } catch (err) {
      console.error('❌ Failed to start PTY:', err.message);
      console.error('Make sure the command is available in your PATH.');

      this.broadcast({
        type: 'error',
        message: `Failed to start ${this.command}: ${err.message}`
      });
    }
  }

  handleMobileOutput(data) {
    // Detect synchronized output mode markers
    if (data.includes('\x1b[?2026h')) {
      this.inSyncedOutput = true;
    }

    // Accumulate data in buffer
    this.mobileFrameBuffer += data;

    // Clear existing timer
    if (this.mobileFrameTimer) {
      clearTimeout(this.mobileFrameTimer);
    }

    // Check if sync block ended
    if (data.includes('\x1b[?2026l')) {
      this.inSyncedOutput = false;
      // Send immediately when sync block completes
      this.flushMobileBuffer();
    } else {
      // Set timer to flush buffer after 100ms of inactivity
      this.mobileFrameTimer = setTimeout(() => {
        this.flushMobileBuffer();
      }, 100);
    }
  }

  flushMobileBuffer() {
    if (this.mobileFrameBuffer && this.clients.size > 0) {
      // Detect state before sending (but don't send output updates)
      this.detectState(this.mobileFrameBuffer);

      // Don't send output to mobile - we use virtual cursor instead
      // Always clear buffer regardless
      this.mobileFrameBuffer = '';
    }
  }

  parseQuestion(text) {
    // Strip ANSI codes AND control characters
    const stripped = text.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/\r/g, '');

    // Extract question (text ending with ?)
    const questionMatch = stripped.match(/([^\n]*\?[^\n]*)/);
    const question = questionMatch ? questionMatch[1].trim() : null;

    // Look for "What would you like to work on" style questions
    const workOnMatch = stripped.match(/What would you like[^\n]*\?/i);
    const finalQuestion = workOnMatch ? workOnMatch[0] : question;

    // Parse menu options (format: "1. Title" or "  1. Title" with optional description on next line)
    const options = [];
    const lines = stripped.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match: optional spaces, optional ❯, optional spaces, number with . or ), title
      const optionMatch = line.match(/^\s*(❯)?\s*(\d+)[\.\)]\s+(.+)$/);

      if (optionMatch) {
        const selected = !!optionMatch[1];
        const number = parseInt(optionMatch[2]);
        const title = optionMatch[3].trim();

        // Check next line for description (indented text)
        let description = null;
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          // If next line doesn't start with a number or ❯, and isn't empty, it's probably a description
          if (nextLine && !nextLine.match(/^(❯)?\s*\d+[\.\)]/) && nextLine.length > 0) {
            description = nextLine;
          }
        }

        options.push({
          number,
          title,
          description,
          selected
        });
      }
    }

    stateLogger.log(`Parsed ${options.length} options from ${lines.length} lines`);
    if (options.length > 0) {
      stateLogger.log(`First option: ${JSON.stringify(options[0])}`);
    }

    return {
      question: finalQuestion,
      options: options.length > 0 ? options : null,
      rawText: stripped
    };
  }

  detectState(data) {
    // Strip ANSI codes for state detection
    const stripped = data.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

    // Add to state buffer and keep last 1000 chars for better context
    this.stateBuffer += stripped;
    if (this.stateBuffer.length > 1000) {
      this.stateBuffer = this.stateBuffer.slice(-1000);
    }

    const lowerBuffer = this.stateBuffer.toLowerCase();

    stateLogger.log(`Buffer (last 200): "${this.stateBuffer.slice(-200)}"`);
    stateLogger.log(`Current state: ${this.currentState}`);

    // Patterns indicating WORKING state (Claude is processing)
    // Check these FIRST with higher priority
    const workingPatterns = [
      /\+[a-z]+\.\.\./i,                    // Progress indicators like "+Hashing..."
      /loading\.\.\./i,                     // "Loading..."
      /processing\.\.\./i,                  // "Processing..."
      /analyzing\.\.\./i,                   // "Analyzing..."
      /thinking\.\.\./i,                    // "Thinking..."
      /searching\.\.\./i,                   // "Searching..."
      /reading\.\.\./i,                     // "Reading..."
      /writing\.\.\./i,                     // "Writing..."
      /\[=+\]/,                             // Progress bars [====] only
    ];

    // Check for working patterns first
    let newState = this.currentState;
    for (const pattern of workingPatterns) {
      if (pattern.test(lowerBuffer)) {
        stateLogger.log(`Matched WORKING pattern: ${pattern}`);
        newState = 'working';
        break;
      }
    }

    // Always check waiting patterns - they override working patterns
    // Patterns indicating WAITING state (Claude asking for input)
    const waitingPatterns = [
      /\?\s*$/,                              // Ends with question mark
      />\s*$/,                               // Ends with prompt
      /\d+[\.\)]\s+[a-z]/i,                  // Menu options like "1. option" or "1) option"
      /❯/,                                   // Selection indicator
      /\(y\/n\)/i,                          // Yes/no prompts
      /press\s+enter/i,                     // "Press Enter" prompts
      /select\s+an\s+option/i,              // "Select an option"
      /what\s+would\s+you\s+like/i,         // "What would you like..."
      /waiting\s+for\s+(input|you)/i,       // "Waiting for input/you"
      /please\s+(choose|select|enter|type)/i,  // "Please choose/select/enter/type"
      /would\s+you\s+like/i,                // "Would you like..."
      /do\s+you\s+want/i,                   // "Do you want..."
      /how\s+(would|should|can)/i,          // "How would/should/can..."
      /type\s+something/i,                  // "Type something"
    ];

    for (const pattern of waitingPatterns) {
      if (pattern.test(lowerBuffer)) {
        stateLogger.log(`Matched WAITING pattern: ${pattern} - OVERRIDING to waiting`);
        newState = 'waiting';
        break;
      }
    }

    // If state changed, broadcast it
    if (newState !== this.currentState) {
      stateLogger.log(`STATE CHANGED: ${this.currentState} → ${newState}`);
      const previousState = this.currentState;
      this.currentState = newState;

      // If transitioning TO waiting state, parse the question
      if (newState === 'waiting') {
        const parsed = this.parseQuestion(this.stateBuffer);
        stateLogger.log(`Parsed question: ${JSON.stringify(parsed, null, 2)}`);

        this.broadcast({
          type: 'state',
          state: newState,
          question: parsed.question,
          options: parsed.options,
          rawText: parsed.rawText
        });
      } else {
        this.broadcast({
          type: 'state',
          state: newState
        });
      }
    }
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  cleanup() {
    console.log('\n🛑 Shutting down...');

    // Restore terminal
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    // Close all client connections
    this.clients.forEach((client) => {
      client.close(1000, 'Server shutting down');
    });

    // Kill PTY
    if (this.pty) {
      this.pty.kill();
    }

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    console.log('✅ Server stopped');
  }
}
