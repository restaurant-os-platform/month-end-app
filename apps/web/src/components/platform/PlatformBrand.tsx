import Link from "next/link";
import { sharedLoginEnabled } from "@/lib/restaurant-os/config";
import { platformNavigationConfig } from "@/lib/restaurant-os/navigation";
import PlatformSwitcher from "./PlatformSwitcher";
export function PlatformBrand({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
  const config = platformNavigationConfig(sharedLoginEnabled(), process.env.RESTAURANT_OS_URL, organizationId);
  return <div className="me-brand-row"><Link className="legacy-brand" href="/app"><strong>Month&apos;s End</strong><span>{organizationName}</span></Link><PlatformSwitcher config={config} /></div>;
}
