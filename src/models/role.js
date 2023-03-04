const { Schema, model } = require('mongoose');

const RoleSchema = Schema({
    role: {
        type: String,
        required: [true, '\'name\' is a required field.']
    }
});

module.exports = model('Role', RoleSchema)