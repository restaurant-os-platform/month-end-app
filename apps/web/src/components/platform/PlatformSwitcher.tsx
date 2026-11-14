"use client";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { parseNavigationData, platformLaunchUrl, type PlatformNavigationConfig, type PlatformNavigationData, isSwitcherMessage } from "@/lib/restaurant-os/navigation";

export default function PlatformSwitcher({ config, frameRef }: { config?: PlatformNavigationConfig | null; frameRef?: RefObject<HTMLIFrameElement | null> }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PlatformNavigationData | null>(null);
  const [error, setError] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pending = useRef<AbortController | null>(null);
  const id = useId();
  const [anchor, setAnchor] = useState({ left: 16, top: 70 });
  const frameTrigger = useRef<HTMLElement | null>(null);
  const latestToggle = useRef<() => void>(() => {});
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (!frameRef?.current || !config || !isSwitcherMessage(event, frameRef.current.contentWindow, window.location.origin)) return;
      if (event.data?.type === "endvora:dismiss-switcher") { setOpen(false); pending.current?.abort(); }
      if (event.data?.type !== "endvora:open-switcher") return;
      const button = frameRef.current.contentDocument?.querySelector<HTMLElement>("[data-endvora-switcher][data-active]");
      if (!button) return;
      frameTrigger.current = button;
      const rect = button.getBoundingClientRect();
      const frame = frameRef.current.getBoundingClientRect();
      setAnchor({ left: Math.max(16, Math.min(frame.left + rect.left, window.innerWidth - 316)), top: Math.max(16, Math.min(frame.top + rect.bottom + 8, window.innerHeight - 430)) });
      latestToggle.current();
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [frameRef, config]);
  useEffect(() => {
    frameTrigger.current?.setAttribute("aria-expanded", String(open));
    if (!open) return;
    root.current?.querySelector<HTMLElement>("select, a[href], button")?.focus();
  }, [open, data]);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) { setOpen(false); pending.current?.abort(); }
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !root.current?.querySelector(".me-switcher-panel") || !root.current?.contains(document.activeElement)) return;
      event.stopPropagation(); event.preventDefault(); setOpen(false); pending.current?.abort(); const target = frameTrigger.current;
      if (target?.getClientRects().length) target.focus(); else if (frameRef?.current) frameRef.current.contentDocument?.getElementById("mobile-nav-more")?.focus(); else trigger.current?.focus();
    }
    document.addEventListener("pointerdown", outside);
    root.current?.addEventListener("keydown", escape);
    const element = root.current;
    return () => { document.removeEventListener("pointerdown", outside); element?.removeEventListener("keydown", escape); pending.current?.abort(); };
  }, [frameRef]);
  const home = config ? new URL("/workspace", config.origin).toString() : "";
  async function toggle() {
    if (!config) return;
    pending.current?.abort();
    if (open) { setOpen(false); return; }
    setOpen(true); setData(null); setError(false);
    // Cookies remain on the canonical platform origin. No cross-origin credential forwarding.
    if (window.location.origin !== config!.origin) { setError(true); return; }
    const controller = new AbortController(); pending.current = controller;
    const url = new URL("/api/platform-navigation", config!.origin);
    url.searchParams.set("monthEndOrganization", config!.nativeRestaurantId);
    try {
      const response = await fetch(url, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Navigation unavailable");
      const result = parseNavigationData(await response.json());
      if (!controller.signal.aborted) setData(result);
    } catch { if (!controller.signal.aborted) setError(true); }
  }
  useEffect(() => { latestToggle.current = toggle; });
  const selected = data?.restaurants.find(restaurant => restaurant.id === data.selectedId);
  if (!config) return null;
  return <div className="me-platform-switcher" ref={root}>
    {!frameRef && <button ref={trigger} type="button" className="me-switcher-trigger" aria-label="Switch apps and restaurant" title="Switch apps and restaurant" aria-expanded={open} aria-controls={id} onClick={toggle}>
      <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden="true"><rect x="2" y="2" width="6" height="6" rx="1.5"/><rect x="12" y="2" width="6" height="6" rx="1.5"/><rect x="2" y="12" width="6" height="6" rx="1.5"/><rect x="12" y="12" width="6" height="6" rx="1.5"/></svg>
    </button>}
    {open && <div role="navigation" id={id} className="me-switcher-panel" style={frameRef ? {position:"fixed", left:anchor.left, top:anchor.top} : undefined} aria-label="Apps and restaurant">
      <p className="me-switcher-label">Workspace</p>
      {!data && !error && <p role="status">Loading your apps…</p>}
      {error && <p role="status">Open Endvora to choose your restaurant and apps.</p>}
      {data && <>
        <p className="me-switcher-restaurant">{selected?.name ?? "Choose a restaurant"}</p>
        {data.restaurants.length > 1 && <form method="get" action={home} className="me-switcher-form">
          <label htmlFor={`${id}-restaurant`}>Restaurant</label>
          <select id={`${id}-restaurant`} name="restaurant" defaultValue={selected?.id ?? ""} required><option value="" disabled>Choose a restaurant</option>{data.restaurants.map(restaurant => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}</select>
          <button type="submit">Open workspace</button>
        </form>}
        <div className="me-switcher-apps"><p className="me-switcher-label">Your apps</p>
          {selected ? selected.modules.map(module => module === "month-end" ? <span key={module} className="me-switcher-current" aria-current="true">Month’s End <span aria-hidden="true">✓</span></span> : <a key={module} href={platformLaunchUrl(config.origin, selected, module)!}>Tip Pool <span aria-hidden="true">↗</span></a>) : <p>Select your restaurant in Endvora to see its apps.</p>}
        </div>
      </>}
      <a className="me-switcher-home" href={home}>Endvora Home <span aria-hidden="true">→</span></a>
    </div>}
  </div>;
}
