const express = require('express')
const cors = require('cors');
const { dbConnection } = require('../database/config.db');

class Server {

    constructor() {
        this.app = express();
        this.port = process.env.NODE_PORT || 3000;

        // Conectar a la db
        this.conectarDB();


        // Middlewares
        this.middlewares();

        // Rutas de mi appo
        this.routes();
    }

    async conectarDB () {
        await dbConnection();
    }

    middlewares() {
        this.app.use( cors() );
        
        this.app.use ( express.json() );

        // Directorio publico
        this.app.use( express.static("./public") );
    
    }

    routes() {
        this.app.use( "/api/auth", require("../routes/auth"))
        this.app.use( "/api/tv", require("../routes/channels"))
        this.app.use( "/api/music", require("../routes/music"))
        this.app.use( "/api/users", require("../routes/users"))
    }

    listen() {
        this.app.listen(  this.port, () => {
            console.log("Server running at port ", this.port );
        });
    }
}


module.exports = Server;