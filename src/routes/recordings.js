const { Router } = require('express');
const { check } = require('express-validator');
const  {requestValidator, validateJWT, rolesAllowed}  = require('../middlewares');
const { getRecordings } = require('../controllers/recordings');

const router = Router();

router.get('/', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    requestValidator
], getRecordings);

module.exports = router;