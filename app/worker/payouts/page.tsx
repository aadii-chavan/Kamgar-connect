"use client";
import { BadgeCheck, BellRing, CheckCircle2, Download, Receipt, Wallet, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { contractorOf, currentWorkerId } from "@/data/jobs";
import { downloadCsv, downloadFile } from "@/lib/download";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip, PayChip } from "@/components/ui/Chip";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Money } from "@/components/ui/Money";
import { PageHeader, StatCard } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SkillIcon } from "@/components/ui/SkillIcon";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatINR, formatShort, rateLabel } from "@/lib/format";
import { tn, useT } from "@/lib/i18n";
import { useStore, type PayStatus, type PayrollRow } from "@/lib/store";

type F = "all" | PayStatus;

export default function WorkerPayoutsPage() {
  const t = useT();
  const toast = useToast();
  const { payroll, confirmPayment, remindPayment, account } = useStore();
  const [f, setF] = useState<F>("all");
  const [reminded, setReminded] = useState<string[]>([]);

  const mine = useMemo(() => {
    const order = { overdue: 0, pending: 1, paid: 2 } as const;
    return payroll.filter((r) => r.workerId === currentWorkerId)
      .sort((a, b) => order[a.status] - order[b.status] || (b.paidOn ?? "").localeCompare(a.paidOn ?? "") || b.job.startDate.localeCompare(a.job.startDate));
  }, [payroll]);

  const sum = (rows: PayrollRow[]) => rows.reduce((s, r) => s + r.amount, 0);
  const paid = mine.filter((r) => r.status === "paid");
  const owed = mine.filter((r) => r.status !== "paid");
  const total = sum(mine);
  const pct = total === 0 ? 0 : Math.round((sum(paid) / total) * 100);
  const last = [...paid].sort((a, b) => (b.paidOn ?? "").localeCompare(a.paidOn ?? ""))[0];
  const count = (s: PayStatus) => mine.filter((r) => r.status === s).length;
  const rows = mine.filter((r) => f === "all" || r.status === f);

  const remind = (r: PayrollRow) => {
    setReminded((p) => [...p, r.key]);
    remindPayment(r.key);
    toast(t("Reminder sent to {name}", { name: t(contractorOf(r.job.contractorId).name) }));
  };
  const statement = () => downloadCsv("kamgar-payouts.csv", [
    ["Job", "Contractor", "Start", "End", "Days worked", "Amount (INR)", "Status", "Paid on", "Mode"],
    ...mine.map((r) => [r.job.title, contractorOf(r.job.contractorId).company, r.job.startDate, r.job.endDate, r.days, r.amount, r.status, r.paidOn ?? "", r.mode ?? ""]),
  ]);
  const receipt = (r: PayrollRow) => downloadFile(`receipt-${r.job.title.toLowerCase().replace(/\W+/g, "-")}.txt`, [
    "PAYMENT RECEIPT", "",
    `Worker:      ${account?.name ?? ""}`, `Paid by:     ${contractorOf(r.job.contractorId).company}`, `Job:         ${r.job.title}`,
    `Period:      ${r.job.startDate} to ${r.job.endDate}`, `Days worked: ${r.days}`, `Amount:      INR ${r.amount}`, `Paid on:     ${r.paidOn ?? ""}`, `Mode:        ${r.mode ?? ""}`,
    `Confirmed by worker: ${r.confirmed ? "yes" : "no"}`,
  ].join("\n"));

  const columns: Column<PayrollRow>[] = [
    { key: "job", header: "Job", cell: (r) => (
      <span className="flex items-center gap-3"><SkillIcon skill={r.job.skill} size={44} /><span><span className="block font-medium">{t(r.job.title)}</span><span className="text-xs font-normal text-ink-mute">{t(r.job.area)} · {formatShort(r.job.startDate)} – {formatShort(r.job.endDate)}</span></span></span>
    ) },
    { key: "days", header: "Days worked", cell: (r) => <span className="tabular-nums">{r.days}</span> },
    { key: "rate", header: "Rate", cell: (r) => <span className="tabular-nums">{rateLabel(r.job)}</span> },
    { key: "amt", header: "Amount", align: "right", cell: (r) => <span className="text-lg font-medium tabular-nums">{formatINR(r.amount)}</span> },
    { key: "st", header: "Status", cell: (r) => <PayChip status={r.status} /> },
    { key: "when", header: "Paid on", cell: (r) => r.status === "paid"
      ? <span className="whitespace-nowrap tabular-nums text-ink-soft">{formatDate(r.paidOn!)} · {t(r.mode!)}</span>
      : <span className="text-ink-mute">{t("Due from {name}", { name: t(contractorOf(r.job.contractorId).company) })}</span> },
    { key: "act", header: "", align: "right", cell: (r) => r.status === "paid"
      ? (
        <span className="flex flex-wrap items-center justify-end gap-2">
          {r.confirmed
            ? <Chip tone="green"><BadgeCheck size={12} className="mr-0.5 inline" />{t("Receipt confirmed")}</Chip>
            : <Button size="sm" variant="primary" icon={<BadgeCheck size={16} />} onClick={() => { confirmPayment(r.key); toast(t("Thanks. {name} can now see you received it.", { name: t(contractorOf(r.job.contractorId).company) })); }}>{t("Confirm received")}</Button>}
          <Button size="sm" variant="dark" icon={<Receipt size={16} />} onClick={() => receipt(r)}>{t("Receipt")}</Button>
        </span>
      )
      : reminded.includes(r.key)
        ? <Chip tone="green">{t("Reminder sent")}</Chip>
        : <Button size="sm" variant="primary" icon={<BellRing size={16} />} onClick={() => remind(r)}>{t("Ask for payment")}</Button> },
  ];

  return (
    <div>
      <PageHeader
        title="Payouts" subtitle="Everything you have earned and been paid"
        action={<Button variant="light" icon={<Download size={18} />} onClick={statement}>{t("Download statement")}</Button>}
      />

      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Earned" icon={<Wallet size={22} strokeWidth={1.6} />} value={<Money value={total} />} hint={tn(t, mine.length, "from {n} job", "from {n} jobs")} />
        <StatCard label="Received" icon={<CheckCircle2 size={22} strokeWidth={1.6} />} tone="green" value={<Money value={sum(paid)} />} hint={<span className="text-ok-fg"><span aria-hidden>↗</span> {tn(t, paid.length, "{n} payment", "{n} payments")}</span>} />
        <StatCard label="Yet to Receive" icon={<Clock size={22} strokeWidth={1.6} />} tone="amber" value={<Money value={sum(owed)} />} hint={owed.length ? t("Due from {name}", { name: [...new Set(owed.map((r) => contractorOf(r.job.contractorId).company))].map((c) => t(c)).join(", ") }) : t("You are all paid up")} />
        <StatCard label="Last Payment" icon={<Receipt size={22} strokeWidth={1.6} />} value={last ? <Money value={last.amount} /> : "—"} hint={last ? `${formatDate(last.paidOn!)} · ${t(last.mode!)}` : t("No payments yet")} />
      </div>

      <Card className="mt-5 p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-normal tracking-tight text-ink-soft">{t("Payout progress")}</h2>
            <p className="mt-1 text-sm text-ink-mute">{t("{received} of {total} received", { received: formatINR(sum(paid)), total: formatINR(total) })}</p>
          </div>
          <div className="text-[44px] font-normal leading-none tracking-tight tabular-nums md:text-[56px]">{pct}<span className="opacity-40">%</span></div>
        </div>
        <ProgressBar value={sum(paid)} max={Math.max(total, 1)} className="mt-5 !h-3" />
      </Card>

      <Card className="mt-5 overflow-hidden">
        <CardHeader title="Payment history" subtitle={tn(t, mine.length, "{n} payment", "{n} payments")} />
        <div className="px-4 md:px-6">
          <Tabs<F> label="Payment status" value={f} onChange={setF} items={[
            { id: "all", label: "All", count: mine.length }, { id: "pending", label: "Pending", count: count("pending") },
            { id: "overdue", label: "Overdue", count: count("overdue") }, { id: "paid", label: "Paid", count: count("paid") },
          ]} />
        </div>
        <DataTable caption="Payment history" columns={columns} rows={rows} rowKey={(r) => r.key}
          empty={<EmptyState icon={<Wallet size={24} />} title="No payments here" body="Nothing matches this filter." />} />
      </Card>
    </div>
  );
}
