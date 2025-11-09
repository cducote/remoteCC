import { WebSocketServer } from 'ws';
import { spawn } from 'node-pty';
import qrcode from 'qrcode-terminal';
import { internalIpV4 } from 'internal-ip';
import { nanoid } from 'nanoid';
import stripAnsi from 'strip-ansi';

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
  }

  async start() {
    try {
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
            if (message.type === 'input' && this.pty) {
              this.pty.write(message.data);
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
        // Add to buffer
        this.outputBuffer.push(data);
        if (this.outputBuffer.length > this.maxBufferSize) {
          this.outputBuffer.shift();
        }

        // Output to local terminal
        process.stdout.write(data);

        // Broadcast to all connected clients
        this.broadcast({
          type: 'output',
          data: data
        });
      });

      // Handle local keyboard input
      process.stdin.setRawMode(true);
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (data) => {
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
