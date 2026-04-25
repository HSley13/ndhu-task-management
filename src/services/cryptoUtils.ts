/**
 * Client-side hybrid encryption for login passwords.
 *
 * Scheme: generate a random AES-256 key, encrypt the password with AES-GCM
 * (base64 of iv‖ct‖tag), then encrypt the AES key with the server's RSA public
 * key using RSA-OAEP-SHA256 (base64). Both values are sent to POST /auth/login.
 *
 * The server decrypts in reverse:
 *   decrypt_rsa(encrypted_key) → aes_key
 *   decrypt(encrypted_password, aes_key) → password
 *
 * Uses the Web Crypto API (crypto.subtle), available in React Native ≥ 0.73
 * with Hermes and in all modern browsers.
 */

const SERVER_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6ldFpZ1SPrNucQN+JoHx
yaG4Ih+IQtbeAPKWoP5usCJ6ZKALRq/p7A4DsSHpzoR4PX38gvQLswVvGo0nmkVA
2a9KfNAxKI9jGobU3Dce0jmVRx/Jt5tA4W6jinZ+8zGP9FNpJyBSv32/cx7MlGib
xY7RxbU/gAIq40VnTk9Wor5DTNTFClPZZeyfh/OFHb41bbk394k/PgE2Nr14qfMC
4ER2QxlyFkUTdozrhVVc7m1QSDUhySNk61UvcHpinVLPSvt6dj97PlH7c3M5417S
Ct/qSVaRlHFWEUr0rDoAblMeaCS2AE2fX9WsGPrUuY8AhDNN9xdBV0MXONf22Vxv
BwIDAQAB
-----END PUBLIC KEY-----`;

/**
 * Converts a PEM-encoded public key to an ArrayBuffer (SPKI DER bytes).
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(base64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i);
  }
  return buf.buffer;
}

/**
 * Encodes a Uint8Array (or ArrayBuffer) to a base64 string.
 */
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Encrypts a password for transit using RSA-OAEP + AES-GCM hybrid encryption.
 *
 * @returns Object with `encrypted_key` and `encrypted_password`, both base64-encoded,
 *          ready to be sent to POST /auth/login in place of a plaintext password.
 */
export async function encryptPassword(password: string): Promise<{
  encrypted_key: string;
  encrypted_password: string;
}> {
  const subtle = crypto.subtle;

  // Import the server RSA public key
  const rsaKey = await subtle.importKey(
    'spki',
    pemToArrayBuffer(SERVER_PUBLIC_KEY_PEM),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );

  // Generate a random AES-256 key (exportable so we can encrypt and send its raw bytes)
  const aesKey = await subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt'],
  );

  // Export the AES key as raw bytes
  const rawAesKey = await subtle.exportKey('raw', aesKey);

  // RSA-OAEP-encrypt the AES key with the server's public key
  const encryptedKey = await subtle.encrypt({ name: 'RSA-OAEP' }, rsaKey, rawAesKey);

  // Generate a random 12-byte IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // AES-GCM-encrypt the password; WebCrypto output is ciphertext‖tag (tag = last 16 bytes)
  const passwordBytes = new TextEncoder().encode(password);
  const aesCiphertext = await subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    aesKey,
    passwordBytes,
  );

  // Pack as iv(12)‖ciphertext‖tag — matches the server's decrypt() format
  const payload = new Uint8Array(iv.length + aesCiphertext.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(aesCiphertext), iv.length);

  return {
    encrypted_key: toBase64(encryptedKey),
    encrypted_password: toBase64(payload.buffer),
  };
}
