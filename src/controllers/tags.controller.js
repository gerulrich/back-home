const sockets = require("../websocket/user-sockets");

const sendCodeToClients = (req, res) => {
    const { code } = req.body;
    sockets.io.emit('tag', {code});
    res.json({code});
}

module.exports = {
    sendCodeToClients
}