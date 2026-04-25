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
 * Uses node-forge (pure JS) so it works in Expo Go / Hermes without any
 * native crypto modules or WebCrypto polyfills.
 */
import forge from 'node-forge';

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
 * Encrypts a password for transit using RSA-OAEP + AES-GCM hybrid encryption.
 *
 * @returns Object with `encrypted_key` and `encrypted_password`, both base64-encoded,
 *          ready to be sent to POST /auth/login in place of a plaintext password.
 */
export function encryptPassword(password: string): {
  encrypted_key: string;
  encrypted_password: string;
} {
  // Load the server RSA public key
  const publicKey = forge.pki.publicKeyFromPem(SERVER_PUBLIC_KEY_PEM);

  // Generate a random 32-byte AES-256 key
  const aesKeyBytes = forge.random.getBytesSync(32);

  // RSA-OAEP-SHA256-encrypt the AES key
  const encryptedKeyBytes = publicKey.encrypt(aesKeyBytes, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: { md: forge.md.sha256.create() },
  });

  // Generate a random 12-byte IV for AES-GCM
  const iv = forge.random.getBytesSync(12);

  // AES-GCM-encrypt the password (UTF-8 bytes)
  const cipher = forge.cipher.createCipher('AES-GCM', aesKeyBytes);
  cipher.start({ iv, tagLength: 128 });
  cipher.update(forge.util.createBuffer(password, 'utf8'));
  cipher.finish();

  const ciphertext = cipher.output.getBytes();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tag = (cipher.mode as any).tag.getBytes() as string;

  // Pack as iv(12)‖ciphertext‖tag(16) — matches the server's decrypt() format
  const payload = iv + ciphertext + tag;

  return {
    encrypted_key: forge.util.encode64(encryptedKeyBytes),
    encrypted_password: forge.util.encode64(payload),
  };
}
