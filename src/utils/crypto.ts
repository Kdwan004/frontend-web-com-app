export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export async function generateKeyPair(): Promise<KeyPair> {
  try {
    // Generate RSA key pair
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    // Export public key
    const publicKeyBuffer = await window.crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey
    );
    const publicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));

    // Export private key
    const privateKeyBuffer = await window.crypto.subtle.exportKey(
      "pkcs8",
      keyPair.privateKey
    );
    const privateKey = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));

    return {
      publicKey,
      privateKey
    };
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw new Error('Failed to generate key pair');
  }
}

export function storePrivateKey(privateKey: string): void {
  localStorage.setItem('privateKey', privateKey);
}

export function getPrivateKey(): string | null {
  return localStorage.getItem('privateKey');
}

export function clearPrivateKey(): void {
  localStorage.removeItem('privateKey');
} 