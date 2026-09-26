"use client";

import CoreChecklist from "@core/components/Checklist";
import { addItem, deleteItem, deleteList, moveItem, renameList, resetList, toggleItem } from "@/app/checklist/actions";

type Props = Omit<React.ComponentProps<typeof CoreChecklist>, "actions">;

export default function Checklist(props: Props) {
  return (
    <CoreChecklist
      {...props}
      actions={{ addItem, deleteItem, deleteList, moveItem, renameList, resetList, toggleItem }}
    />
  );
}
