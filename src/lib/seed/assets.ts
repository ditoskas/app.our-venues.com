import path from "node:path";

// Source files under src/assets/seed/ — read only by the seeder, never served.
const SEED_DIR = path.join(process.cwd(), "assets", "seed");

export const SEED_ASSETS = {
  professionalLogo: path.join(SEED_DIR, "test-company-logo.png"),
  story1: path.join(SEED_DIR, "timeline", "story-1.jpg"),
  story2: path.join(SEED_DIR, "timeline", "story-2.jpg"),
  story3: path.join(SEED_DIR, "timeline", "story-3.jpg"),
};
