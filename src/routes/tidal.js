const { Router } = require('express');
const { check } = require('express-validator');
const  {requestValidator, validateJWT, rolesAllowed}  = require('../middlewares');
const { findAlbumsByText, getAlbumById, getAlbumsByArtist, getStreamsUrlByAlbumId, launchDownloadAlbum } = require('../controllers/tidal.controller');

const router = Router();

router.get('/albums', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    requestValidator
], findAlbumsByText);

router.get('/albums/:id', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    requestValidator
], getAlbumById);

router.get('/artists/:id/albums', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    requestValidator
], getAlbumsByArtist);

router.post('/albums/:id/download', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    requestValidator
], launchDownloadAlbum);


module.exports = router;