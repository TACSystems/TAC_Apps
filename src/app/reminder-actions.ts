"use server";

import { revalidatePath } from "next/cache";
import { setRemindersDismissed } from "@/lib/reminders";

export async function dismissReminders() {
  setRemindersDismissed(true);
  revalidatePath("/", "layout");
}
