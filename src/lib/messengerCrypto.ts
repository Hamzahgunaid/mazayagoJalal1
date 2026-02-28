import crypto from "crypto";

function getKey(): Buffer {
  const b64 = process.env.MESSENGER_TOKEN_KEY ?? "";
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error("MESSENGER_TOKEN_KEY must be base64-encoded 32 bytes");
  }
  return key;
}

export function encryptString(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // [iv(12)][tag(16)][ciphertext]
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptString(enc: string): string {
  const key = getKey();
  const data = Buffer.from(enc, "base64");

  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}
