const jwt = require('jsonwebtoken')
const User = require('../models/user')

const validateJWT = async(req, res, next) => {
    const token = req.header('Authorization')
    if (!token) {
        return res.status(401).json({msg: 'Authorization header is required'});
    }
    try {
        const { uid, roles } = jwt.verify(token.substring(7), process.env.JWT_SECRET_KEY);
        const user = await User.findById(uid);

        if (!user.enabled) {
            return res.status(401).json({msg: 'Authorization header is invalid or has been expired'});
        }

        req.user = {
            uid,
            roles
        };
        req
        next();
    } catch (error) {
        return res.status(401).json({msg: 'Authorization header is invalid or has been expired'});
    }

}

module.exports = { validateJWT }