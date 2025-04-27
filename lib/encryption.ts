import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  // Convert ENCRYPTION_KEY to Buffer, slice to 32 bytes, then convert to Uint8Array
  const key = Uint8Array.from(
    Buffer.from(process.env.ENCRYPTION_KEY || '', 'utf8').slice(0, 32)
  );
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  // Convert ENCRYPTION_KEY to Buffer, slice to 32 bytes, then convert to Uint8Array
  const key = Uint8Array.from(
    Buffer.from(process.env.ENCRYPTION_KEY || '', 'utf8').slice(0, 32)
  );
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}