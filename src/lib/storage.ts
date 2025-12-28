import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const LOCAL_STORAGE_DIR = '/tmp/uploads';
const SIGNED_URL_TTL_SECONDS = 300;

type UploadResult = {
  storageKey: string;
  url?: string;
};

const isLocalStorageEnabled = () => process.env.LOCAL_STORAGE === 'true';

const getFileBuffer = async (file: File | Buffer) => {
  if (Buffer.isBuffer(file)) {
    return file;
  }

  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const buildStorageKey = (filename: string) => {
  const ext = path.extname(filename || '') || '';
  return `${Date.now()}-${randomUUID()}${ext}`;
};

const getS3Client = () => {
  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error('AWS_REGION is required when LOCAL_STORAGE is disabled');
  }
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  return new S3Client({
    region,
    credentials: accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
          sessionToken,
        }
      : undefined,
  });
};

export const uploadToStorage = async (
  file: File | Buffer,
  filename: string,
  mimeType?: string
): Promise<UploadResult> => {
  const storageKey = buildStorageKey(filename);
  const buffer = await getFileBuffer(file);

  if (isLocalStorageEnabled()) {
    const destination = path.join(LOCAL_STORAGE_DIR, storageKey);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, buffer);

    return { storageKey };
  }

  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error('S3_BUCKET is required when LOCAL_STORAGE is disabled');
  }

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: storageKey,
    }),
    { expiresIn: SIGNED_URL_TTL_SECONDS }
  );

  return { storageKey, url };
};
