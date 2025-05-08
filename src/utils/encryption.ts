import { getPrivateKey } from './crypto';

// Convert base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Import public key from base64 string
async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  try {
    console.log('Importing public key...');
    const keyData = base64ToArrayBuffer(base64Key);
    console.log('Key data converted to ArrayBuffer');
    
    const key = await window.crypto.subtle.importKey(
      'spki',
      keyData,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['encrypt']
    );
    console.log('Public key imported successfully');
    return key;
  } catch (error) {
    console.error('Error importing public key:', error);
    throw error;
  }
}

// Encrypt message using public key
export async function encryptMessage(message: string, publicKeyBase64: string): Promise<string> {
  try {
    console.log('Starting message encryption...');
    if (!publicKeyBase64) {
      console.error('No public key provided');
      throw new Error('Public key not found');
    }
    console.log('Public key retrieved');

    const publicKey = await importPublicKey(publicKeyBase64);
    console.log('Message to encrypt:', message);
    const messageBuffer = new TextEncoder().encode(message);
    console.log('Message encoded to buffer');

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      publicKey,
      messageBuffer
    );
    console.log('Message encrypted successfully');

    const encryptedBase64 = arrayBufferToBase64(encryptedBuffer);
    console.log('Encrypted message converted to base64');
    return encryptedBase64;
  } catch (error) {
    console.error('Detailed encryption error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw new Error('Failed to encrypt message: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// Helper function to retrieve private key from local storage
export function getPrivateKeyFromStorage(): string | null {
  return localStorage.getItem('privateKey');
}

// Import private key from base64 string (PKCS#8 format)
async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
  try {
    console.log('Importing private key...');
    const keyData = base64ToArrayBuffer(base64Key);
    console.log('Private key data converted to ArrayBuffer');
    
    const key = await window.crypto.subtle.importKey(
      'pkcs8', // Private keys are often in PKCS#8 format
      keyData,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true, // Make it exportable if needed, though not strictly for decryption
      ['decrypt']
    );
    console.log('Private key imported successfully');
    return key;
  } catch (error) {
    console.error('Error importing private key:', error);
    throw error;
  }
}

// Decrypt message using private key
export async function decryptMessageRsa(encryptedBase64: string, privateKeyBase64: string): Promise<string> {
  try {
    console.log('Starting message decryption...');
    if (!privateKeyBase64) {
      console.error('No private key provided for decryption');
      throw new Error('Private key not found for decryption');
    }
    if (!encryptedBase64) {
      console.error('No encrypted message provided');
      throw new Error('Encrypted message is empty');
    }
    console.log('Private key and encrypted message retrieved for decryption.');

    const privateKey = await importPrivateKey(privateKeyBase64);
    console.log('Encrypted message (base64):', encryptedBase64);
    const encryptedBuffer = base64ToArrayBuffer(encryptedBase64);
    console.log('Encrypted message converted to ArrayBuffer');

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP'
        // Label can be added here if it was used during encryption, but it wasn't in the Python example
      },
      privateKey,
      encryptedBuffer
    );
    console.log('Message decrypted successfully');

    const decryptedMessage = new TextDecoder().decode(decryptedBuffer);
    console.log('Decrypted message decoded from buffer:', decryptedMessage);
    return decryptedMessage;
  } catch (error) {
    console.error('Detailed decryption error:', error);
    if (error instanceof Error) {
      console.error('Decryption Error message:', error.message);
      console.error('Decryption Error stack:', error.stack);
    }
    // It might be better to return a specific string or null to indicate decryption failure
    // rather than throwing an error that might crash the message display loop.
    // For now, re-throwing to make it visible, but consider returning 'Decryption failed' or null.
    throw new Error('Failed to decrypt message: ' + (error instanceof Error ? error.message : String(error)));
  }
} 