const Album = require("../models/album")

const getAlbums = async(req, res) => {
    const {limit = 5, offset = 0} = req.query;
    const [total, albums] = await Promise.all([
        Album.countDocuments(), 
        Album.find().limit(limit).skip(offset)
    ])
    res.json({ albums, total });
}

const createAlbum = async(req, res) => {
    const {artist, title, source, deezer_id, cover_url, format, tracks} = req.body;
    const album = new Album({artist, title, source, deezer_id, cover_url, format, tracks});
    album.save();
    res.json(album);
}

const deleteAlbum = async(req, res) => {
    const { id } = req.params;
    const album = await Album.deleteOne({_id: id});
    if (!album) {
        res.status(404).json({msg: "album not found"});
    }
    res.status(204);
    
}

module.exports = {
    getAlbums,
    createAlbum,
    deleteAlbum
}