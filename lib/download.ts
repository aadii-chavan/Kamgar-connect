/** Save text to the user's device as a file. */
export function downloadFile(name: string, content: string, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Save rows as a CSV file that opens in Excel. */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  downloadFile(name, "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n"), "text/csv");
}
