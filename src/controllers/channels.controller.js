const Channel = require("../models/channel");

const getChannels = async(req, res) => {
    const {limit = 25, offset = 0} = req.query;
    const x_disabled = req.header('X-DISABLED');
    const query = (x_disabled === 'true') ? {} : {enabled: true};
    const [total, channels] = await Promise.all([
        Channel.countDocuments(query), 
        Channel.find(query).limit(limit).skip(offset)
    ]);
    res.json({ channels, total });
}


const getChannelById = async(req, res) => {
    const { id } = req.params;
    const channel = await Channel.findById(id);
    if (!channel) {
        return res.status(404).json({msg: "channel not found"});
    }
    res.json(channel);
}

const createChannel = async(req, res) => {
    const {name, logo, media_url, drm} = req.body;
    const channel = new Channel({name, logo, media_url, drm});
    channel.save();
    res.json(channel);
}

const updateChannel = async(req, res) => {
    const { id } = req.params;
    const {_id, ...others} = req.body;
    const channel = await Channel.findByIdAndUpdate(id, others, {new : true});
    res.json(channel);
}

const deleteChannel = async(req, res) => {
    const { id } = req.params;
    const { deletedCount } = await Channel.deleteOne({id})
    if (deletedCount > 0) {
        return res.code(204).json({ });
    }
    res.code(404).json({ msg: "Channel not found" });
}

module.exports = {
    getChannelById,
    getChannels,
    createChannel,
    updateChannel,
    deleteChannel
}