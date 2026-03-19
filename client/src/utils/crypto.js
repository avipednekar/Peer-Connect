// AES-256-GCM encryption using Web Crypto API

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

// Derive a key from roomId + salt using PBKDF2
export async function deriveKey(roomId, salt = "peer-connect-chat") {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(roomId + salt),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

// Encrypt plaintext → { ciphertext: base64, iv: base64 }
export async function encrypt(plaintext, key) {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext),
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// Decrypt { ciphertext: base64, iv: base64 } → plaintext string
export async function decrypt(ciphertext, iv, key) {
  try {
    const ciphertextBuffer = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const ivBuffer = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

    const plaintext = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: ivBuffer },
      key,
      ciphertextBuffer,
    );

    return new TextDecoder().decode(plaintext);
  } catch {
    return "[Decryption failed]";
  }
}
