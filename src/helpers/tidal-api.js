const axios = require('axios');
const jwt = require('jsonwebtoken');

const TIDAL_REFRESH_TOKEN = process.env.TIDAL_REFRESH_TOKEN;
const TIDAL_CLIENT_ID = process.env.TIDAL_CLIENT_ID;
let TIDAL_ACCESS_TOKEN = '';

const getToken = async() => {
  if (expiredToken()) {
    TIDAL_ACCESS_TOKEN = await renewToken();
  }
  return TIDAL_ACCESS_TOKEN;
}

const expiredToken = () => {
  try {
      const decodedToken = jwt.decode(TIDAL_ACCESS_TOKEN);
      return (decodedToken.exp < Date.now() / 1000);
  } catch (error) {
      return true;
  }
}

const renewToken = async() => {
  const data = new URLSearchParams();
  data.append('grant_type', 'refresh_token');
  data.append('refresh_token', TIDAL_REFRESH_TOKEN);
  data.append('client_id', TIDAL_CLIENT_ID);
  data.append('scope', 'r_usr+w_usr');

  const config = {
    maxRedirects: 0,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  try {
    const response = await axios.post('https://auth.tidal.com/v1/oauth2/token', data, config);
    return response.data.access_token;
  } catch (error) {
    console.error('Error renewing token:', error.message);
    throw error;
  }
}

const makeAuthenticatedRequest = async(url) => {
  const accessToken = await renewToken();

  const config = {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Origin': 'http://listen.tidal.com',
    },
  };

  try {
    const response = await axios.get(url, config);
    return response.data;
  } catch (error) {
    console.error('Error making authenticated request:', error.message);
    throw error;
  }
}


const searchAlbums = async(q, offset, limit) => {
    return await makeAuthenticatedRequest(`https://api.tidalhifi.com/v1/search?query=${q}&countryCode=AR&types=ALBUMS&offset=${offset}&limit=${limit}`);
}

const albumsByArtist = async(artist, offset, limit) => {
    return await makeAuthenticatedRequest(`https://api.tidal.com/v1/artists/${artist}/albums?countryCode=AR&limit=${limit}&offset=${offset}`);
}

const albumTracks = async(album) => {
    return await makeAuthenticatedRequest(`https://api.tidalhifi.com/v1/albums/${album}/tracks?countryCode=AR`);
}

const albumInfo = async(album) => {
    return await makeAuthenticatedRequest(`https://api.tidalhifi.com/v1/albums/${album}?countryCode=AR`);
}


module.exports = { getToken, searchAlbums, albumsByArtist, albumInfo,  albumTracks }