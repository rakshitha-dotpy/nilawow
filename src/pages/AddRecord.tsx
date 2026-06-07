import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  UserPlus,
  Check,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { addRecord } from "@/services/records";
import {
  addCustomer,
  getCustomerById,
  searchCustomersByName,
  searchCustomersByPhone,
  type Customer,
} from "@/services/customers";
import { toast } from "sonner";
import { SERVICE_CATALOG, QUICK_SERVICE_CHIPS } from "@/lib/serviceCatalog";
import { pushRecentService, readRecentServices } from "@/lib/recentServices";

const AddRecord = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetId = params.get("customerId") ?? "";
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const list = [];
    for (let y = current + 1; y >= 2020; y--) {
      list.push(String(y));
    }
    return list;
  }, []);

  const months = useMemo(
    () => [
      { value: "1", label: "January" },
      { value: "2", label: "February" },
      { value: "3", label: "March" },
      { value: "4", label: "April" },
      { value: "5", label: "May" },
      { value: "6", label: "June" },
      { value: "7", label: "July" },
      { value: "8", label: "August" },
      { value: "9", label: "September" },
      { value: "10", label: "October" },
      { value: "11", label: "November" },
      { value: "12", label: "December" },
    ],
    [],
  );

  const daysInMonth = useMemo(() => {
    if (!selectedYear || !selectedMonth) return 31;
    const y = parseInt(selectedYear, 10);
    const m = parseInt(selectedMonth, 10);
    return new Date(y, m, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const days = useMemo(() => {
    const list = [];
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(String(d));
    }
    return list;
  }, [daysInMonth]);

  useEffect(() => {
    if (selectedDay) {
      const d = parseInt(selectedDay, 10);
      if (d > daysInMonth) {
        setSelectedDay(String(daysInMonth));
      }
    }
  }, [daysInMonth, selectedDay]);

  const handleClearDate = () => {
    setSelectedYear("");
    setSelectedMonth("");
    setSelectedDay("");
  };
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Customer[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [recentList, setRecentList] = useState<string[]>(() =>
    readRecentServices(),
  );

  useEffect(() => {
    if (!presetId) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await getCustomerById(presetId);
        if (!cancelled) setSelected(c);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[add-record] getCustomerById failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [presetId]);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = window.setTimeout(async () => {
      try {
        const [byName, byPhone] = await Promise.all([
          searchCustomersByName(term),
          searchCustomersByPhone(term),
        ]);
        if (cancelled) return;
        const map = new Map<string, Customer>();
        for (const c of [...byName, ...byPhone]) {
          if (c.id) map.set(c.id, c);
        }
        setResults(Array.from(map.values()).slice(0, 6));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[add-record] search failed", e);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    if (selected) setCreatingNew(false);
  }, [selected]);

  const pickService = useCallback((label: string) => {
    const t = label.trim();
    if (!t) return;
    pushRecentService(t);
    setRecentList(readRecentServices());
    setNote((prev) => {
      const p = prev.trim();
      if (!p) return t;
      if (p.includes(t)) return prev;
      return `${p} · ${t}`;
    });
    setCatalogOpen(false);
    requestAnimationFrame(() => {
      amountInputRef.current?.focus();
    });
  }, []);

  const frequentChips = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of [...recentList, ...QUICK_SERVICE_CHIPS]) {
      if (!x || seen.has(x)) continue;
      seen.add(x);
      out.push(x);
      if (out.length >= 14) break;
    }
    return out;
  }, [recentList]);

  const handleSave = async () => {
    if (saving) return;

    let customer = selected;
    if (creatingNew) {
      if (!newName.trim()) return toast.error("Customer name is required");
      try {
        customer = await addCustomer({ name: newName, phone: newPhone });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[add-record] addCustomer failed", e);
        return toast.error("Failed to create customer");
      }
    }
    if (!customer) return toast.error("Please select a customer");
    if (!customer.id)
      return toast.error("Customer is missing an id — try selecting again");
    if (!note.trim()) return toast.error("Service / note is required");

    const hasAnyDatePart = selectedYear || selectedMonth || selectedDay;
    const hasAllDateParts = selectedYear && selectedMonth && selectedDay;
    if (hasAnyDatePart && !hasAllDateParts) {
      return toast.error("Please complete the Purchase Date selection (Year, Month, and Day) or clear it.");
    }

    setSaving(true);
    try {
      const amt = amount.trim() ? Number(amount) : undefined;
      if (amt !== undefined && (Number.isNaN(amt) || amt < 0)) {
        toast.error("Invalid amount");
        return;
      }
      
      const purchaseDateISO = hasAllDateParts
        ? new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, parseInt(selectedDay)).toISOString()
        : undefined;

      await addRecord({
        customerId: customer.id,
        customerName: customer.name,
        note: note.trim(),
        amount: amt,
        purchaseDate: purchaseDateISO,
      });
      pushRecentService(note.trim().split(" · ")[0] ?? note.trim());
      setRecentList(readRecentServices());
      toast.success("Record saved");
      navigate(`/customers/${customer.id}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[add-record] save failed", e);
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Add Record" back>
      <div className="max-w-[760px] mx-auto">
        <div className="nw-card nw-glow px-5 md:px-7 py-6">
          <div className="mb-5">
            <div className="text-xs uppercase tracking-[0.34em] text-muted-foreground">
              New entry
            </div>
            <div className="mt-1 text-lg font-semibold tracking-wide text-white/90">
              Add Record
            </div>
          </div>

          <div className="space-y-5">
            {/* Customer selection */}
            <section>
              <Label className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
                Customer
              </Label>
              {selected ? (
                <div className="mt-2 flex items-center justify-between p-4 rounded-2xl border hairline bg-black/40 nw-subtle-sep">
                  <div>
                    <div className="font-medium text-white/90">{selected.name}</div>
                    {selected.phone && (
                      <div className="text-xs text-muted-foreground">
                        {selected.phone}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelected(null)}
                  >
                    Change
                  </button>
                </div>
              ) : creatingNew ? (
                <div className="mt-2 space-y-3">
                  <Input
                    autoFocus
                    placeholder="New customer name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-12 bg-black/45 border-white/10 rounded-2xl focus-visible:ring-2 focus-visible:ring-white/35"
                    maxLength={100}
                  />
                  <Input
                    placeholder="Phone (optional)"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="h-12 bg-black/45 border-white/10 rounded-2xl focus-visible:ring-2 focus-visible:ring-white/35"
                    inputMode="tel"
                    maxLength={20}
                  />
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setCreatingNew(false)}
                  >
                    ← Search existing
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search customers"
                      className="pl-10 h-12 bg-black/45 border-white/10 rounded-2xl focus-visible:ring-2 focus-visible:ring-white/35"
                    />
                  </div>
                  {query && (
                    <ul className="mt-2 rounded-2xl border hairline bg-black/35 overflow-hidden divide-y hairline">
                      {searching && (
                        <li className="px-4 py-3 text-xs text-muted-foreground">
                          Searching…
                        </li>
                      )}
                      {results.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setSelected(c)}
                            className="w-full text-left px-4 py-3 hover:bg-white/[0.04] flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="font-medium text-sm">{c.name}</div>
                              {c.phone && (
                                <div className="text-xs text-muted-foreground">
                                  {c.phone}
                                </div>
                              )}
                            </div>
                            <Check className="w-4 h-4 opacity-0" />
                          </button>
                        </li>
                      ))}
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            setNewName(query);
                            setCreatingNew(true);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-white/[0.04] flex items-center gap-2 text-sm transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                          Create new customer “{query}”
                        </button>
                      </li>
                    </ul>
                  )}
                  {!query && (
                    <button
                      type="button"
                      onClick={() => setCreatingNew(true)}
                      className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Create new customer
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Service / product */}
            <section>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
                  Service / product
                </Label>
                <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Tap to add · edit below
                </span>
              </div>

              <div className="mt-2 flex flex-col gap-3">
                <Popover open={catalogOpen} onOpenChange={setCatalogOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full justify-between rounded-2xl border-white/12 bg-black/45 text-white/90 hover:bg-white/[0.06] hover:text-white font-medium"
                    >
                      <span className="truncate">Browse full catalog…</span>
                      <ChevronDown className="w-4 h-4 shrink-0 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 w-[min(100vw-2rem,440px)] border-white/10 bg-[#080808]/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden"
                    align="start"
                    sideOffset={8}
                  >
                    <Command
                      className="rounded-2xl bg-transparent [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.28em] [&_[cmdk-group-heading]]:text-muted-foreground/90"
                      shouldFilter
                    >
                      <CommandInput
                        placeholder="Search Aaram, Impon, chain…"
                        className="h-12 border-b border-white/10"
                      />
                      <CommandList className="max-h-[min(52vh,320px)]">
                        <CommandEmpty className="py-8 text-muted-foreground text-sm">
                          No matches. Type a custom note below.
                        </CommandEmpty>
                        {SERVICE_CATALOG.map((cat) => (
                          <CommandGroup key={cat.id} heading={cat.label}>
                            {cat.items.map((item) => (
                              <CommandItem
                                key={`${cat.id}:${item}`}
                                value={`${cat.id} ${cat.label} ${item}`}
                                keywords={[item, cat.label, cat.id]}
                                onSelect={() => pickService(item)}
                                className="rounded-lg mx-1 my-0.5 cursor-pointer aria-selected:bg-white/[0.08]"
                              >
                                {item}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground/80 mb-2">
                    Quick pick · recent
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence initial={false}>
                      {frequentChips.map((item) => (
                        <motion.button
                          key={item}
                          type="button"
                          layout
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.92 }}
                          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => pickService(item)}
                          className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/90 hover:bg-white/[0.09] hover:border-white/20 transition-colors max-w-full truncate"
                        >
                          {item}
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Selected items appear here — add weight, size, or custom details…"
                  className="min-h-[100px] bg-black/45 border-white/10 rounded-2xl resize-none focus-visible:ring-2 focus-visible:ring-white/35 text-[15px] leading-relaxed"
                  maxLength={1000}
                />
              </div>
            </section>

            {/* Amount */}
            <section>
              <Label
                htmlFor="amount"
                className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground"
              >
                Amount (optional)
              </Label>
              <Input
                ref={amountInputRef}
                id="amount"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                }
                placeholder="0"
                inputMode="decimal"
                className="mt-2 h-12 bg-black/45 border-white/10 rounded-2xl focus-visible:ring-2 focus-visible:ring-white/35"
              />
            </section>

            {/* Purchase Date */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
                  Purchase Date (optional)
                </Label>
                {(selectedYear || selectedMonth || selectedDay) && (
                  <button
                    type="button"
                    onClick={handleClearDate}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-white transition-colors"
                  >
                    Clear selection
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* Year Select */}
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-12 bg-black/45 border-white/10 rounded-2xl text-white/90 focus:ring-white/35">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#080808]/95 backdrop-blur-xl rounded-2xl max-h-60 overflow-y-auto">
                    {years.map((y) => (
                      <SelectItem key={y} value={y} className="focus:bg-white/[0.08] focus:text-white rounded-lg">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Month Select */}
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-12 bg-black/45 border-white/10 rounded-2xl text-white/90 focus:ring-white/35">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#080808]/95 backdrop-blur-xl rounded-2xl max-h-60 overflow-y-auto">
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="focus:bg-white/[0.08] focus:text-white rounded-lg">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Day Select */}
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger className="h-12 bg-black/45 border-white/10 rounded-2xl text-white/90 focus:ring-white/35">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#080808]/95 backdrop-blur-xl rounded-2xl max-h-60 overflow-y-auto">
                    {days.map((d) => (
                      <SelectItem key={d} value={d} className="focus:bg-white/[0.08] focus:text-white rounded-lg">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground/60 pl-1">
                {selectedYear && selectedMonth && selectedDay ? (
                  <span className="text-white/70">
                    Selected: {format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, parseInt(selectedDay)), "PPPP")}
                  </span>
                ) : (
                  <span>Defaults to current time if left incomplete or empty</span>
                )}
              </div>
            </section>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              size="lg"
              className="w-full h-14 rounded-2xl text-base font-semibold bg-white text-black hover:bg-white/92 shadow-2xl shadow-white/10"
            >
              {saving ? "Saving..." : "Save Record"}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default AddRecord;
