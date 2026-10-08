"use client";
import { useEffect } from "react";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useToast } from "../ui/Toast";

/** Tells the user once when loading or saving their data failed. */
export function SyncNotice() {
  const { notice } = useStore();
  const toast = useToast();
  const t = useT();
  useEffect(() => { if (notice) toast(t(notice.message)); }, [notice, toast, t]);
  return null;
}
