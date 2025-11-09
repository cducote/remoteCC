class WebSocketService {
  constructor() {
    this.ws = null;
    this.url = null;
    this.listeners = {
      connected: [],
      output: [],
      error: [],
      exit: [],
      disconnect: [],
      maxRetriesReached: []
    };
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isIntentionalDisconnect = false;
  }

  connect(url) {
    this.url = url;
    this.isIntentionalDisconnect = false;
    this.reconnectAttempts = 0;
    this._connect();
  }

  _connect() {
    if (this.ws) {
      this.ws.close();
    }

    console.log('Connecting to:', this.url);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this._emit(message.type, message);
      } catch (err) {
        console.error('Error parsing message:', err);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this._emit('error', { message: 'Connection error' });
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this._emit('disconnect', { code: event.code, reason: event.reason });

      // Try to reconnect if not intentional
      if (!this.isIntentionalDisconnect) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

          setTimeout(() => {
            this._connect();
          }, delay);
        } else {
          // Max retries reached, give up
          console.log('Max reconnection attempts reached, giving up');
          this._emit('maxRetriesReached', {
            message: 'Failed to reconnect after 5 attempts'
          });
        }
      }
    };
  }

  send(type, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  sendInput(input) {
    this.send('input', input);
  }

  disconnect() {
    this.isIntentionalDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  _emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

export default new WebSocketService();
