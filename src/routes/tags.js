const { Router } = require('express');
const { check } = require('express-validator');
const { sendCodeToClients } = require('../controllers/tags.controller');
const { requestValidator } = require('../middlewares/request-validator');

const router = Router();

router.post('/code', [
    check('code', '\'code\' is a required field.').notEmpty(),
    requestValidator
], sendCodeToClients);


module.exports = router;