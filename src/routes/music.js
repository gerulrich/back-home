const { Router } = require('express');
const { check } = require('express-validator');
const  {requestValidator, validateJWT, rolesAllowed}  = require('../middlewares');
const { 
    getAlbums, 
    getAlbumById,
    getAlbumBySourceId,
    createAlbum,
    deleteAlbum,
    updateAlbum,
    getTracksByAlbumId,
    getTrackById,
    updateTrackById, 
    downloadProgress,
    getSpectrumpicTrackById,
    getAlbumStats,
    getMediaUrl
} = require('../controllers/music.controller');

const router = Router();

router.get('/albums', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    requestValidator
],getAlbums);

router.get('/albums/:id', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    check('id', 'An invalid album id was supplied').isMongoId(),
    requestValidator
], getAlbumById);

router.get('/albums/:source/:id', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    check('id', 'An invalid album id was supplied').not().isEmpty(),
    requestValidator
], getAlbumBySourceId);

router.post('/albums', [
    // validateJWT,
    // rolesAllowed('ADMIN_ROLE'),
    check('title', '\'title\' is a required field.').not().isEmpty(),
    check('artist', '\'artist\' is a required field.').not().isEmpty(),
    check('source', '\'source\' is a required field.').not().isEmpty(),
    check('format', '\'format\' is a required field.').not().isEmpty(),
    check('tracks.*.title', '\'title\' is a required field.').not().isEmpty(),
    check('tracks.*.artist', '\'artist\' is a required field.').not().isEmpty(),
    check('tracks.*.media_url', '\'media_url\' is a required field.').not().isEmpty(),
    check('tracks.*.track_number', '\'track_number\' is a required field.').not().isEmpty(),
    requestValidator
], createAlbum);

router.put('/albums/:id', [
    validateJWT,
    rolesAllowed('ADMIN_ROLE'),
    check('id', 'An invalid album id was supplied').isMongoId(),
    requestValidator
], updateAlbum);

router.delete('/albums/:id', [
    validateJWT,
    rolesAllowed('ADMIN_ROLE'),
    check('id', 'An invalid album id was supplied').isMongoId(),
    requestValidator
], deleteAlbum);

router.get('/albums/:id/tracks', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    check('id', 'An invalid album id was supplied').isMongoId(),
    requestValidator
], getTracksByAlbumId);

router.get('/albums/:id/tracks/:trackId', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    check('id', 'An invalid album id was supplied').isMongoId(),
    requestValidator
], getTrackById);

router.get('/albums/:id/tracks/:trackId/media', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    check('id', 'An invalid album id was supplied').isMongoId(),
    requestValidator
], getMediaUrl);

router.put('/albums/:id/tracks/:trackId', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    check('id', 'An invalid album id was supplied').isMongoId(),
    check('title', '\'title\' is a required field.').not().isEmpty(),
    check('artist', '\'artist\' is a required field.').not().isEmpty(),
    check('media_url', '\'media_url\' is a required field.').not().isEmpty(),
    check('track_number', '\'track_number\' is a required field.').not().isEmpty(),
    requestValidator
], updateTrackById);

router.get('/albums/:id/tracks/:trackId/spectrumpic', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    check('id', 'An invalid album id was supplied').isMongoId(),
    requestValidator
], getSpectrumpicTrackById);

router.get('/stats', [
    validateJWT,
    rolesAllowed('USER_ROLE', 'ADMIN_ROLE'),
    requestValidator
],getAlbumStats);


router.post('/download/progress', downloadProgress);


module.exports = router;