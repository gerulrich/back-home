const { Router } = require('express');
const { check } = require('express-validator');
const  {requestValidator, validateJWT, rolesAllowed}  = require('../middlewares');
const { sendCodeToClients, createMusicTag, getMusicTags, updateMusicTag, deleteMusicTag } = require('../controllers/tags.controller');

const router = Router();

router.get('/', [
    //validateJWT,
    //rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    //requestValidator
], getMusicTags);

router.post('/', [
    validateJWT,
    check('code', '\'code\' is a required field.').notEmpty(),
    check('album', '\'album\' is a required field.').notEmpty(),
    check('album', 'An invalid album id was supplied').isMongoId(),
    rolesAllowed('ADMIN_ROLE'),
    requestValidator
], createMusicTag);

router.put('/:id', [
    validateJWT,
    check('code', '\'code\' is a required field.').notEmpty(),
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


router.post('/code', [
    check('code', '\'code\' is a required field.').notEmpty(),
    requestValidator
], sendCodeToClients);


module.exports = router;