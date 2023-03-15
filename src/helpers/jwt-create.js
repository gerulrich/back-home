const jwt = require('jsonwebtoken')

const createJWT = (uid, roles = []) => {
    return new Promise((resolve, reject) => {
        const payload = { uid, roles };
        jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '4h'}, (error, token) => {
            if (error) {
                console.log(error);
                reject('Error creating jwt');
            } else {
                resolve(token)
            }
        });
    });
}


module.exports = { createJWT }