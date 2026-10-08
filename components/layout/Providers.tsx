"use client";
import type { ReactNode } from "react";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "../ui/Toast";
import { SyncNotice } from "./SyncNotice";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider><SyncNotice />{children}</ToastProvider>
    </StoreProvider>
  );
}
