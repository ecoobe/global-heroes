export class SocketManager {
	constructor(url) {
	  this.url = url;
	  this.socket = null;
	  this.init();
	}
  
	init() {
	  this.socket = io(this.url, {
		path: '/socket.io/',
		transports: ['websocket'],
		reconnectionAttempts: 5,
		reconnectionDelay: 3000,
		secure: true,
		withCredentials: true
	  });
  
	  this.socket.on('connect', () => {
		console.log('WebSocket connected:', this.socket.id);
	  });
  
	  this.socket.on('connect_error', (err) => {
		console.error('Connection error:', err.message);
	  });
	}
  
	on(event, handler) {
	  this.socket?.on(event, handler);
	}
  
	emit(event, data) {
	  return new Promise((resolve, reject) => {
		if (!this.socket?.connected) {
		  reject(new Error('Connection not established'));
		  return;
		}
  
		this.socket.emit(event, data, (response) => {
		  response?.error 
			? reject(new Error(response.error)) 
			: resolve(response);
		});
	  });
	}
  
	get isConnected() {
	  return this.socket?.connected || false;
	}
}