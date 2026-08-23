import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
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
