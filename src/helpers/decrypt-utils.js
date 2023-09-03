const crypto = require('crypto');
const base64 = require('base64-js');
const aesjs = require('aes-js');
const fs = require('fs');
const path = require('path')

const decryptSecurityToken = (securityToken) => {
    const masterKeyBuffer = Buffer.from(base64.toByteArray(process.env.TIDAL_MASTER_KEY));
    const securityTokenBuffer = Buffer.from(base64.toByteArray(securityToken));

    // Get the IV from the first 16 bytes of the securityToken
    const iv = securityTokenBuffer.subarray(0, 16);
    const encryptedSt = securityTokenBuffer.subarray(16);

    // Initialize decryptor
    const decryptor = crypto.createDecipheriv('aes-256-cbc', masterKeyBuffer, iv);

    // Decrypt the security token
    let decryptedSt = decryptor.update(encryptedSt);
    decryptedSt = Buffer.concat([decryptedSt, decryptor.final()]);

    // Get the audio stream decryption key and nonce from the decrypted security token
    const key = decryptedSt.subarray(0, 16);
    const nonce = decryptedSt.subarray(16, 24);

    return { key, nonce };
}

const decryptFile = (efile, dfile, key, nonce) => {
    // Ensure the nonce has exactly 8 bytes
    if (nonce.length !== 8) {
        throw new Error('Nonce must be 8 bytes long.');
    }

    console.log(`Desencriptando archivo: "${path.basename(efile)}"`);

    // Extend the nonce to 16 bytes by adding 8 bytes of null (0x00)
    const extendedNonce = Buffer.concat([nonce, Buffer.from([0, 0, 0, 0, 0, 0, 0, 0])]);

    // Create a stream to read the encrypted file
    const encryptedData = fs.readFileSync(efile);

    // Create the AES-CTR decryptor
    const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(extendedNonce));

    // Decrypt the data
    const decryptedBytes = aesCtr.decrypt(encryptedData);

    // Write the decrypted data to the output file
    fs.writeFileSync(dfile, Buffer.from(decryptedBytes));
}
module.exports = { 
    decryptFile, decryptSecurityToken
}