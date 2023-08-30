const flow = require('../helpers/flow-api');
const Channel = require('../models/channel');
const Recording = require('../models/recording');

const sleep = async(ms) => {
    console.debug(`Esperando ${ms/1000}s estre descargas`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

const get_epg =  async(flowToken, channel, epoch_from, epoch_to) => {
    console.log(`Procesando channel ${channel.name}`);
    const response = await flow.get_epg(flowToken, channel.number, epoch_from, epoch_to);
    return response[0].map(p => {
        const media_url = (p.resources.length > 0) ? p.resources.filter(item => item.protocol == 'DASH' && item.encryption == 'Widevine')[0].url : '';
        const image = p.images.filter(item => item.usage == "BROWSE")
            .map(img => `https://static.flow.com.ar/images/${p.programId}/BROWSE/224/320/0/0/${img.suffix}.${img.format}`)[0];
        const ppp = {
            recording_id: p.id,
            title: p.title,
            description: p.description,
            start: new Date(p.startTime).toISOString(),
            end: new Date(p.endTime).toISOString(),
            media_url,
            drm: (!!media_url) ? channel.drm : {},
            enabled: channel.enabled,
            image,
            type: p.type,
            show_type: p.showType,
            duration: p.duration,
            episode_title: p.episodeTitle,
            genre: p.genre,
            ndvr_allowed: p.ndvrAllowed,
            ndvr_expire: p.ndvrExpire,
            season_number: p.seasonNumber,
            episode_number: p.episodeNumber,
            series_id: p.seriesId,
            season_id: p.seasonId,
            program_id: p.programId,
            channel: channel._id,
            epg_name: channel.epg_name,
        }
        return ppp;
        
    });
}

const save_epg =  async(epg_data) => {
    for (const rec of epg_data ) {
        const conditions = {
            recording_id: rec.recording_id,
            start: rec.start,
            end: rec.end,
            epg_name: rec.epg_name,
        };
        await Recording.findOneAndUpdate(conditions, rec, {
            new: true,
            upsert: true
        });
    }
}

const epg_job = async() => {
    const flowToken = await flow.getToken();
    var ts = Math.round((new Date()).getTime() / 1000);
    const epoch_from = ts - 24*60*60;
    const epoch_to = ts + 24*60*60;
    const channels = await Channel.find({});
    for(const channel of channels) {
        if (channel.number) {
            const epg_data = await get_epg(flowToken, channel, epoch_from, epoch_to);
            await save_epg(epg_data);
            sleep(1000);
        }
    };

}

module.exports = {
    epg_job
}