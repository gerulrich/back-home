const Album  = require("../models/album");
const sockets = require("../websocket/user-sockets");
const { spawn } = require('child_process');


const getAlbums = async(req, res) => {
    const { limit = 25, offset = 0, q } = req.query;
    const query = q ? {$text: {$search:q}} : {};
    const [ total, albums ] = await Promise.all([
        Album.countDocuments(query), 
        Album.find(query).sort({artist: 1, year: 1, title: 1}).limit(limit).skip(offset)
    ])
    res.json({
        albums,
        paging: {
            page: Math.ceil(offset / limit) + 1,
            total: Math.ceil(total / limit),
        }
    });
}

const getAlbumById = async(req, res) => {
    const { id } = req.params;
    const album = await Album.findById(id);
    if (!album) {
        return res.status(404).json({msg: `Album ${id} not found`});
    }
    res.json(album);
}

const getAlbumBySourceId = async(req, res) => {
    const { source, id,  } = req.params;
    const { upc} = req.query;
    const query = upc
     ? ({ $or:[{upc}, {source, source_id: parseInt(id)}]})
     : ({source, source_id: parseInt(id)});
    const album = await Album.findOne(query);
    if (!album) {
        return res.status(404).json({msg: `Album ${id} not found`});
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
        return res.status(404).json({msg: `Album ${id} not found`});
    }
    res.status(204).end();
}

const getTracksByAlbumId = async(req, res) => {
    const { id } = req.params;
    const album = await Album.findById(id);
    if (!album) {
        return res.status(404).json({msg: `Album ${id} not found`});
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

const getSpectrumpicTrackById = async(req, res) => {
    const { id, trackId } = req.params;
    const album = await Album.findById(id);
    if (!album) {
        return res.status(404).json({msg: `Album ${id} not found`});
    }
    const [track] = album.tracks.filter(t => t._id.toString() == trackId);
    if (!track) {
        return res.status(404).json({msg: `Track ${trackId} not found`});
    }
    const inputFilePath = process.env.STATIC_PARENT_FOLDER + track.media_url;

    const ffmpegCommand = [
        '-i', inputFilePath,
        '-lavfi', 'showspectrumpic=s=1024x512:mode=combined:color=rainbow:fscale=lin',
        '-f', 'image2pipe',
        '-vcodec', 'png',
        '-'
    ];  
      
    // Iniciar el proceso de ffmpeg
    const ffmpegProcess = spawn('ffmpeg', ffmpegCommand);
    ffmpegProcess.stdout.pipe(res);

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
    const { uid, album, message, level, date, progress } = req.body;
    const socket = sockets.sockets[uid];
    if (socket) {
        socket.emit('download-progress', { album, message, level, date, progress });
        user = sockets.users[uid];
        return res.json({ user, message });
    }
    res.status(404).json({message: `socket for user ${uid} not found`});
}

const getAlbumStats = async(req, res) => {
    let stats = await Album.aggregate([
        {
          $group: { _id: { format: '$format', quality: { $ifNull: ['$quality', ''] }}, count: { $sum: 1 }},
        },
        {
            $project: { _id: 0, format: '$_id.format', quality: '$_id.quality', count: '$count'}
        },
        {
            $group: { 
                _id: { 
                    format: '$format',
                    quality: { $cond: { if: { $eq: ['$quality', ''] }, then: 'UNKNOWN', else: '$quality', }}
                },
                count: { $sum: '$count', }
            }
        }
      ]);
      res.json(stats);

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
    getSpectrumpicTrackById,
    updateTrackById,
    downloadProgress,
    getAlbumStats
}