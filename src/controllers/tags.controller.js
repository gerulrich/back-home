const MusicTag = require("../models/music-tag");
const sockets = require("../websocket/user-sockets");
const logger = require("../helpers/logger");
const heos = require("../helpers/heos-api");
const mpd = require("../helpers/mpd-api");
const denon = require("../helpers/denon-api");

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
    const tag = await MusicTag.findById(id).populate('album', 'artist title cover_url source source_id');
    if (!tag) {
        logger.warn(`[playMusicTag] MusicTag ${id} not found`);
        return res.status(404).json({msg: `MusicTag ${id} not found`});
    }
    logger.info(`[playMusicTag] Playing tag ${id} - Album: ${tag.album.title} by ${tag.album.artist}, Source: ${tag.source}, Album Source: ${tag.album.source}`);
    
    // Si el source del tag es HEOS y el álbum proviene de TIDAL
    if (tag.source === 'heos' && tag.album.source === 'TIDAL' && tag.album.source_id) {
        try {
            logger.info(`[playMusicTag] Playing TIDAL album ${tag.album.source_id} via HEOS`);
            await heos.playTidalAlbum(tag.album.source_id.toString());
            return res.json({ 
                action: 'play', 
                tag,
                playback: 'heos',
                status: 'success',
                message: `Playing ${tag.album.title} via HEOS` 
            });
        } catch (error) {
            logger.error(`[playMusicTag] Error playing via HEOS: ${error.message}`);
            return res.status(500).json({
                msg: 'Error playing via HEOS',
                error: error.message
            });
        }
    }
    
    // Si el source del tag es local, reproducir mediante MPD
    if (tag.source === 'local') {
        try {
            logger.info(`[playMusicTag] Playing local album "${tag.album.title}" by "${tag.album.artist}" via MPD`);
            
            // Verificar y encender el amplificador Denon antes de reproducir
            logger.info(`[playMusicTag] Ensuring Denon amplifier is ready...`);
            const denonStatus = await denon.ensurePowerOnAndSource();
            logger.info(`[playMusicTag] Denon status: ${JSON.stringify(denonStatus)}`);
            
            // Si el amplificador fue encendido, esperar para que esté listo
            if (!denonStatus.wasPoweredOn) {
                const warmupDelay = parseInt(process.env.DENON_WARMUP_DELAY || '5000');
                logger.info(`[playMusicTag] Amplifier was powered on, waiting ${warmupDelay}ms for warmup...`);
                await new Promise(resolve => setTimeout(resolve, warmupDelay));
                logger.info(`[playMusicTag] Warmup complete, proceeding with playback`);
            }
            
            await mpd.playLocalAlbum(tag.album.artist, tag.album.title);
            return res.json({ 
                action: 'play', 
                tag,
                playback: 'mpd',
                status: 'success',
                denonStatus,
                message: `Playing ${tag.album.title} via MPD` 
            });
        } catch (error) {
            logger.error(`[playMusicTag] Error playing via MPD: ${error.message}`);
            return res.status(500).json({
                msg: 'Error playing via MPD',
                error: error.message
            });
        }
    }
    
    // Otros casos no implementados
    logger.warn(`[playMusicTag] Unsupported playback configuration for tag ${id}`);
    res.status(400).json({ 
        msg: 'Unsupported playback configuration',
        tag 
    });
}

const queueMusicTag = async(req, res) => {
    const { id } = req.params;
    logger.info(`[queueMusicTag] Request to queue tag with id: ${id}`);
    const tag = await MusicTag.findById(id).populate('album', 'artist title cover_url source source_id');
    if (!tag) {
        logger.warn(`[queueMusicTag] MusicTag ${id} not found`);
        return res.status(404).json({msg: `MusicTag ${id} not found`});
    }
    logger.info(`[queueMusicTag] Queueing tag ${id} - Album: ${tag.album.title} by ${tag.album.artist}, Source: ${tag.source}, Album Source: ${tag.album.source}`);
    
    // Si el source del tag es HEOS y el álbum proviene de TIDAL
    if (tag.source === 'heos' && tag.album.source === 'TIDAL' && tag.album.source_id) {
        try {
            logger.info(`[queueMusicTag] Queueing TIDAL album ${tag.album.source_id} via HEOS`);
            await heos.queueTidalAlbum(tag.album.source_id.toString());
            
            // Verificar si el player está reproduciendo
            const playState = await heos.getPlayState();
            logger.info(`[queueMusicTag] HEOS play state: ${JSON.stringify(playState)}`);
            
            // Si no está reproduciendo, iniciar la reproducción
            if (playState.heos && playState.heos.message && !playState.heos.message.includes('state=play')) {
                logger.info(`[queueMusicTag] Player not playing, starting playback`);
                await heos.resumePlayer();
                return res.json({ 
                    action: 'queue', 
                    tag,
                    playback: 'heos',
                    status: 'success',
                    autoplay: true,
                    message: `Queued and started playing ${tag.album.title} via HEOS` 
                });
            }
            
            return res.json({ 
                action: 'queue', 
                tag,
                playback: 'heos',
                status: 'success',
                autoplay: false,
                message: `Queued ${tag.album.title} via HEOS` 
            });
        } catch (error) {
            logger.error(`[queueMusicTag] Error queueing via HEOS: ${error.message}`);
            return res.status(500).json({
                msg: 'Error queueing via HEOS',
                error: error.message
            });
        }
    }
    
    // Si el source del tag es local, agregar a la cola mediante MPD
    if (tag.source === 'local') {
        try {
            logger.info(`[queueMusicTag] Queueing local album "${tag.album.title}" by "${tag.album.artist}" via MPD`);
            
            // Verificar el estado del amplificador Denon
            const isPowerOn = await denon.isPowerOn();
            logger.info(`[queueMusicTag] Denon amplifier power status: ${isPowerOn ? 'ON' : 'OFF'}`);
            
            let denonStatus = null;
            
            // Si el amplificador está apagado, encenderlo y configurar la fuente
            // ya que si está apagado, se asume que se quiere comenzar a reproducir
            if (!isPowerOn) {
                logger.info(`[queueMusicTag] Amplifier is off, will power on and select source before queueing`);
                denonStatus = await denon.ensurePowerOnAndSource();
                logger.info(`[queueMusicTag] Denon ready: ${JSON.stringify(denonStatus)}`);;
                
                // Esperar para que el amplificador esté completamente listo
                const warmupDelay = parseInt(process.env.DENON_WARMUP_DELAY || '5000');
                logger.info(`[queueMusicTag] Waiting ${warmupDelay}ms for amplifier warmup...`);
                await new Promise(resolve => setTimeout(resolve, warmupDelay));
                logger.info(`[queueMusicTag] Warmup complete, proceeding with queueing`);
            } else {
                // Si ya está encendido, solo agregamos a la cola sin cambiar nada
                logger.info(`[queueMusicTag] Amplifier is already on, adding to queue without changes`);
                denonStatus = { wasPoweredOn: true, status: 'already_on' };
            }
            
            await mpd.queueLocalAlbum(tag.album.artist, tag.album.title);
            return res.json({ 
                action: 'queue', 
                tag,
                playback: 'mpd',
                status: 'success',
                denonStatus,
                message: `Queued ${tag.album.title} via MPD` 
            });
        } catch (error) {
            logger.error(`[queueMusicTag] Error queueing via MPD: ${error.message}`);
            return res.status(500).json({
                msg: 'Error queueing via MPD',
                error: error.message
            });
        }
    }
    
    // Otros casos no implementados
    logger.warn(`[queueMusicTag] Unsupported queue configuration for tag ${id}`);
    res.status(400).json({ 
        msg: 'Unsupported queue configuration',
        tag 
    });
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