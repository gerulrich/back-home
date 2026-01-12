const { generateSecurePathHash } = require("../helpers/secure-url");
const Album  = require("../models/album");
const sockets = require("../websocket/user-sockets");
const { spawn } = require('child_process');
const logger = require("../helpers/logger");
const mpd = require("../helpers/mpd-api");
const denon = require("../helpers/denon-api");


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

const getMediaUrl = async(req, res) => {
    const { id, trackId } = req.params;
    const album = await Album.findById(id);
    if (!album) {
        return res.status(404).json({msg: `Album ${id} not found`});
    }
    const [track] = album.tracks.filter(t => t._id.toString() == trackId);
    if (!track) {
        return res.status(404).json({msg: `Track ${trackId} not found`});
    }
    // TODO redirect to 
    const expires = Math.ceil(Date.now() / 1000) + 14400;
    const hash = generateSecurePathHash(track.media_url, expires);
    const path = track.media_url.split('/').map(p => encodeURIComponent(p)).join('/');
    const media_url = `${process.env.NGINX_DOMAIN}${path}?h=${hash}&e=${expires}`;
    res.json({
        media_url
    });
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
    
    const ffmpegCommand = [
        '-i', track.file_path,
        '-lavfi', 'showspectrumpic=s=1024x512:mode=combined:color=rainbow:fscale=lin',
        '-f', 'image2pipe',
        '-vcodec', 'png',
        '-'
    ];  
      
    // Iniciar el proceso de ffmpeg
    const ffmpegProcess = spawn(process.env.FFMPEG_PATH, ffmpegCommand);
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

const playAlbum = async(req, res) => {
    const { id } = req.params;
    logger.info(`[playAlbum] Request to play album with id: ${id}`);
    
    const album = await Album.findById(id);
    if (!album) {
        logger.warn(`[playAlbum] Album ${id} not found`);
        return res.status(404).json({msg: `Album ${id} not found`});
    }
    
    logger.info(`[playAlbum] Playing album "${album.title}" by "${album.artist}" via MPD`);
    
    try {
        // Verificar y encender el amplificador Denon antes de reproducir
        logger.info(`[playAlbum] Ensuring Denon amplifier is ready...`);
        const denonStatus = await denon.ensurePowerOnAndSource();
        logger.info(`[playAlbum] Denon status: ${JSON.stringify(denonStatus)}`);
        
        // Si el amplificador fue encendido, esperar para que esté listo
        if (!denonStatus.wasPoweredOn) {
            const warmupDelay = parseInt(process.env.DENON_WARMUP_DELAY || '5000');
            logger.info(`[playAlbum] Amplifier was powered on, waiting ${warmupDelay}ms for warmup...`);
            await new Promise(resolve => setTimeout(resolve, warmupDelay));
            logger.info(`[playAlbum] Warmup complete, proceeding with playback`);
        }
        
        await mpd.playLocalAlbum(album.artist, album.title);
        return res.json({ 
            action: 'play',
            album: {
                id: album._id,
                title: album.title,
                artist: album.artist,
                cover_url: album.cover_url
            },
            playback: 'mpd',
            status: 'success',
            denonStatus,
            message: `Playing ${album.title} via MPD` 
        });
    } catch (error) {
        logger.error(`[playAlbum] Error playing via MPD: ${error.message}`);
        return res.status(500).json({
            msg: 'Error playing via MPD',
            error: error.message
        });
    }
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
    getMediaUrl,
    getTrackById,
    getSpectrumpicTrackById,
    updateTrackById,
    playAlbum,
    downloadProgress,
    getAlbumStats
}