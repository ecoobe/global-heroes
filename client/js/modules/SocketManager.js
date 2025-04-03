export class SocketManager {
	constructor(url) {
	  this.url = url;
	  this.socket = null;
	  this.init();
	}
  
	init() {
	  try {
		this.socket = io(this.url, {
		  path: '/socket.io/',
		  transports: ['websocket'],
		  withCredentials: true,
		  reconnectionAttempts: 3,
		  reconnectionDelay: 3000,
		  secure: true,
		  rejectUnauthorized: false
		});
  
		this.setupBaseHandlers();
	  } catch (err) {
		console.error('Socket initialization failed:', err);
		throw new Error('Не удалось подключиться к серверу');
	  }
	}
  
	setupBaseHandlers() {
	  this.socket.on('connect', () => {
		console.log('WS Connected:', this.socket.id);
	  });
  
	  this.socket.on('connect_error', (err) => {
		console.error('WS Connection error:', err.message);
	  });
  
	  this.socket.on('disconnect', (reason) => {
		console.log('WS Disconnected:', reason);
	  });
	}
  
	on(event, callback) {
	  if (!this.socket) return;
	  this.socket.on(event, callback);
	}
  
	emit(event, data, callback) {
	  if (!this.socket?.connected) {
		console.error('Emit failed: no connection');
		if (callback) callback({ status: 'error', message: 'No active connection' });
		return;
	  }
	  
	  try {
		this.socket.emit(event, data, callback);
	  } catch (err) {
		console.error('Emit error:', err);
		if (callback) callback({ status: 'error', message: err.message });
	  }
	}
  
	disconnect() {
	  if (this.socket) {
		this.socket.disconnect();
		this.socket = null;
	  }
	}
  
	get isConnected() {
	  return this.socket?.connected || false;
	}
  
	get connectionId() {
	  return this.socket?.id || null;
	}
}