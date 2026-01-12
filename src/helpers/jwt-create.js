const jwt = require('jsonwebtoken');
const User = require("../models/user")

const createJWT = (uid, roles = []) => {
    return new Promise((resolve, reject) => {
        const payload = { uid, roles };
        jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '14d'}, (error, token) => {
            if (error) {
                console.log(error);
                reject('Error creating jwt');
            } else {
                resolve(token)
            }
        });
    });
}

const validateJWT = async(token = '') => {
    try {
        if (token.length < 10) return null;
        const { uid } = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const user = await User.findById(uid);
        if (user && user.enabled)
            return user;
        return null;
    } catch (error) {
        console.error("Invalid token or token expired: ", error);
        return null;
    }
}


module.exports = { createJWT, validateJWT }