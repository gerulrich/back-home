const { Schema, model } = require('mongoose');
const { generateSecurePathHash } = require('../helpers/secure-url');

const TrackSchema = Schema(
    {
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
    },
    {
        toObject: {
            transform: function (doc, ret) {
                ret.uid = ret._id;
                delete ret._id;
                delete ret.__v;
            }
        },
        toJSON: {
            transform: function (doc, ret) {
                ret.uid = ret._id;
                delete ret._id;
                delete ret.__v;
                const expires = Math.ceil(Date.now() / 1000) + 14400;
                const hash = generateSecurePathHash(ret.media_url, expires);
                const path = ret.media_url.split('/').map(p => encodeURIComponent(p)).join('/');
                ret.media_url = `${process.env.NGINX_DOMAIN}${path}?h=${hash}&e=${expires}`;
            }
        }
    }
);


const AlbumSchema = Schema(
    {
        title: {
            type: String,
            required: [true, '\'title\' is a required field.']
        },
        artist: {
            type: String,
            required: [true, '\'artist\' is a required field.']
        },
        album_artist: String,
        comments: String,
        origin_type: {
            type: String,
            enum: ['CD_RIP', 'WEB_DOWNLOAD', 'TORRENT_DOWNLOAD'],
            required: [true, '\'origin_type\' is a required field.']
        },
        upc: String,
        source: String,
        source_id: Number,
        cover_url: String,
        format: {
            type: String,
            required: [true, '\'format\' is a required field.'],
            enum: ['FLAC', 'MP3', 'ALAC', 'ACC']
        },
        quality: {
            type: String,
            enum: ['LOW', 'HIGH', 'LOSSLESS', 'HI_RES', 'MQA']
        },        
        year: {
            type: String,
            required: [true, '\'year\' is a required field.']
        },
        tracks: [TrackSchema]
    },
    {
        toObject: {
            transform: function (doc, ret) {
                ret.uid = ret._id;
                delete ret._id;
                delete ret.__v;
            }
        },
        toJSON: {
            transform: function (doc, ret) {
                ret.uid = ret._id;
                delete ret._id;
                delete ret.__v;
            }
        }
    }
);

AlbumSchema.index({ title: 'text', artist: 'text', 'tracks.title': 'text', 'tracks.artist': 'text' }, { default_language: "spanish" });

module.exports = model('Album', AlbumSchema);