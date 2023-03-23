var crypto = require("crypto");

const generateSecurePathHash = (url, expires) => {
    if (!url || !expires) {
        return undefined;
    }
    
    var input = `${expires}${url} ${process.env.NGINX_SECRET}`;
    var binaryHash = crypto.createHash("md5").update(input).digest();
    var base64Value = Buffer.from(binaryHash).toString('base64');
    return base64Value.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

module.exports = { generateSecurePathHash }