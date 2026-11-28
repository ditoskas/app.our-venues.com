import { logAction } from "../../logActions";
import { createProfessional, listProfessionals, setProfessionalLogo } from "../../professionals";
import { saveProfessionalLogoFromPath } from "../../uploads";
import type { ProfessionalSeed } from "../types";

// Idempotent by companyName. Returns the (new or existing) professional's id.
export async function seedProfessional(seed: ProfessionalSeed): Promise<string> {
  const existing = (await listProfessionals()).find((p) => p.companyName === seed.companyName);
  if (existing) return existing._id.toString();

  const { logoSourcePath, ...input } = seed;
  const professional = await createProfessional(input);
  const professionalId = professional._id.toString();

  let logoFilename: string | undefined;
  if (logoSourcePath) {
    logoFilename = await saveProfessionalLogoFromPath(professionalId, logoSourcePath);
    await setProfessionalLogo(professionalId, logoFilename);
  }

  await logAction({
    userId: "system",
    type: "info",
    category: "Professionals",
    message: `Seeded professional "${professional.companyName}"`,
    dataTo: { ...input, logoFilename },
  });

  return professionalId;
}
