const  requestValidator  = require('../middlewares/request-validator');
const  validateJWT  = require('../middlewares/validate-jwt');
const  rolesAllowed  = require('../middlewares/roles-allowed');

module.exports = {
    ...requestValidator, ...validateJWT, ...rolesAllowed
}