const Recording = require("../models/recording");

const getRecordings = async (req, res) => {
    const { limit = 25, offset = 0, q } = req.query;
    const query = q ? { $text: { $search: q } } : { };
    query.start = { $gt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) };
    if (req.header('X-DISABLED') != 'true') {
        query.enabled = true;
    }
    const [total, results] = await Promise.all([
        Recording.countDocuments(query),
        Recording.aggregate([
            { $match: query }, // Etapa de filtrado
            {
                $group: {
                    _id: { title: "$title", channel_name: "$channel_name" },
                    recordings: { $push: "$$ROOT" },
                }
            }
        ]).limit(limit).skip(offset).sort({start: 1})
    ]);

    const r = results.map(elem => {
        const {recordings} = elem
        const {_id, __v, ...other} = recordings[0]
        return {
            uid: _id,
            ...other,
            emissions: recordings
        };
    });
    

    res.json({
        recordings: r,
        paging: {
            page: Math.ceil(offset / limit) + 1,
            total: Math.ceil(total / limit),
        }
    });
}

module.exports = {
    getRecordings,
}