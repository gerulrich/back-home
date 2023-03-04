const Role = require("../models/role");
const User= require("../models/user");

const asyncEvery = async (arr, predicate) => {
	for (let e of arr) {
		if (!await predicate(e)) return false;
	}
	return true;
};

const isValidRoles = async(roles = []) => {
    
    const valid = await asyncEvery(roles, async (role) => {
        const exists = await Role.findOne({role});
        return !!exists;
    });

    if (!valid) {
        throw new Error('Some of the specified roles is invalid');
    }
}

const emailExists = async(email = '') => {
    const found = await User.findOne({email});
    if (found) {
        throw new Error(`email ${ email } is already registered`);
    }
}

const userExists = async(id = '') => {
    const existUser = await Usuario.findById(id);
    if (!existUser) {
        throw new Error(`Invalid user ${ id }`);
    }
}

module.exports = { isValidRoles, userExists, emailExists}