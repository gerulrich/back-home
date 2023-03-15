const { Router } = require('express');
const { check } = require('express-validator');
const  {requestValidator, validateJWT, rolesAllowed}  = require('../middlewares');
const { getUsers, createUser, updateUser, deleteUser, getUserById } = require('../controllers/users.controller');
const { isValidRoles, emailExists, userExists } = require('../helpers/db-validators');
//const { esRoleValido, emailExiste, existeUsuario } = require('../helpers/db-validators');

const router = Router();

router.get('/', [
    validateJWT,
    requestValidator
], getUsers);

router.get('/:id', [
    validateJWT,
    check('id', 'An invalid user id was supplied').isMongoId(),
    requestValidator
], getUserById);

router.post('/', [
    validateJWT,
    rolesAllowed('ADMIN_ROLE'),
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    check('email', 'El email no es válido').isEmail(),
    check('email').custom(emailExists),
    check('password', 'El password debe ser de mas de 6 letras').isLength({min: 6}),
    check('roles').custom(isValidRoles),
    requestValidator
], createUser);

router.put('/:id', [
    validateJWT,
    rolesAllowed('ADMIN_ROLE'),
    check('id', 'An invalid user id was supplied').isMongoId(),
    check('roles').custom(isValidRoles),
    requestValidator
], updateUser);

router.delete('/:id', [
    validateJWT,
    rolesAllowed('ADMIN_ROLE'),
    check('id', 'An invalid user id was supplied').isMongoId(),
    requestValidator
], deleteUser);

module.exports = router;