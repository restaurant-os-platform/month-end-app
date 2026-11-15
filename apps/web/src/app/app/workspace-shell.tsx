"use client";

import { useEffect, useRef } from "react";
import PlatformSwitcher from "@/components/platform/PlatformSwitcher";
import type { PlatformNavigationConfig } from "@/lib/restaurant-os/navigation";
import { SAVED_THEMES } from "@/lib/themes";
import { modulePath } from "@/lib/module-path";

type WorkspaceShellProps = {
  navigation?: PlatformNavigationConfig | null;
  email: string;
  iframeQuery: string;
  initialPath: string;
  organizationName: string;
  title: string;
};

type RouteMessage = {
  type?: string;
  theme?: string;
  path?: string;
  title?: string;
  replace?: boolean;
};

export function WorkspaceShell({ email, iframeQuery, initialPath, organizationName, title, navigation }: WorkspaceShellProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const currentPathRef = useRef(initialPath);

  useEffect(() => {
    // A cached public frame can finish loading before React hydrates its onLoad.
    frameRef.current?.contentDocument?.querySelectorAll<HTMLElement>("[data-endvora-switcher]").forEach(button => { button.hidden = !navigation; });
  }, [navigation]);

  useEffect(() => {
    document.title = `${title} · Month End`;

    function sendCurrentRoute() {
      const path = `${window.location.pathname}${window.location.search}`.replace(/^\/month-end(?=\/)/, "");
      if (!path.startsWith("/app/")) return;
      currentPathRef.current = path;
      frameRef.current?.contentWindow?.postMessage({ type: "month-end:apply-route", path }, window.location.origin);
    }

    function receiveRoute(event: MessageEvent<RouteMessage>) {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "month-end:theme-change" && SAVED_THEMES.some(theme => theme === event.data.theme)) document.documentElement.dataset.theme = event.data.theme;
      if (event.data?.type !== "month-end:route-change" || !event.data.path?.startsWith("/app/")) return;
      const nextPath = event.data.path;
      if (nextPath !== currentPathRef.current) {
        window.history[event.data.replace ? "replaceState" : "pushState"]({ monthEndRoute: true }, "", modulePath(nextPath));
        currentPathRef.current = nextPath;
      }
      if (event.data.title) document.title = `${event.data.title} · Month End`;
    }

    window.addEventListener("message", receiveRoute);
    window.addEventListener("popstate", sendCurrentRoute);
    return () => {
      window.removeEventListener("message", receiveRoute);
      window.removeEventListener("popstate", sendCurrentRoute);
    };
  }, [title]);

  return (
    <main className="legacy-host">
      <PlatformSwitcher config={navigation} frameRef={frameRef} />
      <iframe
        allow="microphone"
        className="legacy-frame"
        onLoad={() => {
          frameRef.current?.contentDocument?.querySelectorAll<HTMLElement>("[data-endvora-switcher]").forEach(button => { button.hidden = !navigation; });
          frameRef.current?.contentWindow?.postMessage({ type: "month-end:apply-route", path: initialPath }, window.location.origin);
        }}
        ref={frameRef}
        src={`/month-end/legacy/index.html?${iframeQuery}`}
        title={`${organizationName} inventory workspace for ${email}`}
      />
    </main>
  );
}
