// Wipes ALL app data so the seeder (lib/seed, run at every server boot) can
// rebuild the demo dataset from scratch: drops the MONGODB_DB database and
// deletes every object in S3_BUCKET. Restart the server afterwards to reseed.
//
// Destructive — refuses to run with NODE_ENV=production and without --yes.
//
// Usage (from src/):
//   Docker:  docker compose exec backend npm run seed:reset -- --yes
//            docker compose restart backend
//   Local:   node --env-file=.env.local scripts/seed-reset.mjs --yes
//            (then restart `npm run dev`)

import { MongoClient } from "mongodb";
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

if (process.env.NODE_ENV === "production") {
  console.error("seed:reset refuses to run with NODE_ENV=production.");
  process.exit(1);
}
if (!process.argv.includes("--yes")) {
  console.error(
    "This deletes the whole database and every uploaded file. Re-run with --yes to confirm."
  );
  process.exit(1);
}

function env(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function resetMongo() {
  const dbName = env("MONGODB_DB");
  const client = new MongoClient(env("MONGODB_URI"));
  try {
    await client.connect();
    await client.db(dbName).dropDatabase();
    console.log(`Dropped database "${dbName}".`);
  } finally {
    await client.close();
  }
}

async function resetS3() {
  const bucket = env("S3_BUCKET");
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const s3 = new S3Client({
    region: env("S3_REGION"),
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  });

  let deleted = 0;
  let token;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token })
    );
    const keys = (page.Contents ?? []).map((o) => ({ Key: o.Key }));
    if (keys.length) {
      await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }));
      deleted += keys.length;
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  console.log(`Deleted ${deleted} object(s) from bucket "${bucket}".`);
}

await resetMongo();
await resetS3();
console.log("Reset done — restart the server to reseed.");
