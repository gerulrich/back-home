const mongoose = require('mongoose')


const dbConnection = async() => {
    try {
        await mongoose.connect( process.env.MONGODB, { useNewUrlParser: true } );
        console.log('Connected to mongo database');
    } catch (error) {
        console.log(error);
        throw new Error("Error to connect to mongo database");
    }
}

module.exports = {
    dbConnection
}