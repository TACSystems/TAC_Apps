import { registerAppProfile } from "@core/lib/app-profile";

registerAppProfile({
  productName: "TAC-LOG",
  dbFile: "firearms.db",
  requiredTables: ["firearms", "courses_of_fire"],
  autoBackupPrefix: "TAC-LOG-auto-",
  legacyVersion: "0.4",
});
