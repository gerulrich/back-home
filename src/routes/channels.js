const { Router } = require('express');
const  {requestValidator, validateJWT, rolesAllowed}  = require('../middlewares');
const { getChannelById, getChannels, createChannel, updateChannel, deleteChannel } = require('../controllers/channels.controller');

const router = Router();


router.get('/channels/:id', [
    validateJWT,
    rolesAllowed(['USER_ROLE', 'ADMIN_ROLE']),
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


router.patch('/channels/:id',  [
    validateJWT,
    rolesAllowed('ADMIN_ROLE'),
    requestValidator
], updateChannel);

router.delete('/channels/:id',  [
    validateJWT,
    rolesAllowed('ADMIN_ROLE'),
    requestValidator
], deleteChannel);

module.exports = router;