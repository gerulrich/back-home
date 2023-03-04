const { Schema, model } = require('mongoose');

const AlbumSchema = Schema({
    title: {
        type: String,
        required: [true, '\'title\' is a required field.']
    },
    artist: {
        type: String,
        required: [true, '\'artist\' is a required field.']
    },
    source: {
        type: String,
        required: [true, '\'source\' is a required field.']
    },
    deezer_id: Number,
    cover_url: String,
    format: {
        type: String,
        required: [true, '\'format\' is a required field.'],
        enum: ['MP3_128', 'MP3_320', 'FLAC']
    },
    tracks: [{
        title: {
            type: String,
            required: [true, '\'title\' is a required field.']
        },
        artist: String,
        track_number: Number,
        cd_number: Number,
        media_url: {
            type: String,
            required: [true, '\'media_url\' is a required field.']
        }
    }]
});

module.exports = model('Album', AlbumSchema)