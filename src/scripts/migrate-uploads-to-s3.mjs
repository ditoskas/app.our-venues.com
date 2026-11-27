// One-off: copies every file from the old on-disk uploads folder (the former
// UPLOADS_DIR, e.g. C:/Shared/o-gamos-mas) into the S3 bucket, keeping the
// same relative path as the object key — so the filenames already stored on
// Mongo documents keep resolving. Safe to re-run (it just overwrites).
//
// Usage (from src/):
//   node scripts/migrate-uploads-to-s3.mjs <uploadsDir>
// with the same S3_* env vars the app uses (see .env.local.example), e.g.
// for the docker-compose S3Mock:
//   S3_BUCKET=o-gamos-mas S3_REGION=us-east-1 S3_ENDPOINT=http://localhost:9090 \
//   S3_FORCE_PATH_STYLE=true S3_ACCESS_KEY_ID=local S3_SECRET_ACCESS_KEY=local \
//   node scripts/migrate-uploads-to-s3.mjs C:/Shared/o-gamos-mas

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

const root = process.argv[2];
if (!root) {
  console.error("Usage: node scripts/migrate-uploads-to-s3.mjs <uploadsDir>");
  process.exit(1);
}
for (const name of ["S3_BUCKET", "S3_REGION"]) {
  if (!process.env[name]) {
    console.error(`Missing environment variable: "${name}"`);
    process.exit(1);
  }
}

const { S3_ACCESS_KEY_ID: accessKeyId, S3_SECRET_ACCESS_KEY: secretAccessKey } = process.env;
const client = new S3Client({
  region: process.env.S3_REGION,
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
});

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

let count = 0;
let bytes = 0;
for await (const file of walk(path.join(root, "professionals"))) {
  const key = path.relative(root, file).split(path.sep).join("/");
  const body = await readFile(file);
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: MIME_BY_EXT[path.extname(file).toLowerCase()],
    })
  );
  count += 1;
  bytes += body.length;
  console.log(`uploaded ${key}`);
}
console.log(`Done: ${count} files, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
