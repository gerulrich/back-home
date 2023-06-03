const { Router } = require('express');
const { check } = require('express-validator');
const  {requestValidator, validateJWT, rolesAllowed}  = require('../middlewares');
const { getChannelById, getChannels, createChannel, updateChannel, deleteChannel } = require('../controllers/channels.controller');

const router = Router();


router.get('/channels/:id', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    check('id', 'An invalid channel id was supplied').isMongoId(),
    requestValidator
], getChannelById);


router.get('/channels', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    requestValidator
], getChannels);


router.post('/channels', [
    validateJWT,
    rolesAllowed('ADMIN_ROLE'),
    requestValidator
], createChannel);


router.put('/channels/:id',  [
    validateJWT,
    rolesAllowed('ADMIN_ROLE'),
    check('id', 'An invalid channel id was supplied').isMongoId(),
    requestValidator
], updateChannel);

router.delete('/channels/:id',  [
    validateJWT,
    rolesAllowed('ADMIN_ROLE'),
    requestValidator
], deleteChannel);

module.exports = router;