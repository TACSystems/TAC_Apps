"use server";

import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createAmmoPurchase(formData: FormData) {
  const db = getDb();
  db.prepare(
    `insert into ammo_purchases (id, manufacturer, ammo_type, caliber, grain, lot_number, quantity, date_purchased, price)
     values (@id, @manufacturer, @ammo_type, @caliber, @grain, @lot_number, @quantity, @date_purchased, @price)`
  ).run({
    id: randomUUID(),
    manufacturer: (formData.get("manufacturer") as string) || null,
    ammo_type: (formData.get("ammo_type") as string) || null,
    caliber: String(formData.get("caliber")),
    grain: formData.get("grain") ? Number(formData.get("grain")) : null,
    lot_number: (formData.get("lot_number") as string) || null,
    quantity: Number(formData.get("quantity") || 0),
    date_purchased: (formData.get("date_purchased") as string) || null,
    price: formData.get("price") ? Number(formData.get("price")) : null,
  });

  revalidatePath("/ammo");
  revalidatePath("/");
  redirect("/ammo");
}

export async function setAmmoGoal(formData: FormData) {
  const db = getDb();
  db.prepare(
    `insert into ammo_goals (id, caliber, goal_quantity)
     values (@id, @caliber, @goal_quantity)
     on conflict(caliber) do update set goal_quantity = excluded.goal_quantity`
  ).run({
    id: randomUUID(),
    caliber: String(formData.get("caliber")),
    goal_quantity: Number(formData.get("goal_quantity") || 0),
  });

  revalidatePath("/ammo");
  redirect("/ammo");
}

export async function deleteAmmoPurchase(id: string) {
  const db = getDb();
  db.prepare(`delete from ammo_purchases where id = ?`).run(id);
  revalidatePath("/ammo");
  redirect("/ammo");
}

export async function deleteAmmoGoal(caliber: string) {
  getDb().prepare(`delete from ammo_goals where caliber = ?`).run(caliber);
  revalidatePath("/ammo");
  revalidatePath("/");
  redirect("/ammo");
}

export async function updateAmmoPurchase(id: string, formData: FormData) {
  getDb()
    .prepare(
      `update ammo_purchases set manufacturer = @manufacturer, ammo_type = @ammo_type, caliber = @caliber,
         grain = @grain, lot_number = @lot_number, quantity = @quantity, date_purchased = @date_purchased,
         price = @price
       where id = @id`
    )
    .run({
      id,
      manufacturer: (formData.get("manufacturer") as string) || null,
      ammo_type: (formData.get("ammo_type") as string) || null,
      caliber: String(formData.get("caliber")),
      grain: formData.get("grain") ? Number(formData.get("grain")) : null,
      lot_number: (formData.get("lot_number") as string) || null,
      quantity: Number(formData.get("quantity") || 0),
      date_purchased: (formData.get("date_purchased") as string) || null,
      price: formData.get("price") ? Number(formData.get("price")) : null,
    });
  revalidatePath("/ammo");
  revalidatePath("/");
  redirect("/ammo");
}
