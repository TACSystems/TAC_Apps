"use client";

import CoreBackupSettings from "@core/components/BackupSettings";
import { backupNow, clearBackupPassword, saveAutoBackupSettings, setBackupPassword } from "@/app/settings/actions";

type Props = Omit<React.ComponentProps<typeof CoreBackupSettings>, "actions" | "productName" | "backupExt">;

export default function BackupSettings(props: Props) {
  return (
    <CoreBackupSettings
      {...props}
      productName="TAC-QUAL"
      backupExt="tqbak"
      actions={{ setBackupPassword, clearBackupPassword, saveAutoBackupSettings, backupNow }}
    />
  );
}
