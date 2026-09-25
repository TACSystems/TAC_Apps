export type AppProfile = {
  productName: string;
  dbFile: string;
  requiredTables: string[];
  autoBackupPrefix: string;
  legacyVersion: string;
};

declare global {
  var __tacAppProfile: AppProfile | undefined;
}

export function registerAppProfile(profile: AppProfile) {
  global.__tacAppProfile = profile;
}

export function appProfile(): AppProfile {
  if (!global.__tacAppProfile) throw new Error("App profile is not registered.");
  return global.__tacAppProfile;
}
