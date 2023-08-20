const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function getFormattedDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
  
console.log = function(message) {
    const formattedDate = getFormattedDate();
    process.stdout.write(`[INFO] (${formattedDate}) - ${message}`);
};
  
console.debug = function(message) {
    const formattedDate = getFormattedDate();
    process.stdout.write(`[DEBUG] (${formattedDate}) - ${message}`);
};
  
console.error = function(message) {
    const formattedDate = getFormattedDate();
    process.stderr.write(`[ERROR] (${formattedDate}) - ${message}`);
};

const TIDAL_URL = 'https://api.tidalhifi.com';
const DOWNLOAD_FOLDER = process.env.MUSIC_FOLDER;

const id = process.argv[2];
const quality = process.argv[3];
const token = process.argv[4];


const sleep = async(ms) => {
    console.debug(`Esperando ${ms/1000}s estre descargas`);
    return new Promise(resolve => setTimeout(resolve, ms));
}
const random = (min, max) => Math.floor(((max - min)*Math.random() + 3)*1000);
const number = (num) => num.toString().padStart(2, '0');

const get = (url, token) => ({ 
    method: 'get',
    maxBodyLength: Infinity,
    url,
    headers: { 
        'Origin': 'http://listen.tidal.com',
        'Authorization': 'Bearer ' + token
    }
});

const getAlbumInfo = async (albumId, token) => {
    const { data } = await axios.request(get(`${TIDAL_URL}/v1/albums/${albumId}?countryCode=AR`, token));
    return data;
}

const getTracks = async (albumId, token) => {
    const { data } = await axios.request(get(`${TIDAL_URL}/v1/albums/${albumId}/tracks?countryCode=AR`, token));
    return data.items;
}

const getStreamUtl = async(trackId, quality, token) => {
    return await axios.request(get(`${TIDAL_URL}/v1/tracks/${trackId}/playbackinfopostpaywall?countryCode=AR&audioquality=${quality}&playbackmode=STREAM&assetpresentation=FULL`, token));
}

const sanitize = (value) => {
    const invalid = '<>:"/\|?*&'
    value = value.replace('/', '-');
    for (const char in invalid) {
        value = value.replaceAll(invalid[char], '')
    }
    return value.replace(/\s+/g, ' ').trim();
}

const getAlbumDir = (album, quality) => {
    let format_folder = 'format_flac';
    switch (quality) {
        case 'MQA':
            format_folder = 'format_flac_mqa';
            break;
        case 'HI_RES_LOSSLESS':
            format_folder = 'format_flac_hr';
            break;
        case 'HIGH':
            format_folder = 'format_aac_320kbps';
            break;
        case 'LOW':
            format_folder = 'format_aac_128kbps';
            break;
    }
    let directory = path.join(DOWNLOAD_FOLDER, format_folder, sanitize(album.artist.name) , sanitize(album.title));
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
        return directory;
    }
    let version = 1;
    let version_directory = `${directory}_v${version}`;
    while (fs.existsSync(version_directory)) {
        version++;
        version_directory = `${directory}_v${version}`;
    }
    fs.mkdirSync(version_directory, { recursive: true });
    return version_directory;
}


const getDirname = (baseDir, album, track) => {
    if (album.numberOfVolumes == 1)
        return baseDir;
    const dir = path.join(baseDir, 'CD' + track.volumeNumber)
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    return path.join(baseDir, 'CD' + track.volumeNumber);
}

const getFileName = (baseDir, album, track) => {
    return path.join(getDirname(baseDir, album, track), number(track.trackNumber) + ' ' + sanitize(track.title) + '.flac');
}

const download = (url, file) => {
    return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(file);
        console.log(`Iniciando descarga del archivo ${path.basename(file)}`);
        https.get(url, response => {
          response.pipe(stream);
          stream.on('finish', () => {
            stream.close();
            console.log(`Archivo ${path.basename(file)} descargado correctamente.`);
            resolve();
          });
        }).on('error', error => {
          fs.unlink(file, () => {});
          console.error(`Error al descargar el archivo: ${path.basename(file)}`, err.message);
          reject(error);
        });
    });
}

const updateMetadata = async(file, cover, metadata, releaseDate) => {
    return new Promise((resolve, reject) => {

        const output = path.join(path.dirname(file), '_' + path.basename(file));

        // Comando ffmpeg para actualizar los metadatos
        const ffmpegCommand = [
            '-i', file,
            '-i', cover,
            '-map', '0:a',
            '-map', '1',
            '-codec', 'copy',
            '-metadata:s:v', 'title="Album cover"',
            '-metadata:s:v', 'comment="Cover (front)"',
            '-disposition:v', 'attached_pic',
            '-metadata', `title=${metadata.title}`,
            '-metadata', `artist=${metadata.artist.name}`,
            '-metadata', `album=${metadata.album.title}`,
            '-metadata', `album_artist=${metadata.artist.name}`,
            '-metadata', `date=${releaseDate}`,
            '-metadata', `track=${metadata.trackNumber}`,
            '-metadata', `disc=${metadata.volumeNumber}`,
            '-metadata', `isrc=${metadata.isrc}`,
            '-metadata', `comment=ggu`,
            output
        ];

        // Ejecutar el comando ffmpeg mediante child_process.spawn
        const ffmpegProcess = spawn('ffmpeg', ffmpegCommand);

        // Escuchar eventos de salida estándar y error estándar
        ffmpegProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        ffmpegProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        // Manejar el evento de cierre del proceso
        ffmpegProcess.on('close', (code) => {
        if (code === 0) {
            console.log('Metadatos actualizados con éxito');
            fs.unlinkSync(file);
            fs.renameSync(output, file);
            resolve()
        } else {
            console.error(`Error al actualizar metadatos. Código de salida: ${code}`);
            reject("");
        }
    });
    });
  }

const main = async() => {
    const album = await getAlbumInfo(id, token);
    const tracks = await getTracks(id, token);
    console.log(`Descargando album ${album.title} de ${album.artist.name} con calidad ${quality}`);
    const albumDir = getAlbumDir(album, quality);
    const cover = path.join(albumDir, 'cover.jpg');
    const cover_url = `https://resources.tidal.com/images/${album.cover.replaceAll('-', '/')}/640x640.jpg`;
    await download(cover_url, cover);
    const album_data = {
        title: album.title,
        artist: album.artist.name,
        comments: '',
        origin_type: 'WEB_DOWNLOAD',
        upc: album.upc,
        source: 'TIDAL',
        source_id: id,
        cover_url,
        format: 'FLAC',
        year: album.releaseDate.substring(0, 4),
        tracks: []
    }
    for(idx in tracks) {
        await sleep(random(5, 10));
        const track = tracks[idx];
        const { data } = await getStreamUtl(track.id, quality, token);
        if (data.manifestMimeType !== 'application/vnd.tidal.bts') {
            console.error(`No se puede descargar el archivo ${track.title}, manifestMimeType = ${data.manifestMimeType}`);
            continue;
        }
        // TODO chequear encryptionType = NONE
        const manifest = JSON.parse(Buffer.from(data.manifest, 'base64').toString('utf-8'));
        const file = getFileName(albumDir, album, track);
        const media_url = file.substring(process.env.STATIC_PARENT_FOLDER.length, file.length);
        await download(manifest.urls[0], file);
        await updateMetadata(file, cover, track, album.releaseDate)
            .catch(error => console.error(error));
            album_data.tracks.push(
            {
                title: track.title,
                artist: track.artist.name,
                track_number: track.trackNumber,
                disc_number: track.volumeNumber,
                comments: '',
                isrc: track.isrc,
                duration: track.duration,
                media_url
            }
        );
    }
    // create album
    await axios.request({
        method: 'post',
        maxBodyLength: Infinity,
        url: `http://localhost:${process.env.NODE_PORT}/api/music/albums`,
        headers: { 
            'Content-Type': 'application/json', 
        },
        data : album_data
    }).then (resp => console.log(resp))
    .catch(error => console.log(error));
    console.log('Finalizado')
}
  
main();