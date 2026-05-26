/**
 * FileRestorer Pro — Encryption Manager
 * 
 * Implements AES-256-GCM encryption and PBKDF2 key derivation (Section 20).
 * This secures recovered files at rest by encrypting them before writing to disk.
 * 
 * Output file layout:
 *   - [0..11]: IV / Nonce (12 bytes)
 *   - [12..27]: Authentication Tag (16 bytes)
 *   - [28..]: Ciphertext (variable length)
 * 
 * NO MOCKS. Real cryptographic encryption.
 */

import * as crypto from 'crypto';
import { logger } from './logger';

export class EncryptionManager {
  private static ITERATIONS = 100000;
  private static KEY_LEN = 32; // 256 bits for AES-256
  private static SALT = Buffer.from('filerestorer_salt_2026_null_logic'); // Static salt for key recovery

  /**
   * Derive a 256-bit key from a password using PBKDF2-HMAC-SHA256.
   */
  private deriveKey(password: string): Buffer {
    return crypto.pbkdf2Sync(
      password,
      EncryptionManager.SALT,
      EncryptionManager.ITERATIONS,
      EncryptionManager.KEY_LEN,
      'sha256'
    );
  }

  /**
   * Encrypt a data buffer using AES-256-GCM.
   * Returns a concatenated buffer: [IV (12 bytes)] + [Auth Tag (16 bytes)] + [Ciphertext].
   */
  public encrypt(data: Buffer, password: string): Buffer {
    try {
      const key = this.deriveKey(password);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      const ciphertext = Buffer.concat([
        cipher.update(data),
        cipher.final()
      ]);

      const tag = cipher.getAuthTag();

      // Concatenate IV + Tag + Ciphertext into a single package
      return Buffer.concat([iv, tag, ciphertext]);
    } catch (err) {
      logger.error('Encryption', 'Failed to encrypt data', { error: String(err) });
      throw new Error(`Encryption failed: ${String(err)}`);
    }
  }

  /**
   * Decrypt a data package encrypted by this manager.
   * Expects input buffer layout: [IV (12 bytes)] + [Auth Tag (16 bytes)] + [Ciphertext].
   */
  public decrypt(encryptedPackage: Buffer, password: string): Buffer {
    try {
      if (encryptedPackage.length < 28) {
        throw new Error('Encrypted package is too small (corrupted or invalid layout)');
      }

      const key = this.deriveKey(password);
      const iv = encryptedPackage.subarray(0, 12);
      const tag = encryptedPackage.subarray(12, 28);
      const ciphertext = encryptedPackage.subarray(28);

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);

      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);
    } catch (err) {
      logger.error('Encryption', 'Failed to decrypt data', { error: String(err) });
      throw new Error(`Decryption failed: ${String(err)}`);
    }
  }
}
