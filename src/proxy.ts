import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

const LAUNCH_COOKIE = "taclog_launch";

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function proxy(request: NextRequest) {
  const secret = process.env.TAC_LOG_LAUNCH_SECRET;
  if (!secret) return NextResponse.next();
  const port = process.env.PORT;
  const host = request.headers.get("host") ?? "";
  if (host !== `127.0.0.1:${port}`) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const cookie = request.cookies.get(LAUNCH_COOKIE)?.value ?? "";
  if (!cookie || !same(cookie, secret)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== `http://127.0.0.1:${port}`) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const res = NextResponse.next();
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-src 'self'",
      "object-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; ")
  );
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export const config = {
  matcher: "/:path*",
};
