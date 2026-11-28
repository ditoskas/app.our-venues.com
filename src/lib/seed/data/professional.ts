import { SEED_ASSETS } from "../assets";
import type { ProfessionalSeed } from "../types";

// The one demo professional — owns every seeded celebration. Its login uses
// `email` as username and the shared SEED_USER_PASSWORD.
export const PROFESSIONAL_SEED: ProfessionalSeed = {
  companyName: "Test Company",
  contactPerson: "Eleni Georgiou",
  phone: "2310123456",
  mobile: "6971234567",
  email: "test@o-gamos-mas.com",
  website: "https://o-gamos-mas.com",
  country: "Greece",
  city: "Thessaloniki",
  address: "Tsimiski 45",
  postCode: "54623",
  plan: "Premium",
  logoSourcePath: SEED_ASSETS.professionalLogo,
};
