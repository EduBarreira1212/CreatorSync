import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

type EncryptedPayload = {
  iv: string;
  tag: string;
  data: string;
};

const getEncryptionKey = () => {
  const rawKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('TOKEN_ENCRYPTION_KEY is required');
  }

  const isHex = /^[0-9a-fA-F]+$/.test(rawKey);
  const keyBuffer =
    isHex && rawKey.length === 64
      ? Buffer.from(rawKey, 'hex')
      : Buffer.from(rawKey, 'base64');

  if (keyBuffer.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes (hex or base64)');
  }

  return keyBuffer;
};

export const encryptString = (value: string): string => {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedPayload = {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64'),
  };

  return JSON.stringify(payload);
};

const isEncryptedPayload = (value: string): boolean => {
  try {
    const parsed = JSON.parse(value) as Partial<EncryptedPayload>;
    return (
      typeof parsed === 'object' &&
      !!parsed &&
      typeof parsed.iv === 'string' &&
      typeof parsed.tag === 'string' &&
      typeof parsed.data === 'string'
    );
  } catch {
    return false;
  }
};

export const decryptString = (value: string): string => {
  if (!isEncryptedPayload(value)) {
    return value;
  }

  const key = getEncryptionKey();
  const payload = JSON.parse(value) as EncryptedPayload;
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const data = Buffer.from(payload.data, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

  return decrypted.toString('utf8');
};
