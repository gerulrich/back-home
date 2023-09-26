const axios = require('axios');
const jwt = require('jsonwebtoken');

const FLOW_EMAIL = process.env.FLOW_EMAIL;
const FLOW_PASSWORD = process.env.FLOW_PASSWORD;
const FLOW_CLIENT_ID = process.env.FLOW_CLIENT_ID;
let FLOW_ACCESS_TOKEN = '';

const getToken = async() => {
    console.info("Obteniendo token");
    try {
        if (expiredToken()) {
            FLOW_ACCESS_TOKEN = await renewToken();
        }
    } catch (error) {
        FLOW_ACCESS_TOKEN = '';
    }
    return FLOW_ACCESS_TOKEN;
}

const expiredToken = () => {
    console.info("verificando si el token esta expirado");
    try {
        const decodedToken = jwt.decode(FLOW_ACCESS_TOKEN);
        return (decodedToken.exp < Date.now() / 1000);
    } catch (error) {
        return true;
    }
}

const renewToken = async() => {
    console.info("Renovando token for epg");
    let config = {
        method: 'POST',
        maxBodyLength: Infinity,
        url: 'https://web.flow.com.ar/auth/v2/provision/login',
        headers: {
            'Content-Type': 'application/json',
            'Authority': 'web.flow.com.ar',
            'Origin': 'https://web.app.flow.com.ar',
            'Referer': 'https://web.app.flow.com.ar/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
            'x-request-id': `web-3.70.0-50453806-d5692f16`
        },
        data : {
            accountId: FLOW_EMAIL,
            password: FLOW_PASSWORD,
            deviceName: "MacIntel",
            deviceType: "WEB",
            devicePlatform: "WINDOWS",
            clientCasId: FLOW_CLIENT_ID,
            version: "3.79.1",
            type: "CVA",
            deviceModel: "PC",
            company: "flow"
        }
    };
    const {data} = await axios.request(config);
    if (data.jwt)
        console.log("Token renovado")
    return data.jwt;
}

const get_epg =  async(token, channel, epoch_from, epoch_to) => {
    console.info(`Getting epg for channel ${channel}`)
    const config = {
      method: 'POST',
      url: `https://web.flow.com.ar/api/v1/content/channel?size=1440&dateFrom=${epoch_from}000&dateTo=${epoch_to}999&tvRating=6&all=true`,
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Authority': 'web.flow.com.ar',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
      },
      data : [ channel ]
    };
    const { data } = await axios.request(config);
    return data;
}

module.exports = { 
    getToken,
    get_epg
}