const { Schema, model } = require('mongoose');

const UserSchema = Schema({
    name: {
        type: String,
        required: [true, '\'name\' is a required field.']
    },
    password: {
        type: String,
        required: [true, '\'password\' is a required field.'],
        unique: true
    },
    email: {
        type: String,
        required: [true, '\'email\' is a required field.'],
        unique: true
    },
    img: {
        type: String,
    },
    roles: {
        type: [String],
        required: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    google: {
        type: Boolean,
        default: false
    }
});

UserSchema.methods.toJSON = function() {
    const {__v, password, _id, ...user} = this.toObject();
    user.uid = _id;
    return user;
}

module.exports = model('User', UserSchema)