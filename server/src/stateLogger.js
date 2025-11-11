import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StateLogger {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'logs');
    this.logFile = null;
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  startSession() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(this.logDir, `state-${timestamp}.log`);
    this.log('=== STATE DETECTION SESSION STARTED ===');
  }

  log(message) {
    if (this.logFile) {
      const timestamp = new Date().toISOString();
      const logLine = `[${timestamp}] ${message}\n`;
      fs.appendFileSync(this.logFile, logLine);
    }
  }

  endSession() {
    if (this.logFile) {
      this.log('=== SESSION ENDED ===');
      this.logFile = null;
    }
  }
}

export default new StateLogger();
