const net = require('net');
const logger = require('./logger');

const HEOS_HOST = process.env.HEOS_HOST || '192.168.1.100';
const HEOS_PORT = process.env.HEOS_PORT || 1255;
const HEOS_PLAYER_ID = process.env.HEOS_PLAYER_ID;

/**
 * Envía un comando al amplificador Denon mediante el protocolo HEOS (Telnet)
 * @param {string} command - Comando HEOS a enviar
 * @returns {Promise<Object>} Respuesta del comando
 */
const sendHeosCommand = async (command) => {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        const timeout = setTimeout(() => {
            client.destroy();
            reject(new Error('HEOS command timeout'));
        }, 5000);

        let responseData = '';

        client.connect(HEOS_PORT, HEOS_HOST, () => {
            logger.info(`[HEOS] Connected to ${HEOS_HOST}:${HEOS_PORT}`);
            const heosCommand = `heos://${command}\n`;
            logger.info(`[HEOS] Sending command: ${heosCommand.trim()}`);
            client.write(heosCommand);
        });

        client.on('data', (data) => {
            responseData += data.toString();
            // Las respuestas HEOS terminan con \r\n
            if (responseData.includes('\r\n')) {
                clearTimeout(timeout);
                client.destroy();
                try {
                    // HEOS devuelve JSON
                    const jsonMatch = responseData.match(/\{.*\}/);
                    if (jsonMatch) {
                        const response = JSON.parse(jsonMatch[0]);
                        logger.info(`[HEOS] Response: ${JSON.stringify(response)}`);
                        resolve(response);
                    } else {
                        resolve({ raw: responseData.trim() });
                    }
                } catch (error) {
                    logger.warn(`[HEOS] Could not parse response as JSON: ${responseData}`);
                    resolve({ raw: responseData.trim() });
                }
            }
        });

        client.on('error', (error) => {
            clearTimeout(timeout);
            logger.error(`[HEOS] Socket error: ${error.message}`);
            reject(new Error(`HEOS command failed: ${error.message}`));
        });

        client.on('close', () => {
            clearTimeout(timeout);
            logger.info(`[HEOS] Connection closed`);
        });
    });
};

/**
 * Reproduce un álbum de TIDAL en el amplificador Denon
 * @param {string} tidalAlbumId - ID del álbum en TIDAL
 * @param {string} playerId - ID del player HEOS (opcional, usa el de .env si no se proporciona)
 * @returns {Promise<Object>} Respuesta del comando
 */
const playTidalAlbum = async (tidalAlbumId, playerId = HEOS_PLAYER_ID) => {
    if (!playerId) {
        throw new Error('HEOS_PLAYER_ID not configured');
    }

    try {
        // Agregamos el álbum de TIDAL y lo reproducimos inmediatamente
        // sid=13 es el service ID de TIDAL
        // aid=3 significa "Play Now and Replace Queue"
        // heos://browse/add_to_queue?pid=1015683120&sid=10&cid=LIBALBUM-5095391&aid=4


        const addToQueueCommand = `browse/add_to_queue?pid=${playerId}&sid=10&cid=LIBALBUM-${tidalAlbumId}&aid=4`;
        const result = await sendHeosCommand(addToQueueCommand);
        
        logger.info(`[HEOS] Successfully started playing TIDAL album ${tidalAlbumId}`);
        return result;
    } catch (error) {
        logger.error(`[HEOS] Error playing TIDAL album ${tidalAlbumId}: ${error.message}`);
        throw error;
    }
};

/**
 * Agrega un álbum de TIDAL a la cola sin reproducir inmediatamente
 * @param {string} tidalAlbumId - ID del álbum en TIDAL
 * @param {string} playerId - ID del player HEOS (opcional, usa el de .env si no se proporciona)
 * @returns {Promise<Object>} Respuesta del comando
 */
const queueTidalAlbum = async (tidalAlbumId, playerId = HEOS_PLAYER_ID) => {
    if (!playerId) {
        throw new Error('HEOS_PLAYER_ID not configured');
    }

    try {
        // Agregamos el álbum de TIDAL a la cola sin limpiarla
        const addToQueueCommand = `browse/add_to_queue?pid=${playerId}&sid=13&cid=album:${tidalAlbumId}&aid=4`;
        const result = await sendHeosCommand(addToQueueCommand);
        
        logger.info(`[HEOS] Successfully queued TIDAL album ${tidalAlbumId}`);
        return result;
    } catch (error) {
        logger.error(`[HEOS] Error queueing TIDAL album ${tidalAlbumId}: ${error.message}`);
        throw error;
    }
};

/**
 * Obtiene la lista de players HEOS disponibles
 * @returns {Promise<Object>} Lista de players
 */
const getPlayers = async () => {
    try {
        const result = await sendHeosCommand('player/get_players');
        logger.info(`[HEOS] Retrieved players list`);
        return result;
    } catch (error) {
        logger.error(`[HEOS] Error getting players: ${error.message}`);
        throw error;
    }
};

/**
 * Pausa la reproducción en el player especificado
 * @param {string} playerId - ID del player HEOS
 * @returns {Promise<Object>} Respuesta del comando
 */
const pausePlayer = async (playerId = HEOS_PLAYER_ID) => {
    if (!playerId) {
        throw new Error('HEOS_PLAYER_ID not configured');
    }

    try {
        const result = await sendHeosCommand(`player/set_play_state?pid=${playerId}&state=pause`);
        logger.info(`[HEOS] Player ${playerId} paused`);
        return result;
    } catch (error) {
        logger.error(`[HEOS] Error pausing player: ${error.message}`);
        throw error;
    }
};

/**
 * Reanuda la reproducción en el player especificado
 * @param {string} playerId - ID del player HEOS
 * @returns {Promise<Object>} Respuesta del comando
 */
const resumePlayer = async (playerId = HEOS_PLAYER_ID) => {
    if (!playerId) {
        throw new Error('HEOS_PLAYER_ID not configured');
    }

    try {
        const result = await sendHeosCommand(`player/set_play_state?pid=${playerId}&state=play`);
        logger.info(`[HEOS] Player ${playerId} resumed`);
        return result;
    } catch (error) {
        logger.error(`[HEOS] Error resuming player: ${error.message}`);
        throw error;
    }
};

module.exports = {
    sendHeosCommand,
    playTidalAlbum,
    queueTidalAlbum,
    getPlayers,
    pausePlayer,
    resumePlayer
};
