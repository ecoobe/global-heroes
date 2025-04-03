export class SocketManager {
	constructor(url) {
	  this.url = url;
	  this.socket = null;
	  this.connectionPromise = null;
	  this.connect();
	}
  
	connect() {
	  if (this.connectionPromise) return this.connectionPromise;
	  
	  this.connectionPromise = new Promise((resolve, reject) => {
		try {
		  this.socket = io(this.url, {
			path: '/socket.io/',
			transports: ['websocket'],
			withCredentials: true,
			reconnectionAttempts: 5,
			reconnectionDelay: 3000,
			timeout: 10000
		  });
  
		  this.socket.on('connect', () => {
			console.log('Socket connected:', this.socket.id);
			resolve(true);
		  });
  
		  this.socket.on('connect_error', (err) => {
			console.error('Connection error:', err.message);
			reject(err);
		  });
  
		} catch (err) {
		  reject(err);
		}
	  });
  
	  return this.connectionPromise;
	}
  
	on(event, callback) {
	  this.socket?.on(event, callback);
	}
  
	async emit(event, data) {
	  try {
		await this.connectionPromise;
		return new Promise((resolve, reject) => {
		  this.socket.emit(event, data, (response) => {
			if (response?.status === 'error') reject(response);
			else resolve(response);
		  });
		});
	  } catch (err) {
		throw { status: 'error', message: 'Connection failed' };
	  }
	}
  
	disconnect() {
	  this.socket?.disconnect();
	  this.connectionPromise = null;
	}
  
	get isConnected() {
	  return this.socket?.connected || false;
	}
  
	get id() {
	  return this.socket?.id || null;
	}
}