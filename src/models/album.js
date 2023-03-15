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
    upc: String,
    source: {
        type: String,
        required: [true, '\'source\' is a required field.']
    },
    source_id: Number,
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
        disc_number: Number,
        comments: String,
        isrc: String,
        upc: String,
        duration: Number,
        media_url: {
            type: String,
            required: [true, '\'media_url\' is a required field.']
        }
    }]
});

AlbumSchema.methods.toJSON = function() {
    const {__v, _id, ...album} = this.toObject();
    album.uid = _id;
    const tracks = album.tracks.map(track => {
        const {_id, ...others} = track;
        others.uid = _id;
        return others;
    });
    album.tracks = tracks;
    return album;
}

module.exports = model('Album', AlbumSchema);