const { spawn } = require('child_process');
const path = require('path');
const Recording = require("../models/recording");

const getRecordings = async(req, res) => {
    const { limit = 25, offset = 0, q } = req.query;
    const query = q ? {$text: {$search: q}} : {};
    if (req.header('X-DISABLED') != 'true') {
        query.enabled = true;
    }
    const [total, recordings] = await Promise.all([
        Recording.countDocuments(query), 
        Recording.find(query).populate('channel').limit(limit).skip(offset)
    ]);
    res.json({
        recordings,
        paging: {
            page: Math.ceil(offset / limit) + 1,
            total: Math.ceil(total / limit),
        }
    });
}

module.exports = {
    getRecordings,
}