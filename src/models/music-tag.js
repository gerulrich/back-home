const { Schema, model } = require('mongoose');

const MusicTagSchema = Schema({
    code: {
        type: String,
        required: [true, '\'code\' is a required field.'],
        unique: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    type: {
        type: String,
        enum: ['QR', 'RFID'],
        required: [true, '\'type\' is a required field.']
    },
    source: {
        type: String,
        enum: ['local', 'heos'],
        required: [true, '\'source\' is a required field.']
    },
    album: {
        type: Schema.Types.ObjectId,
        ref: 'Album',
        required: true
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
        }
    }
});


module.exports = model('MusicTag', MusicTagSchema);