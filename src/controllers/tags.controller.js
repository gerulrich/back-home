const MusicTag = require("../models/music-tag");
const sockets = require("../websocket/user-sockets");

const getMusicTags = async(req, res) => {
    const { limit = 25, offset = 0, q } = req.query;
    const query = q ? { code: q } : {};
    const [ total, tags ] = await Promise.all([
        MusicTag.countDocuments(query), 
        MusicTag.find(query).populate('album', 'artist title cover_url').limit(limit).skip(offset)
    ])
    res.json({ tags, total });
}

const getMusicTagById = async(req, res) => {
    const { id } = req.params;
    const tag = await MusicTag.findById(id).populate('album', 'artist title cover_url');
    if (!tag) {
        return res.status(404).json({msg: `MusicTag ${id} not found`});
    }
    res.json(tag);
}

const createMusicTag = (req, res) => {
    const {_id, enabled, ...data} = req.body;
    const tag = new MusicTag(data);
    tag.save();
    res.json(tag);
}

const updateMusicTag = async(req, res) => {
    const { id } = req.params;
    const { album, code } = req.body;
    const tag = await MusicTag.findByIdAndUpdate(id, {album, code}, {new: true});
    if (!tag) {
        return res.status(404).json({msg: `MusicTag ${id} not found`});
    }
    res.json(tag);
}

const deleteMusicTag = async(req, res) => {
    const { id } = req.params;
    const { deletedCount } = await MusicTag.deleteOne({_id: id});
    if (deletedCount === 0) {
        return res.status(404).json({msg: `MusicTag ${id} not found`});
    }
    res.status(204).end();
}

const sendCodeToClients = (req, res) => {
    const { code } = req.body;
    sockets.io.emit('tag', {code});
    res.json({code});
}

module.exports = {
    getMusicTags,
    getMusicTagById,
    createMusicTag,
    updateMusicTag,
    deleteMusicTag,
    sendCodeToClients
}