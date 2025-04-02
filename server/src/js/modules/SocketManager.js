export class SocketManager {
	constructor(url) {
	  this.socket = io(url, {
		path: '/socket.io/',
		transports: ['websocket'],
		withCredentials: true,
		reconnectionAttempts: 3
	  });
	}
  
	on(event, callback) {
	  this.socket.on(event, callback);
	}
  
	emit(event, data, callback) {
	  this.socket.emit(event, data, callback);
	}
}