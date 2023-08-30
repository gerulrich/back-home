const express = require('express');
const cors = require('cors');
const { dbConnection } = require('../database/config.db');
const morganMiddleware = require('../middlewares/morganMiddleware');
const { websocket } = require('../websocket/websocket');
const sockets = require('../websocket/user-sockets');
const { Server:SocketServer } = require("socket.io");
const cron = require('node-cron');
const { epg_job } = require('../jobs/flow-epg');

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

        this.jobs();
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
        this.app.use( "/api/tidal", require("../routes/tidal"))
        this.app.use( "/api/tags", require("../routes/tags"))
        this.app.use( "/api/users", require("../routes/users"))
        this.app.use( "/api/recordings", require("../routes/recordings"))
    }

    sockets() {
        sockets.io = this.io;
        this.io.on('connection', (client) => websocket(sockets, client));
    }

    jobs() {
        cron.schedule(process.env.FLOW_EPG_CRON, () => epg_job());
    }

    listen() {
        this.server.listen(  this.port, () => {
            console.log("Server running at port ", this.port );
        });
    }
}


module.exports = Server;