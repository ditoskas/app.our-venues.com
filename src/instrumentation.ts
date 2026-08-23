export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runSeeders } = await import("./lib/seed");
    try {
      await runSeeders();
    } catch (err) {
      // A DB hiccup at boot must not take down the whole app — routes that
      // don't touch the database (or a retried request once the DB is back)
      // should still work.
      console.error("Seeding failed at startup:", err);
    }
  }
}
