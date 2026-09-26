"use client";

import CoreSecuritySettings from "@core/components/SecuritySettings";
import {
  changePassword,
  disableEncryption,
  enableEncryption,
  newRecoveryKey,
  removePin,
  saveAutoLock,
  savePin,
} from "@/app/lock/actions";

export default function SecuritySettings({
  mode,
  autoLockMinutes,
}: {
  mode: "none" | "pin" | "password";
  autoLockMinutes: number;
}) {
  return (
    <CoreSecuritySettings
      mode={mode}
      autoLockMinutes={autoLockMinutes}
      productName="TAC-QUAL"
      actions={{ savePin, removePin, enableEncryption, changePassword, newRecoveryKey, disableEncryption, saveAutoLock }}
    />
  );
}
