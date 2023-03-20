
class UserSockets {
    
    constructor() {
        this.io = null;
        this.users = {};
        this.sockets = {};
    }

    addUserSocket(user, socket) {
        this.users[user.id] = user;
        this.sockets[user.id] = socket;
    }

    deleteUserSocket(user, socket) {
        delete this.users[user.id];
        delete this.sockets[user.id];
    }
}

const sockets = new UserSockets();

module.exports = sockets;