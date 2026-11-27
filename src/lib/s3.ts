import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type _Object,
} from "@aws-sdk/client-s3";

// Thin wrapper over the S3 bucket that holds every uploaded file. The client
// is created lazily on first use — never at import time — for the same reason
// getDb() is (see "MongoDB" in CLAUDE.md): Next.js imports route modules at
// build time, and throwing there on a missing env var breaks `next build`.

interface S3Config {
  client: S3Client;
  bucket: string;
}

const globalForS3 = global as typeof globalThis & { _s3Config?: S3Config };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: "${name}"`);
  }
  return value;
}

function s3(): S3Config {
  if (globalForS3._s3Config) return globalForS3._s3Config;

  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  const config: S3Config = {
    bucket: requireEnv("S3_BUCKET"),
    client: new S3Client({
      region: requireEnv("S3_REGION"),
      // Optional — set for an S3-compatible server (MinIO in docker-compose).
      // Unset means real AWS S3.
      ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      // Explicit keys if given, otherwise the SDK's default credential chain
      // (instance/task role, AWS_* env vars, ~/.aws profile).
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    }),
  };

  globalForS3._s3Config = config;
  return config;
}

export async function putObject(key: string, body: Buffer, contentType?: string): Promise<void> {
  const { client, bucket } = s3();
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );
}

// Throws (NoSuchKey) if the object doesn't exist — callers (the image routes)
// already treat any read error as a 404.
export async function getObject(key: string): Promise<Buffer> {
  const { client, bucket } = s3();
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`Empty body for S3 object "${key}"`);
  return Buffer.from(await res.Body.transformToByteArray());
}

export async function listObjects(prefix: string): Promise<_Object[]> {
  const { client, bucket } = s3();
  const objects: _Object[] = [];
  let token: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token })
    );
    objects.push(...(res.Contents ?? []));
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

// Deleting a missing key is not an error in S3, so this is naturally
// idempotent (same as the old `rm(..., { force: true })`).
export async function deleteObjects(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const { client, bucket } = s3();
  for (let i = 0; i < keys.length; i += 1000) {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
      })
    );
  }
}

export async function deletePrefix(prefix: string): Promise<void> {
  const objects = await listObjects(prefix);
  await deleteObjects(objects.map((o) => o.Key!).filter(Boolean));
}
