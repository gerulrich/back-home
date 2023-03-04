const { Router } = require('express');
const { check } = require('express-validator');
const { login, googleSignIn } = require('../controllers/auth.controller');
const { requestValidator } = require('../middlewares/request-validator');

const router = Router();

router.post('/login', [
    check('email', '\'email\' is a required field.').isEmail(),
    check('password', '\'password\' is a required field.').notEmpty(),
    requestValidator
], login);

router.post('/google', [
    check('token', '\'token\' is a required field.').not().isEmpty(),
    requestValidator
], googleSignIn);


module.exports = router;