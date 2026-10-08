import type { ReactNode } from "react";

import { useT } from "@/lib/i18n";

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-canvas text-ink-soft">{icon}</div>
      <h3 className="text-base font-medium text-ink">{t(title)}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-ink-mute">{t(body)}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
