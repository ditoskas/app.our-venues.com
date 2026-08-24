import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

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

function uploadsRoot(): string {
  const dir = process.env.UPLOADS_DIR;
  if (!dir) {
    throw new Error('Missing environment variable: "UPLOADS_DIR"');
  }
  return dir;
}

export function professionalImagesDir(professionalId: string): string {
  return path.join(uploadsRoot(), "professionals", professionalId, "images");
}

// Removes any existing "logo.*" first since the extension can change between uploads.
export async function saveProfessionalLogo(
  professionalId: string,
  file: File
): Promise<string> {
  const dir = professionalImagesDir(professionalId);
  await mkdir(dir, { recursive: true });

  const existing = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    existing
      .filter((name) => name.startsWith("logo."))
      .map((name) => rm(path.join(dir, name)))
  );

  const ext = path.extname(file.name) || EXT_BY_MIME[file.type] || "";
  const filename = `logo${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return filename;
}

// Copies a local file (e.g. a seed asset) in as a professional's logo.
export async function saveProfessionalLogoFromPath(
  professionalId: string,
  sourcePath: string
): Promise<string> {
  const dir = professionalImagesDir(professionalId);
  await mkdir(dir, { recursive: true });
  const filename = `logo${path.extname(sourcePath)}`;
  const buffer = await readFile(sourcePath);
  await writeFile(path.join(dir, filename), buffer);
  return filename;
}

export async function readProfessionalLogo(
  professionalId: string,
  filename: string
): Promise<Buffer> {
  return readFile(path.join(professionalImagesDir(professionalId), filename));
}

export async function deleteProfessionalImages(professionalId: string): Promise<void> {
  await rm(path.join(uploadsRoot(), "professionals", professionalId), {
    recursive: true,
    force: true,
  });
}

// A celebration's timeline images live under its owning professional's own
// folder (not a top-level "celebrations" tree) — professionals already own
// all of a celebration's uploads by convention (see "File uploads").
export function celebrationTimelineDir(professionalId: string, celebrationId: string): string {
  return path.join(
    uploadsRoot(),
    "professionals",
    professionalId,
    "celebrations",
    celebrationId,
    "timeline"
  );
}

// Timeline items are a list (unlike a professional's single "logo.*"), so
// each image gets a random filename rather than a fixed one — nothing to
// clean up before writing, multiple images coexist in the same directory.
export async function saveTimelineImage(
  professionalId: string,
  celebrationId: string,
  file: File
): Promise<string> {
  const dir = celebrationTimelineDir(professionalId, celebrationId);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || EXT_BY_MIME[file.type] || "";
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return filename;
}

// Copies a local file (e.g. a seed asset) in as a timeline item's image —
// the seeder's variant of saveTimelineImage, same random-filename reasoning.
export async function saveTimelineImageFromPath(
  professionalId: string,
  celebrationId: string,
  sourcePath: string
): Promise<string> {
  const dir = celebrationTimelineDir(professionalId, celebrationId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}${path.extname(sourcePath)}`;
  const buffer = await readFile(sourcePath);
  await writeFile(path.join(dir, filename), buffer);
  return filename;
}

export async function readTimelineImage(
  professionalId: string,
  celebrationId: string,
  filename: string
): Promise<Buffer> {
  return readFile(path.join(celebrationTimelineDir(professionalId, celebrationId), filename));
}

export async function deleteTimelineImage(
  professionalId: string,
  celebrationId: string,
  filename: string
): Promise<void> {
  await rm(path.join(celebrationTimelineDir(professionalId, celebrationId), filename), {
    force: true,
  });
}

// A celebration's own single-image fields (currently: hero background)
// live in their own "images" folder, a sibling of "timeline" under the
// same professional-owned celebration directory.
export function celebrationImagesDir(professionalId: string, celebrationId: string): string {
  return path.join(
    uploadsRoot(),
    "professionals",
    professionalId,
    "celebrations",
    celebrationId,
    "images"
  );
}

// Fixed filename, existing "hero-background.*" removed first — same
// single-file-replaces-itself shape as saveProfessionalLogo, for the same
// reason (the extension can change between uploads).
export async function saveCelebrationHeroBackground(
  professionalId: string,
  celebrationId: string,
  file: File
): Promise<string> {
  const dir = celebrationImagesDir(professionalId, celebrationId);
  await mkdir(dir, { recursive: true });

  const existing = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    existing
      .filter((name) => name.startsWith("hero-background."))
      .map((name) => rm(path.join(dir, name)))
  );

  const ext = path.extname(file.name) || EXT_BY_MIME[file.type] || "";
  const filename = `hero-background${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return filename;
}

// Same fixed-filename-replaces-itself shape as saveCelebrationHeroBackground
// above, sharing the same "images" folder — just a different fixed name.
export async function saveCelebrationInvitation(
  professionalId: string,
  celebrationId: string,
  file: File
): Promise<string> {
  const dir = celebrationImagesDir(professionalId, celebrationId);
  await mkdir(dir, { recursive: true });

  const existing = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    existing
      .filter((name) => name.startsWith("invitation."))
      .map((name) => rm(path.join(dir, name)))
  );

  const ext = path.extname(file.name) || EXT_BY_MIME[file.type] || "";
  const filename = `invitation${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return filename;
}

export async function readCelebrationImage(
  professionalId: string,
  celebrationId: string,
  filename: string
): Promise<Buffer> {
  return readFile(path.join(celebrationImagesDir(professionalId, celebrationId), filename));
}

// A celebration's Live Events photos — a list like timeline images (random
// filenames, multiple coexist), but its own sibling folder under the same
// per-celebration directory rather than sharing "timeline" or "images".
export function celebrationLiveEventsDir(professionalId: string, celebrationId: string): string {
  return path.join(
    uploadsRoot(),
    "professionals",
    professionalId,
    "celebrations",
    celebrationId,
    "live-events"
  );
}

export async function saveLiveEventImage(
  professionalId: string,
  celebrationId: string,
  file: File
): Promise<string> {
  const dir = celebrationLiveEventsDir(professionalId, celebrationId);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || EXT_BY_MIME[file.type] || "";
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return filename;
}

// Copies a local file (e.g. a seed asset) in as a live event's image — the
// seeder's variant of saveLiveEventImage, same random-filename reasoning.
export async function saveLiveEventImageFromPath(
  professionalId: string,
  celebrationId: string,
  sourcePath: string
): Promise<string> {
  const dir = celebrationLiveEventsDir(professionalId, celebrationId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}${path.extname(sourcePath)}`;
  const buffer = await readFile(sourcePath);
  await writeFile(path.join(dir, filename), buffer);
  return filename;
}

export async function readLiveEventImage(
  professionalId: string,
  celebrationId: string,
  filename: string
): Promise<Buffer> {
  return readFile(path.join(celebrationLiveEventsDir(professionalId, celebrationId), filename));
}

export async function deleteLiveEventImage(
  professionalId: string,
  celebrationId: string,
  filename: string
): Promise<void> {
  await rm(path.join(celebrationLiveEventsDir(professionalId, celebrationId), filename), {
    force: true,
  });
}

// Removes every timeline image for a celebration in one go — call this when
// the celebration itself is deleted (mirrors deleteProfessionalImages above).
export async function deleteCelebrationUploads(
  professionalId: string,
  celebrationId: string
): Promise<void> {
  await rm(
    path.join(uploadsRoot(), "professionals", professionalId, "celebrations", celebrationId),
    { recursive: true, force: true }
  );
}
