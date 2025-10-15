// Usage: node scripts/encrypt-env.js "plaintext-secret"
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pubKeyPath = process.env.RSA_PUBLIC_KEY_PATH;
const plaintext = process.argv[2];

if (!plaintext) {
    console.error('Provide a plaintext to encrypt: node scripts/encrypt-env.js "my-secret"');
    process.exit(1);
}

if (!pubKeyPath) {
    console.error('❌ RSA_PUBLIC_KEY_PATH environment variable must be set');
    console.error('Example: set RSA_PUBLIC_KEY_PATH=C:\\path\\to\\rsa_public.pem');
    process.exit(1);
}

if (!fs.existsSync(pubKeyPath)) {
    console.error(`❌ Public key not found at: ${pubKeyPath}`);
    console.error('Set RSA_PUBLIC_KEY_PATH environment variable to point to your public key file');
    process.exit(1);
}

const publicKey = fs.readFileSync(pubKeyPath, 'utf8');
const encrypted = crypto.publicEncrypt(
    {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
    },
    Buffer.from(plaintext, 'utf8')
);

console.log(encrypted.toString('base64'));


