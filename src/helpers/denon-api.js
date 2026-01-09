const axios = require('axios');
const https = require('https');
const logger = require('./logger');

const DENON_HOST = process.env.DENON_HOST || '10.10.10.233';
const DENON_SOURCE = process.env.DENON_SOURCE || 'NET';

// Crear un agente HTTPS que ignore certificados auto-firmados
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

/**
 * Envía un comando HTTP al amplificador Denon
 * @param {string} command - Comando a enviar (ej: 'PW?', 'PWON', 'SINET')
 * @returns {Promise<string>} Respuesta del amplificador
 */
const sendDenonCommand = async (command) => {
    try {
        const url = `http://${DENON_HOST}:8080/goform/formiPhoneAppDirect.xml?${command}`;
        logger.info(`[DENON] Sending command: ${command} to ${url}`);
        
        const response = await axios.get(url, {
            timeout: 5000,
            httpsAgent: httpsAgent,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        logger.info(`[DENON] Response status: ${response.status}`);
        return response.data;
    } catch (error) {
        logger.error(`[DENON] Error sending command ${command}: ${error.message}`);
        throw error;
    }
};

/**
 * Verifica el estado de encendido del amplificador Denon
 * @returns {Promise<boolean>} true si está encendido, false si está apagado
 */
const isPowerOn = async () => {
    try {
        // Usar el endpoint de estado en lugar de comandos
        const url = `http://${DENON_HOST}:8080/goform/formiPhoneAppDirect.xml?PW?`;
        logger.info(`[DENON] Checking power status from: ${url}`);
        
        const response = await axios.get(url, {
            timeout: 5000,
            httpsAgent: httpsAgent,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        logger.info(`[DENON] Raw power status response: ${response.data.substring(0, 500)}`);
        
        // La respuesta es XML, buscar el tag <Power>
        // <Power><value>ON</value></Power> o <Power><value>STANDBY</value></Power>
        const isOn = response.data.includes('<value>ON</value>');
        logger.info(`[DENON] Power status: ${isOn ? 'ON' : 'STANDBY'}`);
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
        
        if (!powerStatus) {
            logger.info(`[DENON] Amplifier is off, turning it on...`);
            await powerOn();
            wasPoweredOn = false;
        } else {
            logger.info(`[DENON] Amplifier is already on`);
        }
        
        // Seleccionar la fuente siempre (para asegurarnos de que está en la correcta)
        await selectSource(source);
        
        return {
            wasPoweredOn,
            currentSource: source,
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
    selectSource,
    ensurePowerOnAndSource,
    setVolume
};
