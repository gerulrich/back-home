const flow = require('../helpers/flow-api');
const Channel = require('../models/channel');
const Recording = require('../models/recording');

const sleep = async (ms) => {
    console.debug(`Esperando ${ms / 1000}s estre descargas`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

const random = (min, max) => Math.floor(((max - min)*Math.random() + 3)*1000);

const get_epg = async (flowToken, channel, epoch_from, epoch_to) => {
    console.log(`Procesando channel ${channel.name}`);
    const response = await flow.get_epg(flowToken, channel.number, epoch_from, epoch_to);
    return response[0].map(p => {
        const urls = (p.resources.length > 0) ? p.resources.filter(item => item.protocol == 'DASH' && item.encryption == 'Widevine') : [];
        const media_url = (urls.length > 0) ? urls[0].url : '';
        const image = p.images.filter(item => item.usage == "BROWSE")
            .map(img => `https://static.flow.com.ar/images/${p.programId}/BROWSE/224/320/0/0/${img.suffix}.${img.format}`)[0];
        return {
            recording_id: p.id,
            title: p.title,
            description: p.description,
            start: new Date(p.startTime).toISOString(),
            end: new Date(p.endTime).toISOString(),
            media_url: media_url.replace("http://", "https://"),
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
            channel_name: channel.name,
            epg_name: channel.epg_name,
        }
    });
}

const save_epg = async (epg_data) => {
    for (const rec of epg_data) {
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

const get_token = async() => {
    let flowToken = '';
    let retries = 5;
    while (flowToken == '' && retries > 0) {
        flowToken = await flow.getToken();
        retries = retries -1;
        if (flowToken == '')
            await sleep((5 - retries) * random(5,10));
    };
    return flowToken;
}

const epg_job = async () => {
    var ts = Math.round((new Date()).getTime() / 1000);
    const epoch_from = ts - 24 * 60 * 60;
    const epoch_to = ts + 24 * 60 * 60;
    const channels = await Channel.find({});
    for (const channel of channels) {
        let flowToken = await get_token();
        if (flowToken != '' && channel.number) {
            try {
                const epg_data = await get_epg(flowToken, channel, epoch_from, epoch_to);
                await save_epg(epg_data);
                await sleep(random(5,10));
            } catch (error) {
                flow.cleanToken();
                console.error(`Error procesando canal ${channel.name}`);
                await sleep(random(20,60));
            }
        }
    };
}

module.exports = {
    epg_job
}