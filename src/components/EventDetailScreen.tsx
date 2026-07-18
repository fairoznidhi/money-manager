"use client";
import { useState } from "react";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import {
  Account,
  Category,
  Event,
  EventEntry,
  Transaction,
  computeEventEntryTotals,
  computeLinkedTxnTotals,
  fmtUSD,
  addEventEntry,
  updateEventEntry,
  deleteEventEntry,
} from "@/lib/supabase";
import TransactionHistory from "@/components/TransactionHistory";
import EventEntryFormSheet from "@/components/EventEntryFormSheet";
import AddTransactionScreen from "@/components/AddTransactionScreen";
import EditTransactionScreen from "@/components/EditTransactionScreen";
import SummaryStat from "@/components/SummaryStat";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return {
    day: String(d.getDate()).padStart(2, "0"),
    weekday: WEEKDAYS[d.getDay()],
  };
}

interface Props {
  event: Event;
  allTxns: Transaction[];
  accounts: Account[];
  categories: Category[];
  events: Event[];
  onClose: () => void;
  onEdit: () => void;
  onEventCreated: (event: Event) => void;
  onEventUpdated: (event: Event) => void;
  refreshTxns: () => Promise<void>;
  showToast: (msg: string) => void;
  onCategoryCreated: (category: Category) => void;
  onCategoryUpdated: (category: Category) => void;
  onAccountCreated: (account: Account) => void;
}

export default function EventDetailScreen({
  event,
  allTxns,
  accounts,
  categories,
  events,
  onClose,
  onEdit,
  onEventCreated,
  onEventUpdated,
  refreshTxns,
  showToast,
  onCategoryCreated,
  onCategoryUpdated,
  onAccountCreated,
}: Props) {
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EventEntry | null>(null);

  const entryTotals = computeEventEntryTotals(event);
  const linkedTotals = computeLinkedTxnTotals(event, allTxns);
  const linkedTxns = allTxns.filter((t) => t.event_id === event.id);

  const entriesByDay = new Map<string, EventEntry[]>();
  for (const e of event.entries) {
    const list = entriesByDay.get(e.occurred_at) ?? [];
    list.push(e);
    entriesByDay.set(e.occurred_at, list);
  }
  const entryDays = Array.from(entriesByDay.keys()).sort((a, b) => b.localeCompare(a));

  async function handleAddEntry(values: {
    type: "income" | "expense";
    amount: number;
    note: string;
    occurredAt: string;
  }) {
    try {
      const { occurredAt, ...rest } = values;
      const updated = await addEventEntry(event, { ...rest, occurred_at: occurredAt });
      onEventUpdated(updated);
      setShowAddEntry(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add entry");
      throw err;
    }
  }

  async function handleUpdateEntry(values: {
    type: "income" | "expense";
    amount: number;
    note: string;
    occurredAt: string;
  }) {
    if (!editingEntry) return;
    try {
      const { occurredAt, ...rest } = values;
      const updated = await updateEventEntry(event, editingEntry.id, {
        ...rest,
        occurred_at: occurredAt,
      });
      onEventUpdated(updated);
      setEditingEntry(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update entry");
      throw err;
    }
  }

  async function handleDeleteEntry() {
    if (!editingEntry) return;
    try {
      const updated = await deleteEventEntry(event, editingEntry.id);
      onEventUpdated(updated);
      setEditingEntry(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete entry");
      throw err;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1c1c1e] overflow-y-auto">
      <div className="fixed top-0 left-0 right-0 z-20 bg-[#1c1c1e] border-b-[1px] border-gray-600 p-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 shrink-0"
            >
              <ChevronLeft size={22} />
            </button>
            <h1 className="text-xl font-extrabold tracking-tight text-blue-400 leading-none truncate">
              {event.name}
            </h1>
          </div>
          <button
            onClick={onEdit}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 shrink-0"
          >
            <Pencil size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-[70px] pb-4">
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-300">Event entries</h2>
            <button
              onClick={() => setShowAddEntry(true)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex justify-between gap-6 mb-3">
            <SummaryStat label="Income" value={fmtUSD(entryTotals.income)} colorClass="text-blue-400" />
            <SummaryStat label="Expense" value={fmtUSD(entryTotals.expense)} colorClass="text-red-400" />
            <SummaryStat label="Net" value={fmtUSD(entryTotals.net)} />
          </div>
        </div>

        {event.entries.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-sm">No entries yet</div>
        ) : (
          <div className="mb-2">
            {entryDays.map((iso, i) => {
              const dayEntries = entriesByDay.get(iso)!;
              const dayIncome = dayEntries
                .filter((e) => e.type === "income")
                .reduce((s, e) => s + e.amount, 0);
              const dayExpense = dayEntries
                .filter((e) => e.type === "expense")
                .reduce((s, e) => s + e.amount, 0);
              const { day, weekday } = dayLabel(iso);
              const isWeekend = weekday === "Sat" || weekday === "Sun";
              return (
                <div key={iso} className={i === 0 ? "" : "mt-2"}>
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">{day}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          isWeekend ? "bg-blue-500/20 text-blue-300" : "bg-white/10 text-gray-300"
                        }`}
                      >
                        {weekday}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-blue-400">{fmtUSD(dayIncome)}</span>
                      <span className="text-red-400">{fmtUSD(dayExpense)}</span>
                    </div>
                  </div>

                  {dayEntries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setEditingEntry(entry)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-1.5 border-b border-white/5 text-left hover:bg-white/[0.03]"
                    >
                      <span className="text-[13px] text-white truncate">{entry.note || "—"}</span>
                      <span
                        className={`text-[13px] shrink-0 ${
                          entry.type === "income" ? "text-blue-400" : "text-red-400"
                        }`}
                      >
                        {entry.type === "income" ? "+" : "-"}
                        {fmtUSD(entry.amount)}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <div className="px-4 pt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-300">Linked transactions</h2>
            <button
              onClick={() => setShowAddTxn(true)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex justify-between gap-6 mb-3">
            <SummaryStat label="Income" value={fmtUSD(linkedTotals.income)} colorClass="text-blue-400" />
            <SummaryStat label="Expense" value={fmtUSD(linkedTotals.expense)} colorClass="text-red-400" />
            <SummaryStat label="Net" value={fmtUSD(linkedTotals.net)} />
          </div>
        </div>

        <TransactionHistory
          txns={linkedTxns}
          accounts={accounts}
          categories={categories}
          events={events}
          onSelect={setEditingTxn}
        />
      </div>

      {showAddEntry && (
        <EventEntryFormSheet onCancel={() => setShowAddEntry(false)} onSubmit={handleAddEntry} />
      )}

      {editingEntry && (
        <EventEntryFormSheet
          entry={editingEntry}
          onCancel={() => setEditingEntry(null)}
          onSubmit={handleUpdateEntry}
          onDelete={handleDeleteEntry}
        />
      )}

      {showAddTxn && (
        <AddTransactionScreen
          accounts={accounts}
          categories={categories}
          events={events}
          initialEvent={event}
          onClose={() => setShowAddTxn(false)}
          onSaved={async () => {
            await refreshTxns();
            setShowAddTxn(false);
            showToast("Transaction added");
          }}
          onCategoryCreated={onCategoryCreated}
          onCategoryUpdated={onCategoryUpdated}
          onAccountCreated={onAccountCreated}
          onEventCreated={onEventCreated}
        />
      )}

      {editingTxn && (
        <EditTransactionScreen
          txn={editingTxn}
          accounts={accounts}
          categories={categories}
          events={events}
          onClose={() => setEditingTxn(null)}
          onSaved={async () => {
            await refreshTxns();
            setEditingTxn(null);
            showToast("Transaction updated");
          }}
          onDeleted={async () => {
            await refreshTxns();
            setEditingTxn(null);
            showToast("Transaction deleted");
          }}
          onCategoryCreated={onCategoryCreated}
          onCategoryUpdated={onCategoryUpdated}
          onAccountCreated={onAccountCreated}
          onEventCreated={onEventCreated}
        />
      )}
    </div>
  );
}
