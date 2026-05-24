import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16; // For AES, this is always 16

function getKeyBuffer(): Buffer {
    if (!ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY is not set');
    }
    if (ENCRYPTION_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY)) {
        return Buffer.from(ENCRYPTION_KEY, 'hex');
    }
    if (ENCRYPTION_KEY.length === 32) {
        return Buffer.from(ENCRYPTION_KEY, 'utf-8');
    }
    if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string or a 32-character raw string');
    }
    return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

export function encrypt(text: string): string {
    if (!ENCRYPTION_KEY) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('ENCRYPTION_KEY is not set');
        }
        return text; // Fallback for dev if not set
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
    if (!ENCRYPTION_KEY) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('ENCRYPTION_KEY is not set');
        }
        return text;
    }

    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKeyBuffer(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
