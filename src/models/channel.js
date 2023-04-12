const { Schema, model } = require('mongoose');

const ChannelSchema = Schema({
    name: {
        type: String,
        required: [true, '\'name\' is a required field.']
    },
    logo: String,
    media_url: {
        type: String,
        required: [true, '\'media_url\' is a required field.']
    },
    drm: {
        clear_keys: {
            key_id: String,
            key: String
        }
    },
    enabled: {
        type: Boolean,
        default: true
    },
});

module.exports = model('Channel', ChannelSchema)