"use client";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { Skeleton } from "./Skeleton";
import { cn } from "./cn";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  className?: string;
  /** Mobile: first column becomes the card title; others render as label/value rows. */
  hideOnMobile?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
  caption: string;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, loading, empty, caption }: Props<T>) {
  const t = useT();
  if (loading) {
    return (
      <div className="space-y-3 p-6" aria-busy="true" aria-label={t("Loading")}>
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }
  if (rows.length === 0) return <>{empty}</>;

  const [first, ...rest] = columns;
  const mobileRest = rest.filter((c) => !c.hideOnMobile);

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{t(caption)}</caption>
          <thead>
            <tr className="text-left text-[13px] font-normal text-ink-mute">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn("px-6 py-3", c.align === "right" && "text-right")}>{t(c.header)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={cn("transition-colors hover:bg-canvas/70", onRowClick && "cursor-pointer")}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-6 py-4 align-middle text-ink", c.align === "right" && "text-right", c.className)}>{c.cell(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line/70 md:hidden">
        {rows.map((r) => (
          <li
            key={rowKey(r)}
            onClick={onRowClick ? () => onRowClick(r) : undefined}
            className={cn("space-y-3 p-4", onRowClick && "cursor-pointer active:bg-canvas")}
          >
            <div className="font-medium text-ink">{first.cell(r)}</div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {mobileRest.map((c) => (
                <div key={c.key} className="min-w-0">
                  <dt className="text-xs text-ink-mute">{t(c.header)}</dt>
                  <dd className="mt-0.5 text-ink">{c.cell(r)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
