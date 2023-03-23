const Album  = require("../models/album");
const sockets = require("../websocket/user-sockets");

const getAlbums = async(req, res) => {
    const { limit = 25, offset = 0, q } = req.query;
    const rgx = (pattern) => new RegExp(`.*${pattern}.*`);
    const query = q ? { $or: [
      { title: { $regex: rgx(q), $options: "i" } },
      { artist: { $regex: rgx(q), $options: "i" } },
      { upc : q }
    ]} : {};

    const [ total, albums ] = await Promise.all([
        Album.countDocuments(query), 
        Album.find(query).limit(limit).skip(offset)
    ])
    res.json({ albums, total });
}

const getAlbumById = async(req, res) => {
    const { id } = req.params;
    const album = await Album.findById(id);
    if (!album) {
        res.status(404).json({msg: `Album ${id} not found`});
    }
    res.json(album);
}

const getAlbumBySourceId = async(req, res) => {
    const { source, id } = req.params;
    const query = { source, source_id: id } ;
    const album = await Album.findOne(query);
    if (!album) {
        res.status(404).json({msg: `Album ${id} not found`});
    }
    res.json(album);
}

const createAlbum = async(req, res) => {
    const {_id, ...data} = req.body;
    const album = new Album(data);
    album.save();
    res.json(album);
}

const updateAlbum = async(req, res) => {
    const { id } = req.params;
    const {tracks, ...data } = req.body;
    const album = await Album.findByIdAndUpdate(id, data, {new: true});
    res.json(album);
}

const deleteAlbum = async(req, res) => {
    const { id } = req.params;
    const {deletedCount} = await Album.deleteOne({_id: id});
    if (deletedCount === 0) {
        res.status(404).json({msg: `Album ${id} not found`});
    }
    res.status(204).end();
}

const getTracksByAlbumId = async(req, res) => {
    const { id } = req.params;
    const album = await Album.findById(id);
    if (!album) {
        res.status(404).json({msg: `Album ${id} not found`});
    }
    res.json(album.tracks);
}

const getTrackById = async(req, res) => {
    const { id, trackId } = req.params;
    const album = await Album.findById(id);
    if (!album) {
        return res.status(404).json({msg: `Album ${id} not found`});
    }
    const [track] = album.tracks.filter(t => t._id.toString() == trackId);
    if (!track) {
        return res.status(404).json({msg: `Track ${trackId} not found`});
    }
    res.json(track);
}

const updateTrackById = async(req, res) => {
    const { id, trackId } = req.params;
    const {_id:not_use, ...update} = req.body;
    update._id = trackId;
    
    const album = await Album.findOneAndUpdate(
        { _id: id, tracks: { '$elemMatch': { _id: trackId }}},
        { $set: { 
            'tracks.$': update,
        }},
        { new: true }
    );
    if (!album) {
        return res.status(404).json({msg: `Track ${ trackId } from album ${ id }`});
    }
    const [track] = album.tracks.filter(t => t._id.toString() == trackId);
    res.json(track);
}

const downloadProgress = async(req, res) => {
    const {uid, album, message, level, date} = req.body;
    const socket =  sockets.sockets[uid];
    if (socket) {
        socket.emit('download-progress', { album, message, level, date });
        user = sockets.users[uid];
        return res.json({ user, message });
    }
    res.status(404).json({message: `socket for user ${uid} not found`});
}

module.exports = {
    getAlbums,
    getAlbumById,
    getAlbumBySourceId,
    createAlbum,
    updateAlbum,
    deleteAlbum,
    getTracksByAlbumId,
    getTrackById,
    updateTrackById,
    downloadProgress
}