const { spawn } = require('child_process');
const sockets = require("../websocket/user-sockets");
const tidal = require('../helpers/tidal-api');

const findAlbumsByText = async(req, res) => {
  const { limit = 25, offset = 0, q } = req.query;
  const { albums } = await tidal.searchAlbums(q, offset, limit);
  return res.status(200).json({
      albums: albums.items.map(item => {
        return {
          ...item,
          cover: item.cover ? `https://resources.tidal.com/images/${item.cover.replaceAll('-', '/')}/640x640.jpg` : ''
        }}),
      paging: {
        page: Math.ceil(offset / limit) + 1,
        total: Math.ceil(albums.totalNumberOfItems / limit),
      }
  });
}

const getAlbumsByArtist = async(req, res) => {
  const { limit = 25, offset = 0} = req.query;
  const { id } = req.params;
  const { items, totalNumberOfItems } = await tidal.albumsByArtist(id, offset, limit);
  return res.status(200).json({
      albums: items.map(item => {
        return {
          ...item,
          cover: item.cover ? `https://resources.tidal.com/images/${item.cover.replaceAll('-', '/')}/640x640.jpg` : ''
        }}),
      paging: {
        page: Math.ceil(offset / limit) + 1,
        total: Math.ceil(totalNumberOfItems / limit),
      }
    });
}

const getAlbumById = async(req, res) => {
  const { id } = req.params;
  const [tracks, album] = await Promise.all([tidal.albumTracks(id), tidal.albumInfo(id)]);
  const cover = album.cover ? `https://resources.tidal.com/images/${album.cover.replaceAll('-', '/')}/640x640.jpg` : '';
  return res.status(200).json({
    ...album,
    cover,
    tracks: tracks.items
  });
}

const launchDownloadAlbum = async(req, res) => {
  const token = await tidal.getToken();
  const proceso = spawn('node', ['/Users/germanulrich/git_personal/back-home/src/jobs/tidal-download.js', req.params.id, req.body.quality, token ])
  .on('error', function( err ){ console.log(error) });
  proceso.stdout.on('data', (data) => {
    const message = data.toString();
    sockets.emit(req.user, 'download-progress', { message });
  });

  proceso.on('close', (code) => {
    const message = `La descarga ha finalizado con el código ${code}`;
    sockets.emit(req.user, 'download-progress', { message });
  });

  return res.status(200).json({});
}

module.exports = {
    findAlbumsByText,
    getAlbumById,
    getAlbumsByArtist,
    launchDownloadAlbum
}