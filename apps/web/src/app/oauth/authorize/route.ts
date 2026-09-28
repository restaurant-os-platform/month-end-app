import { NextResponse } from "next/server";

// Keep the existing Supabase Site URL (including recovery/invitation defaults).
// Only the OAuth authorization request is forwarded to the platform.
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  const source = new URL(request.url);
  const id = source.searchParams.get("authorization_id");
  const configured = process.env.RESTAURANT_OS_URL;
  if (!id || id.length > 256 || !configured) {
    return new Response("Shared login is not available.", { status: 400, headers });
  }
  let destination: URL;
  try {
    destination = new URL("/oauth/authorize", configured);
    const local = process.env.NODE_ENV === "development" && destination.protocol === "http:" && ["localhost", "127.0.0.1"].includes(destination.hostname);
    if ((!local && destination.protocol !== "https:") || destination.username || destination.password || (destination.origin === source.origin && destination.pathname === source.pathname)) throw new Error("Invalid platform origin");
  } catch {
    return new Response("Shared login is not configured.", { status: 503, headers });
  }
  destination.searchParams.set("authorization_id", id);
  return NextResponse.redirect(destination, { status: 307, headers });
}
