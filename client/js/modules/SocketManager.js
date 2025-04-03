export class SocketManager {
	constructor(url) {
	  this.url = url;
	  this.socket = null;
	  this.reconnectTimeout = null;
	  this.reconnectAttempts = 0;
	  this.maxReconnectAttempts = 5;
	  this.init();
	}
  
	init() {
	  this.socket = io(this.url, {
		path: '/socket.io/',
		transports: ['websocket'],
		reconnectionAttempts: this.maxReconnectAttempts,
		reconnectionDelay: 5000,
		randomizationFactor: 0.5,
		secure: true,
		withCredentials: true,
		timeout: 15000,
		pingTimeout: 20000,
		pingInterval: 10000
	  });
  
	  this.setupEventHandlers();
	}
  
	setupEventHandlers() {
	  this.socket.on('connect', () => {
		console.log('WebSocket connected:', this.socket.id);
		this.reconnectAttempts = 0;
		this.clearReconnectTimeout();
	  });
  
	  this.socket.on('connect_error', (err) => {
		console.error('Connection error:', err.message);
		this.handleReconnection();
	  });
  
	  this.socket.on('reconnect_attempt', (attempt) => {
		console.log(`Reconnection attempt ${attempt}/${this.maxReconnectAttempts}`);
	  });
  
	  this.socket.on('disconnect', (reason) => {
		console.log('Disconnected:', reason);
		if (reason === 'io server disconnect') {
		  this.socket.connect();
		}
	  });
	}
  
	handleReconnection() {
	  if (!this.reconnectTimeout && this.reconnectAttempts < this.maxReconnectAttempts) {
		this.reconnectAttempts++;
		this.reconnectTimeout = setTimeout(() => {
		  console.log('Attempting manual reconnection...');
		  this.socket.connect();
		  this.reconnectTimeout = null;
		}, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000));
	  }
	}
  
	clearReconnectTimeout() {
	  if (this.reconnectTimeout) {
		clearTimeout(this.reconnectTimeout);
		this.reconnectTimeout = null;
	  }
	}
  
	on(event, handler) {
	  this.socket?.on(event, handler);
	}
  
	emit(event, data, options = {}) {
	  return new Promise((resolve, reject) => {
		if (!this.socket?.connected) {
		  reject(new Error('Connection not established'));
		  return;
		}
  
		const timeout = options.timeout || 20000;
		const timer = setTimeout(() => {
		  reject(new Error(`Request timeout (${timeout}ms)`));
		}, timeout);
  
		this.socket.emit(event, data, (response) => {
		  clearTimeout(timer);
		  if (response?.error) {
			const err = new Error(response.error.message || 'Unknown error');
			err.code = response.error.code;
			err.details = response.error.details;
			reject(err);
		  } else {
			resolve(response);
		  }
		});
	  });
	}
  
	get isConnected() {
	  return this.socket?.connected || false;
	}
  
	disconnect() {
	  if (this.socket) {
		this.socket.disconnect();
		console.log('Socket disconnected by client');
	  }
	}
}