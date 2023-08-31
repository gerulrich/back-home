const { Schema, model } = require('mongoose');

const RecordingSchema = Schema({
    recording_id: {
        type: String,
        required: [true, '\'recording_id\' is a required field.']
    },
    title: {
        type: String,
        required: [true, '\'title\' is a required field.']
    },
    description: {
        type: String,
        required: [true, '\'description\' is a required field.']
    },
    start: {
        type: Date,
        required: [true, '\'start\' is a required field.']
    },
    end: {
        type: Date,
        required: [true, '\'end\' is a required field.']
    },
    media_url: {
        type: String,
        required: false
    },
    drm: {
        type: { type: String },
        licenceUrl: String,
        clear_keys: {
            key_id: String,
            key: String
        }
    },
    enabled: {
        type: Boolean,
        default: true
    },
    image: String,
    type: String,
    show_type: String,
    duration: Number,
    episode_title: String,
    genre: String,
    ndvr_allowed: Boolean,
    ndvr_expire: Number,
    season_number: Number,
    episode_number: Number,
    series_id: String,
    season_id: String,
    program_id: String,
    channel: {
        type: Schema.Types.ObjectId,
        ref: 'Channel',
        required: true
    },
    epg_name: String,
    channel_name: String,
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
});

RecordingSchema.index({ start: 1 }, { expireAfterSeconds: 15552000 });
RecordingSchema.index({ start: 1, end: 1, epg_name: 1, recording_id: 1 });
RecordingSchema.index({ title: 'text', description: 'text', episode_title: 'text', genre: 'text', channel_name: 'text'}, { default_language: "spanish" });


module.exports = model('Recording', RecordingSchema)