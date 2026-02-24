
import { randomBytes, createCipheriv, createDecipheriv, scryptSync, createHash } from 'crypto';

// Configuration constants
const ENCRYPTION_SECRET = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!'; 
const SALT_STRING = 'manufacturer-app-salt';
const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

// Derive encryption key
const getEncryptionKey = () => scryptSync(ENCRYPTION_SECRET, SALT_STRING, KEY_LENGTH);

/**
 * Encrypts a string using AES-256-GCM
 */
export function encrypt(plaintext: string): string {
  try {
    const initVector = randomBytes(IV_LENGTH);
    const encryptionKey = getEncryptionKey();
    const cipher = createCipheriv(AES_ALGORITHM, encryptionKey, initVector);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    const authenticationTag = cipher.getAuthTag();
    
    // Format: iv:authTag:ciphertext
    return [
      initVector.toString('hex'),
      authenticationTag.toString('hex'),
      ciphertext
    ].join(':');
  } catch (error) {
    console.error('Encryption failed:', error);
    return plaintext;
  }
}

/**
 * Decrypts a string encrypted with AES-256-GCM
 */
export function decrypt(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      return encryptedData;
    }
    
    const [ivHex, authTagHex, ciphertextHex] = parts;
    const initVector = Buffer.from(ivHex, 'hex');
    const authenticationTag = Buffer.from(authTagHex, 'hex');
    const encryptionKey = getEncryptionKey();
    
    const decipher = createDecipheriv(AES_ALGORITHM, encryptionKey, initVector);
    decipher.setAuthTag(authenticationTag);
    
    let plaintext = decipher.update(ciphertextHex, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedData;
  }
}

/**
 * Creates a SHA-256 hash of an API key
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}
