"use client";
import { useEffect, useRef } from "react";
export function LogoutSubmit({ action }: { action: () => Promise<void> }) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { form.current?.requestSubmit(); }, []);
  return <form ref={form} action={action}><button type="submit">Continue signing out</button></form>;
}
