import fs from 'fs';
import crypto from 'crypto';

function loadPrivateKey() {
    const keyFromEnv = process.env.RSA_PRIVATE_KEY;
    if (keyFromEnv) {
        return keyFromEnv.replace(/\\n/g, '\n');
    }
    const keyPath = process.env.RSA_PRIVATE_KEY_PATH;
    if (!keyPath) {
        throw new Error('RSA_PRIVATE_KEY or RSA_PRIVATE_KEY_PATH must be set');
    }
    if (!fs.existsSync(keyPath)) {
        throw new Error(`Private key not found at: ${keyPath}`);
    }
    return fs.readFileSync(keyPath, 'utf8');
}

export function decryptBase64RSA(cipherB64) {
    if (!cipherB64) return null;
    const privateKey = loadPrivateKey();
    const decrypted = crypto.privateDecrypt(
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        },
        Buffer.from(cipherB64, 'base64')
    );
    return decrypted.toString('utf8');
}

export function getSecretEnv(varName) {
    const enc = process.env[`${varName}_ENC`];
    if (enc) return decryptBase64RSA(enc);
    return process.env[varName] || null;
}


