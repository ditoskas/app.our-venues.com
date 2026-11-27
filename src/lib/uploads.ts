import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { deleteObjects, deletePrefix, getObject, listObjects, putObject } from "./s3";
import { BYTES_PER_MB, getProfessionalById, storageQuotaMB } from "./professionals";

// Every uploaded file lives in the S3 bucket (see lib/s3.ts), keyed under
// `professionals/<professionalId>/...` — the same layout the old UPLOADS_DIR
// folder tree used. Only the filename is stored on the Mongo document; the
// key prefix carries the rest. Everything under one professional's prefix
// counts toward that professional's storage quota.

const EXT_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_BY_MIME).map(([mime, ext]) => [ext, mime])
);

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

function professionalPrefix(professionalId: string): string {
  return `professionals/${professionalId}/`;
}

function professionalImagesPrefix(professionalId: string): string {
  return `${professionalPrefix(professionalId)}images/`;
}

function celebrationPrefix(professionalId: string, celebrationId: string): string {
  return `${professionalPrefix(professionalId)}celebrations/${celebrationId}/`;
}

function celebrationTimelinePrefix(professionalId: string, celebrationId: string): string {
  return `${celebrationPrefix(professionalId, celebrationId)}timeline/`;
}

// A celebration's own single-image fields (hero background, invitation).
function celebrationImagesPrefix(professionalId: string, celebrationId: string): string {
  return `${celebrationPrefix(professionalId, celebrationId)}images/`;
}

function celebrationLiveEventsPrefix(professionalId: string, celebrationId: string): string {
  return `${celebrationPrefix(professionalId, celebrationId)}live-events/`;
}

function extensionFor(file: File): string {
  return path.extname(file.name) || EXT_BY_MIME[file.type] || "";
}

// ---------------------------------------------------------------------------
// Storage quota
// ---------------------------------------------------------------------------

export class StorageQuotaExceededError extends Error {
  constructor(
    public readonly usedBytes: number,
    public readonly quotaBytes: number,
    public readonly incomingBytes: number
  ) {
    super(
      `Storage quota exceeded: ${usedBytes} used + ${incomingBytes} incoming > ${quotaBytes} allowed`
    );
    this.name = "StorageQuotaExceededError";
  }
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
}

// One pending upload. `replacesPrefix` is a full key prefix of whatever the
// upload will replace (e.g. the old "logo." file), so that object's size is
// credited back instead of counted twice.
export interface PendingUpload {
  size: number;
  replacesPrefix?: string;
}

async function usedBytesFor(
  professionalId: string,
  excludePrefixes: string[] = []
): Promise<number> {
  const objects = await listObjects(professionalPrefix(professionalId));
  return objects
    .filter((o) => !excludePrefixes.some((p) => o.Key?.startsWith(p)))
    .reduce((sum, o) => sum + (o.Size ?? 0), 0);
}

// Usage is computed from the bucket itself (sum of object sizes under the
// professional's prefix) rather than a counter on the Mongo document, so it
// can never drift from what's actually stored.
export async function getStorageUsage(professionalId: string): Promise<StorageUsage> {
  const professional = await getProfessionalById(professionalId);
  const quotaMB = professional ? storageQuotaMB(professional) : 0;
  return {
    usedBytes: await usedBytesFor(professionalId),
    quotaBytes: quotaMB * BYTES_PER_MB,
  };
}

// Throws StorageQuotaExceededError if the uploads wouldn't fit. Called by
// every save* function below; actions that save several files in one submit
// (Celebration Info: hero background + invitation) also call it up front
// with all of them, so nothing is written if the combined size doesn't fit.
export async function assertStorageQuota(
  professionalId: string,
  uploads: PendingUpload[]
): Promise<void> {
  const incomingBytes = uploads.reduce((sum, u) => sum + u.size, 0);
  if (incomingBytes === 0) return;

  const professional = await getProfessionalById(professionalId);
  const quotaBytes = professional ? storageQuotaMB(professional) * BYTES_PER_MB : 0;
  const replaced = uploads.map((u) => u.replacesPrefix).filter((p): p is string => !!p);
  const usedBytes = await usedBytesFor(professionalId, replaced);

  if (usedBytes + incomingBytes > quotaBytes) {
    throw new StorageQuotaExceededError(usedBytes, quotaBytes, incomingBytes);
  }
}

// Replacement prefixes for the fixed-name single-image fields, for callers
// that pre-check several uploads together via assertStorageQuota().
export function heroBackgroundUpload(
  professionalId: string,
  celebrationId: string,
  file: File
): PendingUpload {
  return {
    size: file.size,
    replacesPrefix: `${celebrationImagesPrefix(professionalId, celebrationId)}hero-background.`,
  };
}

export function invitationUpload(
  professionalId: string,
  celebrationId: string,
  file: File
): PendingUpload {
  return {
    size: file.size,
    replacesPrefix: `${celebrationImagesPrefix(professionalId, celebrationId)}invitation.`,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function deleteByPrefix(prefix: string): Promise<void> {
  const existing = await listObjects(prefix);
  await deleteObjects(existing.map((o) => o.Key!).filter(Boolean));
}

// Writes a fixed-name single file (logo, hero background, invitation): the
// extension can change between uploads (PNG → JPG), so any existing
// "<baseName>.*" is removed — after the new one is written, so a failed
// upload never leaves the field without a file.
async function saveFixedName(
  professionalId: string,
  dirPrefix: string,
  baseName: string,
  file: File
): Promise<string> {
  const replacesPrefix = `${dirPrefix}${baseName}.`;
  await assertStorageQuota(professionalId, [{ size: file.size, replacesPrefix }]);

  const filename = `${baseName}${extensionFor(file)}`;
  const key = `${dirPrefix}${filename}`;
  const stale = (await listObjects(replacesPrefix)).map((o) => o.Key!).filter((k) => k && k !== key);

  await putObject(key, Buffer.from(await file.arrayBuffer()), file.type || undefined);
  await deleteObjects(stale);
  return filename;
}

// Writes a list-item file under a random name (timeline, live events), so
// multiple files coexist under the same prefix.
async function saveRandomName(
  professionalId: string,
  dirPrefix: string,
  file: File,
  replacesFilename?: string
): Promise<string> {
  await assertStorageQuota(professionalId, [
    {
      size: file.size,
      ...(replacesFilename ? { replacesPrefix: `${dirPrefix}${replacesFilename}` } : {}),
    },
  ]);

  const filename = `${randomUUID()}${extensionFor(file)}`;
  await putObject(`${dirPrefix}${filename}`, Buffer.from(await file.arrayBuffer()), file.type || undefined);
  return filename;
}

// Seeder variant: copies a local file (e.g. from src/assets/seed/) into the
// bucket. Deliberately not quota-checked — seed data is fixed and tiny.
async function putLocalFile(key: string, sourcePath: string): Promise<void> {
  const buffer = await readFile(sourcePath);
  await putObject(key, buffer, MIME_BY_EXT[path.extname(sourcePath).toLowerCase()]);
}

// ---------------------------------------------------------------------------
// Professional logo
// ---------------------------------------------------------------------------

export async function saveProfessionalLogo(professionalId: string, file: File): Promise<string> {
  return saveFixedName(professionalId, professionalImagesPrefix(professionalId), "logo", file);
}

export async function saveProfessionalLogoFromPath(
  professionalId: string,
  sourcePath: string
): Promise<string> {
  const prefix = professionalImagesPrefix(professionalId);
  await deleteByPrefix(`${prefix}logo.`);
  const filename = `logo${path.extname(sourcePath)}`;
  await putLocalFile(`${prefix}${filename}`, sourcePath);
  return filename;
}

export async function readProfessionalLogo(
  professionalId: string,
  filename: string
): Promise<Buffer> {
  return getObject(`${professionalImagesPrefix(professionalId)}${filename}`);
}

// Removes everything a professional owns (logo + every celebration's files).
export async function deleteProfessionalImages(professionalId: string): Promise<void> {
  await deletePrefix(professionalPrefix(professionalId));
}

// ---------------------------------------------------------------------------
// Celebration timeline images
// ---------------------------------------------------------------------------

// `replacesFilename`: the item's current image when replacing it, so its size
// is credited back in the quota check. The caller deletes the old file only
// after this succeeds.
export async function saveTimelineImage(
  professionalId: string,
  celebrationId: string,
  file: File,
  replacesFilename?: string
): Promise<string> {
  return saveRandomName(
    professionalId,
    celebrationTimelinePrefix(professionalId, celebrationId),
    file,
    replacesFilename
  );
}

export async function saveTimelineImageFromPath(
  professionalId: string,
  celebrationId: string,
  sourcePath: string
): Promise<string> {
  const filename = `${randomUUID()}${path.extname(sourcePath)}`;
  await putLocalFile(
    `${celebrationTimelinePrefix(professionalId, celebrationId)}${filename}`,
    sourcePath
  );
  return filename;
}

export async function readTimelineImage(
  professionalId: string,
  celebrationId: string,
  filename: string
): Promise<Buffer> {
  return getObject(`${celebrationTimelinePrefix(professionalId, celebrationId)}${filename}`);
}

export async function deleteTimelineImage(
  professionalId: string,
  celebrationId: string,
  filename: string
): Promise<void> {
  await deleteObjects([`${celebrationTimelinePrefix(professionalId, celebrationId)}${filename}`]);
}

// ---------------------------------------------------------------------------
// Celebration single images (hero background, invitation)
// ---------------------------------------------------------------------------

export async function saveCelebrationHeroBackground(
  professionalId: string,
  celebrationId: string,
  file: File
): Promise<string> {
  return saveFixedName(
    professionalId,
    celebrationImagesPrefix(professionalId, celebrationId),
    "hero-background",
    file
  );
}

export async function saveCelebrationInvitation(
  professionalId: string,
  celebrationId: string,
  file: File
): Promise<string> {
  return saveFixedName(
    professionalId,
    celebrationImagesPrefix(professionalId, celebrationId),
    "invitation",
    file
  );
}

export async function readCelebrationImage(
  professionalId: string,
  celebrationId: string,
  filename: string
): Promise<Buffer> {
  return getObject(`${celebrationImagesPrefix(professionalId, celebrationId)}${filename}`);
}

// ---------------------------------------------------------------------------
// Celebration live-event photos
// ---------------------------------------------------------------------------

export async function saveLiveEventImage(
  professionalId: string,
  celebrationId: string,
  file: File
): Promise<string> {
  return saveRandomName(
    professionalId,
    celebrationLiveEventsPrefix(professionalId, celebrationId),
    file
  );
}

export async function saveLiveEventImageFromPath(
  professionalId: string,
  celebrationId: string,
  sourcePath: string
): Promise<string> {
  const filename = `${randomUUID()}${path.extname(sourcePath)}`;
  await putLocalFile(
    `${celebrationLiveEventsPrefix(professionalId, celebrationId)}${filename}`,
    sourcePath
  );
  return filename;
}

export async function readLiveEventImage(
  professionalId: string,
  celebrationId: string,
  filename: string
): Promise<Buffer> {
  return getObject(`${celebrationLiveEventsPrefix(professionalId, celebrationId)}${filename}`);
}

export async function deleteLiveEventImage(
  professionalId: string,
  celebrationId: string,
  filename: string
): Promise<void> {
  await deleteObjects([`${celebrationLiveEventsPrefix(professionalId, celebrationId)}${filename}`]);
}

// Removes every file a celebration owns in one go — call this when the
// celebration itself is deleted.
export async function deleteCelebrationUploads(
  professionalId: string,
  celebrationId: string
): Promise<void> {
  await deletePrefix(celebrationPrefix(professionalId, celebrationId));
}
