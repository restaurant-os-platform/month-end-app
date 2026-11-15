import { modulePath } from "@/lib/module-path";
import { platformHomeUrl, sharedLoginEnabled } from "./config";

export function accountSignInDestination() {
  const home = sharedLoginEnabled() ? platformHomeUrl() : null;
  return home ? new URL("/login", home).toString() : "/login";
}
export function accountSignInHref() {
  const destination = accountSignInDestination();
  return destination.startsWith("/") ? modulePath(destination) : destination;
}
