import { headers } from "next/headers";
import { safeNext } from "./policy";

export async function requestDestination() {
  return safeNext((await headers()).get("x-month-end-return-path"), "/app");
}
