"use client";
import { useState } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import { EventEntry, EventEntryType, parseAmount, todayStr } from "@/lib/supabase";
import AmountKeypad from "@/components/AmountKeypad";
import DatePicker from "@/components/DatePicker";

interface Props {
  entry?: EventEntry;
  onCancel: () => void;
  onSubmit: (values: {
    type: EventEntryType;
    amount: number;
    note: string;
    occurredAt: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${days[d.getDay()]}, ${dd}/${mm}/${yyyy}`;
}

const TABS: { type: EventEntryType; label: string; activeClass: string }[] = [
  { type: "income", label: "Income", activeClass: "border-green-500 text-green-500" },
  { type: "expense", label: "Expense", activeClass: "border-red-500 text-red-500" },
];

export default function EventEntryFormSheet({ entry, onCancel, onSubmit, onDelete }: Props) {
  const [type, setType] = useState<EventEntryType>(entry?.type ?? "expense");
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [occurredAt, setOccurredAt] = useState(entry?.occurred_at ?? todayStr());
  const [showKeypad, setShowKeypad] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canSave = parseAmount(amount) > 0;

  async function handleSubmit() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSubmit({ type, amount: parseAmount(amount), note: note.trim(), occurredAt });
    } catch {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete?.();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1c1c1e] text-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <button onClick={onCancel} className="flex items-center gap-0.5 text-gray-300">
          <ChevronLeft size={22} />
          <span className="text-base">Event</span>
        </button>
        <h1 className="text-lg font-semibold">{entry ? "Edit entry" : "New entry"}</h1>
        <div className="w-14" />
      </div>

      <div className="flex gap-2 px-4 py-2 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.type}
            onClick={() => setType(t.type)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              type === t.type ? `bg-white/5 ${t.activeClass}` : "border-white/15 text-gray-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <Row label="Date" onClick={() => setShowDatePicker(true)} active={showDatePicker}>
          <span className="text-base text-white">{fmtDate(occurredAt)}</span>
        </Row>

        <Row label="Amount" onClick={() => setShowKeypad(true)} active={showKeypad}>
          <span className="text-base text-white">
            {amount || <span className="text-gray-600">0</span>}
          </span>
        </Row>

        <Row label="Note">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Flights"
            className="w-full bg-transparent text-right text-white text-base outline-none"
          />
        </Row>

        <div className="py-6 flex gap-3">
          {entry && onDelete && (
            <button
              onClick={confirmDelete ? handleDelete : () => setConfirmDelete(true)}
              disabled={deleting}
              className="flex-1 py-3.5 rounded-xl border border-red-500/40 text-red-400 text-base font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Trash2 size={18} /> {confirmDelete ? "Confirm delete" : "Delete"}
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canSave || saving}
            className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white text-base font-bold disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {showKeypad && (
        <AmountKeypad
          initial={amount}
          onChange={setAmount}
          onCancel={() => setShowKeypad(false)}
          onConfirm={(val) => { setAmount(val); setShowKeypad(false); }}
        />
      )}

      {showDatePicker && (
        <DatePicker
          initial={occurredAt}
          onCancel={() => setShowDatePicker(false)}
          onConfirm={(iso) => { setOccurredAt(iso); setShowDatePicker(false); }}
        />
      )}
    </div>
  );
}

function Row({
  label,
  children,
  onClick,
  active,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-center justify-between py-3 border-b text-left transition-colors ${
        active ? "border-red-500" : "border-white/10"
      }`}
    >
      <span className="text-gray-400 text-sm">{label}</span>
      <div className="flex-1 max-w-[65%] text-right">{children}</div>
    </Tag>
  );
}
