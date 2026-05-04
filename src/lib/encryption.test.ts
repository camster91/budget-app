import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './encryption';

describe('encryption utility', () => {
    // Note: process.env.ENCRYPTION_KEY is set to a 64-char hex string in tests usually
    // For this test, we'll assume a dummy key if not set, but the logic should hold
    
    it('should encrypt and decrypt a string correctly', () => {
        const secret = "plaid-access-token-12345";
        const encrypted = encrypt(secret);
        
        expect(encrypted).not.toBe(secret);
        expect(encrypted).toContain(':'); // IV separator
        
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(secret);
    });

    it('should produce different ciphertexts for the same input (IV randomization)', () => {
        const secret = "same-input";
        const enc1 = encrypt(secret);
        const enc2 = encrypt(secret);
        
        expect(enc1).not.toBe(enc2);
        expect(decrypt(enc1)).toBe(secret);
        expect(decrypt(enc2)).toBe(secret);
    });
});
