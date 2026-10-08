"use client";
import { useState } from "react";
import type { PayMode } from "@/data/types";
import { workerById } from "@/data/workers";
import { formatINR } from "@/lib/format";
import { useStore, type PayrollRow } from "@/lib/store";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Segmented } from "../ui/Segmented";
import { useT, tn } from "@/lib/i18n";
import { useToast } from "../ui/Toast";

export function MarkPaidModal({ rows, onClose }: { rows: PayrollRow[]; onClose: () => void }) {
  const { markPaid } = useStore();
  const toast = useToast();
  const t = useT();
  const [mode, setMode] = useState<PayMode>("UPI");
  const total = rows.reduce((s, r) => s + r.amount, 0);

  const confirm = () => {
    markPaid(rows, mode);
    toast(t("{amount} marked as paid to {count} via {mode}", { amount: formatINR(total), count: tn(t, rows.length, "{n} worker", "{n} workers"), mode: t(mode) }));
    onClose();
  };

  return (
    <Modal
      open={rows.length > 0} onClose={onClose} title="Mark as Paid"
      footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={confirm}>{t("Confirm {amount}", { amount: formatINR(total) })}</Button></>}
    >
      <p className="text-sm text-ink-soft">{t(rows.length > 1 ? "Record that you have paid the following workers. This only updates your records." : "Record that you have paid the following worker. This only updates your records.")}</p>
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium">{t(workerById(r.workerId).name)}</span>
              <span className="block text-xs text-ink-mute tabular-nums">{t(r.job.title)} · {tn(t, r.days, "{n} day", "{n} days")}</span>
            </span>
            <span className="font-medium tabular-nums">{formatINR(r.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <div className="mb-2 text-sm font-medium">{t("Paid via")}</div>
        <Segmented<PayMode> label="Payment mode" value={mode} onChange={setMode} options={[{ id: "UPI", label: "UPI" }, { id: "Cash", label: "Cash" }, { id: "Bank", label: "Bank" }]} />
      </div>
    </Modal>
  );
}
