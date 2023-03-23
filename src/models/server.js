const express = require('express');
const cors = require('cors');
const { dbConnection } = require('../database/config.db');
const morganMiddleware = require('../middlewares/morganMiddleware');
const { websocket } = require('../websocket/websocket');
const sockets = require('../websocket/user-sockets');
const { Server:SocketServer } = require("socket.io");

class Server {

    constructor() {
        this.app = express();
        this.port = process.env.NODE_PORT || 3000;
        this.server = require('http').createServer( this.app );
        this.io = new SocketServer(this.server, {
            cors: '*'
        });

        // Conectar a la db
        this.conectarDB();


        // Middlewares
        this.middlewares();

        // Rutas de mi appo
        this.routes();

        this.sockets();
    }

    async conectarDB () {
        await dbConnection();
    }

    middlewares() {
        this.app.use( morganMiddleware );
        this.app.use( cors() );
        this.app.use ( express.json() );
        this.app.use( express.static("./public") );
   }

    routes() {
        this.app.use( "/api/auth", require("../routes/auth"))
        this.app.use( "/api/tv", require("../routes/channels"))
        this.app.use( "/api/music", require("../routes/music"))
        this.app.use( "/api/tags", require("../routes/tags"))
        this.app.use( "/api/users", require("../routes/users"))
    }

    sockets() {
        sockets.io = this.io;
        this.io.on('connection', (client) => websocket(sockets, client));
    }

    listen() {
        this.server.listen(  this.port, () => {
            console.log("Server running at port ", this.port );
        });
    }
}


module.exports = Server;