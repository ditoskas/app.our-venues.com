// The Root account. Its password is NOT kept in code (the repo is public):
// it comes from SEED_ROOT_PASSWORD — see seedRootUser() for what happens when
// that's unset. It's only used when the Root user is first created; changing
// it later doesn't touch an existing user (use the Profile page for that).
export const ROOT_SEED = {
  displayName: "Dimitris Toskas",
  username: "ditoskas@gmail.com",
  role: "Root" as const,
  defaultLocale: "el" as const,
};
