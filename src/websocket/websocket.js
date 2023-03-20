const logger = require("../helpers/logger");
const { validateJWT } = require('../helpers/jwt-create');


const websocket = async(sockets, client) => { 
    const user = await validateJWT(client.handshake.headers['x-token'])
    if (!user) {
        return client.disconnect();
    }
    logger.info(`User(uid: ${user._id}, name: ${user.name}) connected`);
    sockets.addUserSocket(user, client);

    client.on('disconnect', () => {
        logger.info(`User(uid: ${user._id}, name: ${user.name}) disconnected`);
        sockets.deleteUserSocket(user, client);
    });

 }

module.exports = {
    websocket
}