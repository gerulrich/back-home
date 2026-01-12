const axios = require('axios');
const https = require('https');
const net = require('net');
const logger = require('./logger');

const DENON_HOST = process.env.DENON_HOST || '10.10.10.233';
const DENON_TELNET_PORT = process.env.DENON_TELNET_PORT || 23;
const DENON_SOURCE = process.env.DENON_SOURCE || 'NET';

/**
 * Envía un comando al amplificador Denon mediante telnet (puerto 23)
 * @param {string} command - Comando a enviar (ej: 'PW?', 'PWON', 'SINET')
 * @returns {Promise<string>} Respuesta del amplificador
 */
const sendDenonCommand = async (command) => {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        const timeout = setTimeout(() => {
            client.destroy();
            reject(new Error('Denon command timeout'));
        }, 5000);

        let responseData = '';

        client.connect(DENON_TELNET_PORT, DENON_HOST, () => {
            logger.info(`[DENON] Connected to ${DENON_HOST}:${DENON_TELNET_PORT}`);
            // Los comandos Denon terminan con \r
            const denonCommand = `${command}\r`;
            logger.info(`[DENON] Sending command: ${command}`);
            client.write(denonCommand);
        });

        client.on('data', (data) => {
            responseData += data.toString();
            // Las respuestas Denon terminan con \r
            if (responseData.includes('\r')) {
                clearTimeout(timeout);
                client.destroy();
                const response = responseData.trim();
                logger.info(`[DENON] Response: ${response}`);
                resolve(response);
            }
        });

        client.on('error', (error) => {
            clearTimeout(timeout);
            logger.error(`[DENON] Socket error: ${error.message}`);
            reject(new Error(`Denon command failed: ${error.message}`));
        });

        client.on('close', () => {
            clearTimeout(timeout);
            logger.info(`[DENON] Connection closed`);
        });
    });
};

/**
 * Verifica el estado de encendido del amplificador Denon
 * @returns {Promise<boolean>} true si está encendido, false si está apagado
 */
const isPowerOn = async () => {
    try {
        logger.info(`[DENON] Checking power status via telnet`);
        const response = await sendDenonCommand('PW?');
        
        // La respuesta será 'PWON' o 'PWSTANDBY'
        const isOn = response === 'PWON';
        logger.info(`[DENON] Power status: ${isOn ? 'ON' : 'STANDBY'} (response: ${response})`);
        return isOn;
    } catch (error) {
        logger.error(`[DENON] Error checking power status: ${error.message}`);
        throw error;
    }
};

/**
 * Enciende el amplificador Denon
 * @returns {Promise<void>}
 */
const powerOn = async () => {
    try {
        logger.info(`[DENON] Powering on amplifier`);
        await sendDenonCommand('PWON');
        // Esperar un momento para que el amplificador encienda completamente
        await new Promise(resolve => setTimeout(resolve, 2000));
        logger.info(`[DENON] Amplifier powered on`);
    } catch (error) {
        logger.error(`[DENON] Error powering on: ${error.message}`);
        throw error;
    }
};

/**
 * Obtiene la fuente de entrada actual del amplificador Denon
 * @returns {Promise<string>} Fuente actual (ej: 'SIBD', 'SINET', etc.)
 */
const getCurrentSource = async () => {
    try {
        logger.info(`[DENON] Checking current source via telnet`);
        const response = await sendDenonCommand('SI?');
        
        // La respuesta será algo como 'SIBD', 'SINET', 'SITV', etc.
        // Extraer solo la parte después de 'SI'
        const source = response.startsWith('SI') ? response.substring(2) : response;
        logger.info(`[DENON] Current source: ${source} (response: ${response})`);
        return source;
    } catch (error) {
        logger.error(`[DENON] Error checking current source: ${error.message}`);
        throw error;
    }
};

/**
 * Selecciona la fuente de entrada en el amplificador Denon
 * @param {string} source - Fuente a seleccionar (ej: 'NET', 'TUNER', 'DVD', 'BD', 'TV', 'SAT/CBL', 'GAME', 'AUX1')
 * @returns {Promise<void>}
 */
const selectSource = async (source = DENON_SOURCE) => {
    try {
        logger.info(`[DENON] Selecting source: ${source}`);
        await sendDenonCommand(`SI${source}`);
        // Esperar un momento para que la fuente cambie
        await new Promise(resolve => setTimeout(resolve, 1000));
        logger.info(`[DENON] Source selected: ${source}`);
    } catch (error) {
        logger.error(`[DENON] Error selecting source ${source}: ${error.message}`);
        throw error;
    }
};

/**
 * Verifica el estado del amplificador, lo enciende si está apagado y selecciona la fuente
 * @param {string} source - Fuente a seleccionar (opcional, usa DENON_SOURCE del .env si no se proporciona)
 * @returns {Promise<Object>} Estado del amplificador después de la operación
 */
const ensurePowerOnAndSource = async (source = DENON_SOURCE) => {
    try {
        logger.info(`[DENON] Ensuring amplifier is on and source is ${source}`);
        
        const powerStatus = await isPowerOn();
        let wasPoweredOn = powerStatus;
        let sourceChanged = false;
        
        if (!powerStatus) {
            logger.info(`[DENON] Amplifier is off, turning it on...`);
            await powerOn();
            wasPoweredOn = false;
            // Si acabamos de encender, debemos seleccionar la fuente
            await selectSource(source);
            sourceChanged = true;
        } else {
            logger.info(`[DENON] Amplifier is already on`);
            
            // Verificar la fuente actual antes de cambiarla
            const currentSource = await getCurrentSource();
            if (currentSource !== source) {
                logger.info(`[DENON] Current source is ${currentSource}, changing to ${source}`);
                await selectSource(source);
                sourceChanged = true;
            } else {
                logger.info(`[DENON] Source is already ${source}, no change needed`);
            }
        }
        
        return {
            wasPoweredOn,
            currentSource: source,
            sourceChanged,
            status: 'ready'
        };
    } catch (error) {
        logger.error(`[DENON] Error ensuring power and source: ${error.message}`);
        throw error;
    }
};

/**
 * Apaga el amplificador Denon
 * @returns {Promise<void>}
 */
const powerOff = async () => {
    try {
        logger.info(`[DENON] Powering off amplifier`);
        await sendDenonCommand('PWSTANDBY');
        logger.info(`[DENON] Amplifier powered off`);
    } catch (error) {
        logger.error(`[DENON] Error powering off: ${error.message}`);
        throw error;
    }
};

/**
 * Ajusta el volumen del amplificador Denon
 * @param {number} level - Nivel de volumen (0-98)
 * @returns {Promise<void>}
 */
const setVolume = async (level) => {
    try {
        // El volumen en Denon se representa con 2 dígitos (00-98)
        const volumeStr = level.toString().padStart(2, '0');
        logger.info(`[DENON] Setting volume to ${level}`);
        await sendDenonCommand(`MV${volumeStr}`);
        logger.info(`[DENON] Volume set to ${level}`);
    } catch (error) {
        logger.error(`[DENON] Error setting volume: ${error.message}`);
        throw error;
    }
};

module.exports = {
    sendDenonCommand,
    isPowerOn,
    powerOn,
    powerOff,
    getCurrentSource,
    selectSource,
    ensurePowerOnAndSource,
    setVolume
};
