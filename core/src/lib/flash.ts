import { cookies } from "next/headers";

export async function flash(text: string, tone: "ok" | "error" | "info" = "ok") {
  try {
    (await cookies()).set("tac_flash", JSON.stringify({ text: text.slice(0, 300), tone }), {
      path: "/",
      maxAge: 30,
      sameSite: "strict",
      httpOnly: false,
    });
  } catch {}
}
