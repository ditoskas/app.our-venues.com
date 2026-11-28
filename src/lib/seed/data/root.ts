export const ROOT_SEED = {
  displayName: "Dimitris Toskas",
  username: "ditoskas@gmail.com",
  password: process.env.SEED_ROOT_PASSWORD ?? "",
  role: "Root" as const,
  defaultLocale: "el" as const,
};
