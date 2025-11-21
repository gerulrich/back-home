const { Router } = require('express');
const { check } = require('express-validator');
const  {requestValidator, validateJWT, rolesAllowed}  = require('../middlewares');
const { sendCodeToClients, createMusicTag, getMusicTags, getMusicTagById, getMusicTagByCode, updateMusicTag, deleteMusicTag, playMusicTag, queueMusicTag } = require('../controllers/tags.controller');

const router = Router();

router.get('/', [
    //validateJWT,
    //rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    //requestValidator
], getMusicTags);

router.get('/:id', [
], getMusicTagById);

router.post('/', [
    validateJWT,
    check('code', '\'code\' is a required field.').notEmpty(),
    check('type', '\'type\' is a required field.').notEmpty(),
    check('type', '\'type\' must be either QR or RFID').isIn(['QR', 'RFID']),
    check('source', '\'source\' is a required field.').notEmpty(),
    check('source', '\'source\' must be either local or heos').isIn(['local', 'heos']),
    check('album', '\'album\' is a required field.').notEmpty(),
    check('album', 'An invalid album id was supplied').isMongoId(),
    rolesAllowed('ADMIN_ROLE'),
    requestValidator
], createMusicTag);

router.put('/:id', [
    validateJWT,
    check('code', '\'code\' is a required field.').notEmpty(),
    check('type', '\'type\' is a required field.').notEmpty(),
    check('type', '\'type\' must be either QR or RFID').isIn(['QR', 'RFID']),
    check('source', '\'source\' is a required field.').notEmpty(),
    check('source', '\'source\' must be either local or heos').isIn(['local', 'heos']),
    check('album', '\'album\' is a required field.').notEmpty(),
    check('album', 'An invalid album id was supplied').isMongoId(),
    rolesAllowed('ADMIN_ROLE'),
    requestValidator
], updateMusicTag);

router.delete('/:id', [
    validateJWT,
    rolesAllowed('ADMIN_ROLE'),
    check('id', 'An invalid MusicTag id was supplied').isMongoId(),
    requestValidator
], deleteMusicTag);

router.post('/:id/play', [
    validateJWT,
    check('id', 'An invalid MusicTag id was supplied').isMongoId(),
    requestValidator
], playMusicTag);

router.post('/:id/queue', [
    check('id', 'An invalid MusicTag id was supplied').isMongoId(),
    requestValidator
], queueMusicTag);

router.get('/code/:code', [
], getMusicTagByCode);

router.post('/code', [
    check('code', '\'code\' is a required field.').notEmpty(),
    requestValidator
], sendCodeToClients);


module.exports = router;