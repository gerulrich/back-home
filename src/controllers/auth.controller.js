const bcryptjs = require('bcryptjs');
const { createJWT } = require('../helpers/jwt-create');
const logger = require('../helpers/logger');
const User = require("../models/user")
//const { googleVerify } = require('../helpers/google-verify');

const login = async(req, res) => {
    const {email, password} = req.body;
    const user = await User.findOne({email});
    if (!user) {
        return res.status(401).json({
            msg: "email or password mismatch"
        });
    }

    if (user.enabled == false) {
        return res.status(401).json({
            msg: "email or password mismatch"
        });    
    }

    const validPassword = bcryptjs.compareSync(password, user.password);
    if (!validPassword) {
        return res.status(401).json({
            msg: "email or password mismatch"
        });
    }
    try {
        const token = await createJWT(user.id, user.roles);

        return res.json({ user, token });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            error: 'Unexpected error has ocurred'
        });
    }
}

const renewToken = async(req, res) => {
    const { uid, roles = [] } = req.user;
    try {
        const token = await createJWT(uid, roles);
        return res.json({ token });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            error: 'Unexpected error has ocurred'
        });
    }
}

const googleSignIn = async(req, res) => {
    const { token } = req.body;

    return res.status(401).json({
        msg: "email or password mismatch"
    });


    /*try {
        const {email, name, picture} = await googleVerify(token);

        let usuario = await Usuario.findOne({email});
        if (!usuario) {
            const data = {
                nombre: name,
                email,
                img: picture,
                password: ':P',
                google: true,
                role: 'USER_ROLE'
            }
            usuario = new Usuario(data);
            await usuario.save();
        }

        if (!usuario.enabled) {
            return res.status(401).json({error: 'El usuario ha sido bloqueado'});
        }

        const token = await createJWT(usuario.id);

        res.json({
            msg: "Login ok",
            usuario,
            token
        });
    } catch (error) {
        return res.status(401).json({ msg: "El token no se pudo verificar"}); 
    }*/
}

module.exports = {
    login,
    renewToken,
    googleSignIn
}