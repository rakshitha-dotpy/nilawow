import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AppShell from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCustomers, type Customer } from "@/services/customers";
import { getRecordsByDate, type PurchaseRecord } from "@/services/records";

/** Local calendar day as YYYY-MM-DD (not UTC). */
const ymdLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const shiftYmd = (ymd: string, deltaDays: number) => {
  const base = new Date(`${ymd}T12:00:00`);
  base.setDate(base.getDate() + deltaDays);
  return ymdLocal(base);
};

/** Parse YYYY-MM-DD at local noon (stable across timezones for display). */
const parseYmdLocal = (ymd: string) => new Date(`${ymd}T12:00:00`);

/**
 * Amount for PDF/UI: plain digits + rupee sign — avoids locale narrow spaces
 * that break jsPDF / autotable (e.g. "₹ 1 2 7 2").
 */
const formatInrPlain = (n: number | null | undefined): string => {
  if (n == null || Number.isNaN(n)) return "—";
  const rounded = Math.round(n * 100) / 100;
  const s =
    Math.abs(rounded - Math.round(rounded)) < 1e-9
      ? String(Math.round(rounded))
      : rounded.toFixed(2);
  return `\u20B9${s}`;
};

type Row = PurchaseRecord & { customer?: Customer | null };

const DailySummary = () => {
  const [date, setDate] = useState(() => ymdLocal(new Date()));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [records, setRecords] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getCustomers();
        if (!cancelled) setCustomers(rows);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[daily-summary] getCustomers failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const customerMap = useMemo(
    () => new Map(customers.filter((c) => c.id).map((c) => [c.id as string, c])),
    [customers],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const rows = await getRecordsByDate(date);
        if (cancelled) return;
        setRecords(
          rows.map((r) => ({
            ...r,
            customer: customerMap.get(r.customerId) ?? null,
          })),
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[daily-summary] getRecordsByDate failed", e);
        if (!cancelled) {
          setRecords([]);
          setLoadError("Could not load records for this day.");
          toast.error("Failed to load daily records");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerMap, date]);

  const total = records.reduce((s, r) => s + (r.amount ?? 0), 0);

  const openNativeDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      /* showPicker may throw in some browsers */
    }
    el.click();
  };

  const handleDownloadPdf = () => {
    try {
      if (records.length === 0) {
        toast.error("No records for this day");
        return;
      }

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginX = 48;
      const tableWidth = pageW - marginX * 2;
      let y = 52;

      // --- Header block ---
      doc.setFillColor(12, 12, 12);
      doc.rect(0, 0, pageW, 112, "F");
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.5);
      doc.line(marginX, 108, pageW - marginX, 108);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(245, 245, 245);
      doc.text("NILA WOW", marginX, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(180, 180, 180);
      doc.text("Daily Summary", marginX, y + 20);

      const prettyDate = format(parseYmdLocal(date), "EEEE, dd MMMM yyyy");
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text(prettyDate, pageW - marginX, y + 6, { align: "right" });

      y = 124;

      // --- Totals strip ---
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(marginX, y, tableWidth, 44, 6, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(22, 22, 22);
      doc.text(`Records: ${records.length}`, marginX + 16, y + 28);
      doc.text(`Total: ${formatInrPlain(total)}`, pageW - marginX - 16, y + 28, {
        align: "right",
      });

      y += 56;

      // --- Table: all body cells are plain strings; no locale grouping in amounts ---
      const body: string[][] = records.map((r) => [
        format(new Date(r.createdAt), "HH:mm"),
        String(r.customer?.name ?? r.customerName ?? "—"),
        String(r.note || "—").replace(/\s+/g, " ").trim(),
        r.amount != null ? formatInrPlain(r.amount) : "—",
      ]);

      autoTable(doc, {
        startY: y,
        margin: { left: marginX, right: marginX },
        tableWidth,
        head: [["Time", "Customer", "Notes / service", "Amount"]],
        body,
        theme: "plain",
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: { top: 7, right: 8, bottom: 7, left: 8 },
          textColor: [28, 28, 28],
          lineColor: [210, 210, 210],
          lineWidth: 0.35,
          valign: "middle",
          overflow: "linebreak",
          cellWidth: "wrap",
        },
        headStyles: {
          fillColor: [28, 28, 28],
          textColor: [250, 250, 250],
          fontStyle: "bold",
          fontSize: 9,
          halign: "left",
          cellPadding: { top: 9, right: 8, bottom: 9, left: 8 },
        },
        columnStyles: {
          0: { cellWidth: 52, halign: "left", fontStyle: "normal" },
          1: { cellWidth: 118, halign: "left" },
          2: { cellWidth: tableWidth - 52 - 118 - 82, halign: "left" },
          3: { cellWidth: 82, halign: "right", fontStyle: "normal" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 3) {
            data.cell.styles.fontStyle = "normal";
            data.cell.styles.halign = "right";
          }
        },
        willDrawCell: (data) => {
          // Prevent any extra character spacing in PDF cells
          if (data.section === "body" || data.section === "head") {
            doc.setCharSpace(0);
          }
        },
      });

      const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } })
        .lastAutoTable?.finalY;
      const footerY = Math.min((finalY ?? y + 200) + 32, pageH - 36);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(`NILA WOW · ${date}`, marginX, footerY);
      doc.text("Confidential", pageW - marginX, footerY, { align: "right" });

      doc.save(`NILA-WOW-SUMMARY-${date}.pdf`);
      toast.success("PDF downloaded");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[daily-summary] PDF export failed", e);
      toast.error("Failed to generate PDF");
    }
  };

  const displayDate = format(parseYmdLocal(date), "d MMMM yyyy");

  return (
    <AppShell title="Daily Summary" back>
      <div className="max-w-xl mx-auto space-y-5">
        {/* Date ledger strip */}
        <div className="nw-card nw-glow px-4 py-4">
          <Label className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
            Ledger date
          </Label>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setDate(shiftYmd(date, -1))}
              className="shrink-0 w-11 h-11 rounded-2xl border border-white/12 bg-black/50 hover:bg-white/[0.06] active:scale-[0.98] transition inline-flex items-center justify-center"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5 text-white/90" />
            </button>

            <button
              type="button"
              onClick={openNativeDatePicker}
              className="flex-1 min-w-0 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 hover:bg-white/[0.05] active:scale-[0.99] transition"
              title="Open calendar"
            >
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                Tap to pick date
              </span>
              <span className="mt-1 text-base font-semibold tracking-tight text-white/95 tabular-nums">
                {displayDate}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDate(shiftYmd(date, 1))}
              className="shrink-0 w-11 h-11 rounded-2xl border border-white/12 bg-black/50 hover:bg-white/[0.06] active:scale-[0.98] transition inline-flex items-center justify-center"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5 text-white/90" />
            </button>
          </div>

          <Input
            ref={dateInputRef}
            id="daily-summary-date"
            type="date"
            value={date}
            onChange={(e) => {
              const v = e.target.value;
              if (v) setDate(v);
            }}
            className="mt-3 h-11 w-full bg-black/50 border-white/12 rounded-xl text-sm text-white/90 focus-visible:ring-2 focus-visible:ring-white/35 [color-scheme:dark]"
          />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="nw-card nw-glow px-4 py-3.5">
            <div className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
              Records
            </div>
            <div className="mt-1.5 text-2xl font-semibold tabular-nums text-white/95">
              {loading ? "…" : records.length}
            </div>
          </div>
          <div className="nw-card nw-glow px-4 py-3.5">
            <div className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
              Total
            </div>
            <div className="mt-1.5 text-2xl font-semibold tabular-nums text-white/95">
              {loading ? "…" : total > 0 ? formatInrPlain(total) : "—"}
            </div>
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full h-12 rounded-2xl gap-2 bg-white text-black hover:bg-white/92 font-semibold shadow-lg shadow-white/10"
          onClick={handleDownloadPdf}
        >
          <FileDown className="w-4 h-4" />
          Download PDF
        </Button>

        {/* List */}
        {loadError && (
          <div className="nw-card border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            {loadError}
          </div>
        )}
        {loading ? (
          <div className="nw-card px-5 py-10 text-center text-sm text-muted-foreground">
            Loading ledger…
          </div>
        ) : records.length === 0 ? (
          <div className="nw-card px-5 py-10 text-center text-sm text-muted-foreground">
            No records for this day.
          </div>
        ) : (
          <ul className="space-y-2">
            {records.map((r) => (
              <li
                key={r.id}
                className="nw-card px-4 py-3.5 border border-white/[0.07]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-white/95 truncate">
                      {r.customer?.name ?? r.customerName ?? "Unknown"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                      {format(new Date(r.createdAt), "HH:mm")}
                    </div>
                  </div>
                  {r.amount != null && (
                    <div className="shrink-0 text-sm font-semibold tabular-nums text-white/95">
                      {formatInrPlain(r.amount)}
                    </div>
                  )}
                </div>
                <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap leading-snug">
                  {r.note}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
};

export default DailySummary;
