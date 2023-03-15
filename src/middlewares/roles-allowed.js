
const rolesAllowed = ( ...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(500).json({mnsg: 'Token must be validated before call rolesAllowed'});
        }
        if (!req.user.roles.some(role => roles.includes(role))) {
            return res.status(401).json({mnsg: `User ${req.user.name} does not have the necessary privileges.`});
        }
        next();
    };
}

module.exports = {rolesAllowed}