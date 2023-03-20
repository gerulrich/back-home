const Album  = require("../models/album");
const sockets = require("../websocket/user-sockets");

const getAlbums = async(req, res) => {
    const {limit = 25, offset = 0} = req.query;
    const [total, albums] = await Promise.all([
        Album.countDocuments(), 
        Album.find().limit(limit).skip(offset)
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

const track_response = (track) => {
    const { _id: uid, title, artist, track_number, disc_number, comments, media_url, isrc, upc, duration} = track;
    return {
        uid,
        title,
        artist,
        track_number,
        disc_number,
        comments,
        media_url,
        isrc,
        upc,
        duration        
    }
}

const getTracksByAlbumId = async(req, res) => {
    const { id } = req.params;
    const album = await Album.findById(id);
    if (!album) {
        res.status(404).json({msg: `Album ${id} not found`});
    }
    res.json(album.tracks.map(track => track_response(track)));
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
    res.json(track_response(track));
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
    res.json(track_response(track));
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
    createAlbum,
    updateAlbum,
    deleteAlbum,
    getTracksByAlbumId,
    getTrackById,
    updateTrackById,
    downloadProgress
}