"use client";
import { useEffect, useRef } from "react";
import { useNotificationText } from "@/lib/live";
import { useStore } from "@/lib/store";
import { useToast } from "../ui/Toast";

/** Pops a toast the moment something happens for the signed-in role, including changes made in another tab. */
export function LiveNotifier() {
  const { notifications, session, profileReady } = useStore();
  const text = useNotificationText();
  const toast = useToast();
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!profileReady) return;
    if (seen.current === null) { seen.current = new Set(notifications.map((n) => n.id)); return; }
    const fresh = notifications.filter((n) => !seen.current!.has(n.id));
    fresh.forEach((n) => seen.current!.add(n.id));
    if (!session) return;
    fresh.filter((n) => !n.read).slice(0, 2).forEach((n) => toast(text(n)));
  }, [notifications, session, profileReady, toast, text]);
  return null;
}
