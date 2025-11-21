const MusicTag = require("../models/music-tag");
const sockets = require("../websocket/user-sockets");
const logger = require("../helpers/logger");

const getMusicTags = async(req, res) => {
    const { limit = 25, offset = 0, q } = req.query;
    const query = q ? { code: q } : {};
    const [ total, tags ] = await Promise.all([
        MusicTag.countDocuments(query), 
        MusicTag.find(query).populate('album', 'artist title cover_url').limit(limit).skip(offset)
    ])
    res.json({ 
        tags, 
        paging: {
            page: Math.ceil(offset / limit) + 1,
            total: Math.ceil(total / limit),
        }
    });
}

const getMusicTagById = async(req, res) => {
    const { id } = req.params;
    const tag = await MusicTag.findById(id).populate('album', 'artist title cover_url');
    if (!tag) {
        return res.status(404).json({msg: `MusicTag ${id} not found`});
    }
    res.json(tag);
}

const getMusicTagByCode = async(req, res) => {
    const { code } = req.params;
    const tag = await MusicTag.findOne({ code }).populate('album', 'artist title cover_url');
    if (!tag) {
        return res.status(404).json({msg: `MusicTag with code ${code} not found`});
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
    const { album, code, type, source } = req.body;
    const tag = await MusicTag.findByIdAndUpdate(id, {album, code, type, source}, {new: true});
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

const playMusicTag = async(req, res) => {
    const { id } = req.params;
    logger.info(`[playMusicTag] Request to play tag with id: ${id}`);
    const tag = await MusicTag.findById(id).populate('album', 'artist title cover_url');
    if (!tag) {
        logger.warn(`[playMusicTag] MusicTag ${id} not found`);
        return res.status(404).json({msg: `MusicTag ${id} not found`});
    }
    logger.info(`[playMusicTag] Playing tag ${id} - Album: ${tag.album.title} by ${tag.album.artist}, Source: ${tag.source}`);
    // TODO: Implementar lógica de reproducción según el source (local/heos)
    res.json({ action: 'play', tag });
}

const queueMusicTag = async(req, res) => {
    const { id } = req.params;
    logger.info(`[queueMusicTag] Request to queue tag with id: ${id}`);
    const tag = await MusicTag.findById(id).populate('album', 'artist title cover_url');
    if (!tag) {
        logger.warn(`[queueMusicTag] MusicTag ${id} not found`);
        return res.status(404).json({msg: `MusicTag ${id} not found`});
    }
    logger.info(`[queueMusicTag] Queueing tag ${id} - Album: ${tag.album.title} by ${tag.album.artist}, Source: ${tag.source}`);
    // TODO: Implementar lógica de cola según el source (local/heos)
    res.json({ action: 'queue', tag });
}

const sendCodeToClients = (req, res) => {
    const { code } = req.body;
    sockets.io.emit('tag', {code});
    res.json({code});
}

module.exports = {
    getMusicTags,
    getMusicTagById,
    getMusicTagByCode,
    createMusicTag,
    updateMusicTag,
    deleteMusicTag,
    playMusicTag,
    queueMusicTag,
    sendCodeToClients
}