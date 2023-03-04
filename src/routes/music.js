const { Router } = require('express');
const { check } = require('express-validator');
const  {requestValidator, validateJWT, rolesAllowed}  = require('../middlewares');
const { getAlbums, createAlbum, deleteAlbum } = require('../controllers/music.controller');


const router = Router();

router.get('/albums', getAlbums);

router.post('/albums', createAlbum);

router.delete('/albums/:id', [
    check('id', 'invalid id').isMongoId(),
    requestValidator
], deleteAlbum);

module.exports = router;