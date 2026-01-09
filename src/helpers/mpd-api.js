const net = require('net');
const logger = require('./logger');

const MPD_HOST = process.env.MPD_HOST || 'localhost';
const MPD_PORT = process.env.MPD_PORT || 6600;

/**
 * Envía un comando (o lista de comandos) al Music Player Daemon
 * @param {string|string[]} commands - Comando o lista de comandos MPD a enviar
 * @returns {Promise<string>} Respuesta del comando
 */
const sendMpdCommand = async (commands) => {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        const timeout = setTimeout(() => {
            client.destroy();
            reject(new Error('MPD command timeout'));
        }, 5000);

        let responseData = '';
        let receivedWelcome = false;

        client.connect(MPD_PORT, MPD_HOST, () => {
            logger.info(`[MPD] Connected to ${MPD_HOST}:${MPD_PORT}`);
        });

        client.on('data', (data) => {
            responseData += data.toString();
            
            // Esperamos el mensaje de bienvenida de MPD
            if (!receivedWelcome && responseData.includes('OK MPD')) {
                receivedWelcome = true;
                responseData = '';
                
                // Enviamos los comandos
                const commandStr = Array.isArray(commands) ? commands.join('\n') : commands;
                logger.info(`[MPD] Sending command(s): ${commandStr}`);
                client.write(commandStr + '\n');
                return;
            }
            
            // Esperamos la respuesta completa (termina con OK o ACK)
            // Para command_list: cada comando responde con "list_OK" y al final viene "OK"
            if (receivedWelcome) {
                logger.info(`[MPD] Received data: ${JSON.stringify(responseData)}`);
                
                const hasError = responseData.includes('ACK ');
                const hasOK = responseData.match(/^OK$/m) || responseData.match(/\nOK$/);
                
                if (hasError || hasOK) {
                    clearTimeout(timeout);
                    client.destroy();
                    
                    if (hasError) {
                        const errorMatch = responseData.match(/ACK \[(.*?)\] \{(.*?)\} (.*)/);
                        const errorMsg = errorMatch ? errorMatch[3] : 'Unknown MPD error';
                        logger.error(`[MPD] Error response: ${errorMsg}`);
                        reject(new Error(`MPD error: ${errorMsg}`));
                    } else {
                        logger.info(`[MPD] Success response received`);
                        resolve(responseData.trim());
                    }
                }
            }
        });

        client.on('error', (error) => {
            clearTimeout(timeout);
            logger.error(`[MPD] Socket error: ${error.message}`);
            reject(new Error(`MPD command failed: ${error.message}`));
        });

        client.on('close', () => {
            clearTimeout(timeout);
            logger.info(`[MPD] Connection closed`);
        });
    });
};

/**
 * Escapa caracteres especiales para MPD (comillas dobles y barras invertidas)
 * @param {string} str - Cadena a escapar
 * @returns {string} Cadena escapada
 */
const escapeMpdString = (str) => {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
};

/**
 * Reproduce un álbum local en MPD
 * @param {string} artist - Nombre del artista
 * @param {string} album - Nombre del álbum
 * @returns {Promise<string>} Respuesta del comando
 */
const playLocalAlbum = async (artist, album) => {
    try {
        const escapedArtist = escapeMpdString(artist);
        const escapedAlbum = escapeMpdString(album);
        
        const commands = [
            'command_list_begin',
            'clear',
            `findadd artist "${escapedArtist}" album "${escapedAlbum}"`,
            'play 0',
            'command_list_end'
        ];
        
        const result = await sendMpdCommand(commands);
        logger.info(`[MPD] Successfully started playing album "${album}" by "${artist}"`);
        return result;
    } catch (error) {
        logger.error(`[MPD] Error playing album "${album}" by "${artist}": ${error.message}`);
        throw error;
    }
};

/**
 * Agrega un álbum local a la cola de MPD sin limpiarla
 * Si no está reproduciendo, comienza la reproducción
 * @param {string} artist - Nombre del artista
 * @param {string} album - Nombre del álbum
 * @returns {Promise<string>} Respuesta del comando
 */
const queueLocalAlbum = async (artist, album) => {
    try {
        // Agregar el álbum a la cola
        const escapedArtist = escapeMpdString(artist);
        const escapedAlbum = escapeMpdString(album);
        const addCommand = `findadd artist "${escapedArtist}" album "${escapedAlbum}"`;
        await sendMpdCommand(addCommand);
        
        // Verificar el estado actual
        const status = await getStatus();
        logger.info(`[MPD] Current state: ${status.state}`);
        
        // Si no está reproduciendo, iniciar la reproducción
        if (status.state !== 'play') {
            logger.info(`[MPD] Starting playback from beginning`);
            await sendMpdCommand('play 0');
        }
        
        logger.info(`[MPD] Successfully queued album "${album}" by "${artist}"`);
        return status;
    } catch (error) {
        logger.error(`[MPD] Error queueing album "${album}" by "${artist}": ${error.message}`);
        throw error;
    }
};

/**
 * Obtiene el estado actual de MPD
 * @returns {Promise<Object>} Estado del reproductor
 */
const getStatus = async () => {
    try {
        const result = await sendMpdCommand('status');
        logger.info(`[MPD] Retrieved status`);
        
        // Parsear la respuesta en un objeto
        const status = {};
        result.split('\n').forEach(line => {
            const match = line.match(/^(\w+): (.+)$/);
            if (match) {
                status[match[1]] = match[2];
            }
        });
        
        return status;
    } catch (error) {
        logger.error(`[MPD] Error getting status: ${error.message}`);
        throw error;
    }
};

/**
 * Pausa la reproducción en MPD
 * @returns {Promise<string>} Respuesta del comando
 */
const pause = async () => {
    try {
        const result = await sendMpdCommand('pause 1');
        logger.info(`[MPD] Paused`);
        return result;
    } catch (error) {
        logger.error(`[MPD] Error pausing: ${error.message}`);
        throw error;
    }
};

/**
 * Reanuda la reproducción en MPD
 * @returns {Promise<string>} Respuesta del comando
 */
const resume = async () => {
    try {
        const result = await sendMpdCommand('pause 0');
        logger.info(`[MPD] Resumed`);
        return result;
    } catch (error) {
        logger.error(`[MPD] Error resuming: ${error.message}`);
        throw error;
    }
};

/**
 * Detiene la reproducción en MPD
 * @returns {Promise<string>} Respuesta del comando
 */
const stop = async () => {
    try {
        const result = await sendMpdCommand('stop');
        logger.info(`[MPD] Stopped`);
        return result;
    } catch (error) {
        logger.error(`[MPD] Error stopping: ${error.message}`);
        throw error;
    }
};

/**
 * Limpia la cola de reproducción
 * @returns {Promise<string>} Respuesta del comando
 */
const clear = async () => {
    try {
        const result = await sendMpdCommand('clear');
        logger.info(`[MPD] Queue cleared`);
        return result;
    } catch (error) {
        logger.error(`[MPD] Error clearing queue: ${error.message}`);
        throw error;
    }
};

module.exports = {
    sendMpdCommand,
    playLocalAlbum,
    queueLocalAlbum,
    getStatus,
    pause,
    resume,
    stop,
    clear
};
