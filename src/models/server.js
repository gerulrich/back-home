const express = require('express');
var morgan = require('morgan');
const cors = require('cors');
const { dbConnection } = require('../database/config.db');
const morganMiddleware = require('../middlewares/morganMiddleware');

class Server {

    constructor() {
        this.app = express();
        this.port = process.env.NODE_PORT || 3000;
        this.server = require('http').createServer( this.app );
        this.io = require('socket.io')( this.server );

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
        this.app.use( "/api/users", require("../routes/users"))
    }

    sockets() {

        this.io.on('connection', client => {
            console.log("cliente conectado");
            client.on('disconnect', () => {

            })

        });

    }

    listen() {
        this.server.listen(  this.port, () => {
            console.log("Server running at port ", this.port );
        });
    }
}


module.exports = Server;