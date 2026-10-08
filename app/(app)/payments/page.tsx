"use client";
import { AlertCircle, CheckCircle2, Users, Wallet } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { formatINR, formatShort } from "@/lib/format";
import { useT, tn } from "@/lib/i18n";
import { useStore, type PayStatus, type PayrollRow } from "@/lib/store";
import { MarkPaidModal } from "@/components/shared/MarkPaidModal";
import { WorkerCell } from "@/components/shared/ApplicantParts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PayChip } from "@/components/ui/Chip";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, StatCard } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";

type F = "all" | PayStatus;

function Inner() {
  const t = useT();
  const { payroll } = useStore();
  const p = useSearchParams().get("status");
  const [f, setF] = useState<F>(p === "pending" || p === "paid" || p === "overdue" ? p : "all");
  const [paying, setPaying] = useState<PayrollRow[]>([]);

  const sum = (s: PayStatus[]) => payroll.filter((r) => s.includes(r.status)).reduce((a, r) => a + r.amount, 0);
  const count = (s: PayStatus) => payroll.filter((r) => r.status === s).length;
  const rows = useMemo(() => payroll.filter((r) => f === "all" || r.status === f), [payroll, f]);

  const columns: Column<PayrollRow>[] = [
    { key: "w", header: "Worker", cell: (r) => <WorkerCell workerId={r.workerId} /> },
    { key: "job", header: "Job", cell: (r) => `${t(r.job.title)}, ${t(r.job.area)}` },
    { key: "days", header: "Days", cell: (r) => <span className="tabular-nums">{r.days}</span> },
    { key: "amt", header: "Amount", align: "right", cell: (r) => <span className="font-medium tabular-nums">{formatINR(r.amount)}</span> },
    { key: "st", header: "Status", cell: (r) => <PayChip status={r.status} /> },
    { key: "act", header: "", align: "right", cell: (r) => r.status === "paid" ? <span className="flex flex-col items-end gap-1 text-xs text-ink-mute"><span>{t(r.mode!)} · {formatShort(r.paidOn!)}</span>{r.confirmed ? <span className="text-ok-fg">✓ {t("Worker confirmed")}</span> : <span>{t("Waiting for worker to confirm")}</span>}</span> : <Button size="sm" onClick={() => setPaying([r])}>{t("Mark as Paid")}</Button> },
  ];

  return (
    <div>
      <PageHeader eyebrow="On site" title="Payments" subtitle="What you owe and what you have paid" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard tone="orange" icon={<Wallet size={20} />} label="Pending payouts" value={formatINR(sum(["pending", "overdue"]))} />
        <StatCard tone="red" icon={<AlertCircle size={20} />} label="Overdue" value={formatINR(sum(["overdue"]))} hint={tn(t, count("overdue"), "{n} worker", "{n} workers")} />
        <StatCard tone="green" icon={<CheckCircle2 size={20} />} label="Paid" value={formatINR(sum(["paid"]))} hint={tn(t, count("paid"), "{n} payment", "{n} payments")} />
        <StatCard tone="blue" icon={<Users size={20} />} label="Workers to pay" value={String(count("pending") + count("overdue"))} />
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="px-4 pt-2 md:px-6">
          <Tabs<F> label="Payment status" value={f} onChange={setF} items={[
            { id: "all", label: "All", count: payroll.length }, { id: "pending", label: "Pending", count: count("pending") },
            { id: "overdue", label: "Overdue", count: count("overdue") }, { id: "paid", label: "Paid", count: count("paid") },
          ]} />
        </div>
        <DataTable caption="Payments" columns={columns} rows={rows} rowKey={(r) => r.key}
          empty={<EmptyState icon={<Wallet size={22} />} title="No payments here" body="Nothing matches this filter." />} />
      </Card>
      <MarkPaidModal rows={paying} onClose={() => setPaying([])} />
    </div>
  );
}
export default function PaymentsPage() { return <Suspense><Inner /></Suspense>; }
