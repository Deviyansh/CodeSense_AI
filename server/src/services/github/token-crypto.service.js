
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

function getEncryptionKey() {
  const value = process.env.GITHUB_TOKEN_ENCRYPTION_KEY || "";

  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    const error = new Error(
      "GITHUB_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal string."
    );
    error.code = "GITHUB_ENCRYPTION_KEY_INVALID";
    error.statusCode = 500;
    throw error;
  }

  return Buffer.from(value, "hex");
}

/**
 * Encrypt a GitHub token using AES-256-GCM.
 * The random IV and authentication tag are stored with the ciphertext.
 */
export function encryptGitHubToken(token) {
  if (typeof token !== "string" || !token.trim()) {
    throw new TypeError("A non-empty GitHub token is required.");
  }

  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("hex"),
    authTag.toString("hex"),
    ciphertext.toString("hex"),
  ].join(":");
}

/**
 * Decrypt a token previously produced by encryptGitHubToken().
 * Authentication fails if the ciphertext or tag has been modified.
 */
export function decryptGitHubToken(encryptedValue) {
  if (typeof encryptedValue !== "string") {
    throw new TypeError("An encrypted GitHub token is required.");
  }

  const parts = encryptedValue.split(":");

  if (
    parts.length !== 4 ||
    parts[0] !== "v1" ||
    !/^[0-9a-f]{24}$/i.test(parts[1]) ||
    !/^[0-9a-f]{32}$/i.test(parts[2]) ||
    !/^(?:[0-9a-f]{2})+$/i.test(parts[3])
  ) {
    throw new Error("Invalid encrypted GitHub token format.");
  }

  const [, ivHex, authTagHex, ciphertextHex] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
