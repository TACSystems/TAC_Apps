"use client";

import CoreTargetTypeEditor from "@core/components/TargetTypeEditor";
import { saveTargetTypeAction } from "@/app/targets/actions";

type Props = Omit<React.ComponentProps<typeof CoreTargetTypeEditor>, "saveAction">;

export default function TargetTypeEditor(props: Props) {
  return <CoreTargetTypeEditor {...props} saveAction={saveTargetTypeAction} />;
}
