export class SocketManager {
	constructor(url) {
	  this.url = url;
	  this.socket = null;
	  this.connect();
	}
  
	connect() {
	  this.socket = io(this.url, {
		path: '/socket.io/',
		transports: ['websocket'],
		withCredentials: true,
		reconnectionAttempts: 5,
		reconnectionDelay: 3000
	  });
	}
  
	on(event, callback) {
	  this.socket?.on(event, callback);
	}
  
	emit(event, data, callback) {
	  if (!this.socket?.connected) {
		console.error('Socket not connected');
		if (callback) callback({ status: 'error', message: 'No connection' });
		return;
	  }
	  this.socket.emit(event, data, callback);
	}
  
	disconnect() {
	  this.socket?.disconnect();
	}
  
	get isConnected() {
	  return this.socket?.connected || false;
	}
}