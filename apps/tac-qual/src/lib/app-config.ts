import { registerAppProfile } from "@core/lib/app-profile";

registerAppProfile({
  productName: "TAC-QUAL",
  dbFile: "tacqual.db",
  requiredTables: ["students", "classes"],
  autoBackupPrefix: "TAC-QUAL-auto-",
  legacyVersion: "0.1",
});
