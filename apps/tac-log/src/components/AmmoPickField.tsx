"use client";

import { useState } from "react";
import AmmoPick from "@/components/AmmoPick";
import type { PickOpt } from "@/lib/ammo-pick";

export default function AmmoPickField({
  options,
  caliber,
  defaultValue,
  name = "ammo_pick",
  className = "",
}: {
  options: PickOpt[];
  caliber: string | null | undefined;
  defaultValue: string;
  name?: string;
  className?: string;
}) {
  const [v, setV] = useState(defaultValue);
  return <AmmoPick name={name} options={options} caliber={caliber} value={v} onChange={setV} className={className} />;
}
