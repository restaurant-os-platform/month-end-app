import { cookies } from "next/headers";
import { sharedLoginEnabled } from "./config";
import { platformRestaurant } from "./context";

/** Call only after native membership validation. This cookie is a preference, not authority. */
export async function rememberPlatformRestaurant(nativeId: string) {
  if (!sharedLoginEnabled()) return;
  const id = platformRestaurant(nativeId);
  if (id) (await cookies()).set("restaurant-os-restaurant", id, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 2592000,
  });
}
