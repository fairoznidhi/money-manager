"use client";
import { useState } from "react";
import { ChevronRight, Pencil } from "lucide-react";
import {
  Account,
  Category,
  Event,
  Transaction,
  addEvent,
  renameEvent,
} from "@/lib/supabase";
import EventFormSheet from "@/components/EventFormSheet";
import EventDetailScreen from "@/components/EventDetailScreen";

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${days[d.getDay()]}, ${dd}/${mm}/${yyyy}`;
}

interface Props {
  events: Event[];
  allTxns: Transaction[];
  accounts: Account[];
  categories: Category[];
  onEventCreated: (event: Event) => void;
  onEventUpdated: (event: Event) => void;
  removeEvent: (id: number) => Promise<void>;
  refreshTxns: () => Promise<void>;
  showToast: (msg: string) => void;
  onCategoryCreated: (category: Category) => void;
  onCategoryUpdated: (category: Category) => void;
  onAccountCreated: (account: Account) => void;
  showAdd: boolean;
  onCloseAdd: () => void;
  editMode: boolean;
}

export default function EventsScreen({
  events,
  allTxns,
  accounts,
  categories,
  onEventCreated,
  onEventUpdated,
  removeEvent,
  refreshTxns,
  showToast,
  onCategoryCreated,
  onCategoryUpdated,
  onAccountCreated,
  showAdd,
  onCloseAdd,
  editMode,
}: Props) {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);

  async function handleCreate(values: { name: string; eventDate: string }) {
    const ev = await addEvent(values.name, values.eventDate);
    onEventCreated(ev);
    onCloseAdd();
  }

  async function handleUpdate(values: { name: string; eventDate: string }) {
    if (!editingEvent) return;
    const ev = await renameEvent(editingEvent.id, {
      name: values.name,
      event_date: values.eventDate,
    });
    onEventUpdated(ev);
    setEditingEvent(null);
  }

  async function handleDelete() {
    if (!editingEvent) return;
    await removeEvent(editingEvent.id);
    setEditingEvent(null);
  }

  return (
    <div>
      {events.length === 0 ? (
        <div className="text-center text-gray-500 py-16">No events yet</div>
      ) : (
        events.map((ev) => (
          <button
            key={ev.id}
            onClick={() => {
              if (editMode) {
                setEditingEvent(ev);
              } else {
                setViewingEvent(ev);
              }
            }}
            className="w-full flex items-center justify-between gap-2 px-4 py-3.5 border-b border-white/10 text-left hover:bg-white/[0.03]"
          >
            <div className="min-w-0">
              <div className="text-base text-white truncate">{ev.name}</div>
              <div className="text-xs text-gray-500">{fmtDate(ev.event_date)}</div>
            </div>
            {editMode ? (
              <Pencil size={16} className="text-gray-400 shrink-0" />
            ) : (
              <ChevronRight size={16} className="text-gray-500 shrink-0" />
            )}
          </button>
        ))
      )}

      {showAdd && (
        <EventFormSheet onCancel={onCloseAdd} onSubmit={handleCreate} />
      )}

      {editingEvent && (
        <EventFormSheet
          event={editingEvent}
          onCancel={() => setEditingEvent(null)}
          onSubmit={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {viewingEvent && (
        <EventDetailScreen
          event={events.find((e) => e.id === viewingEvent.id) ?? viewingEvent}
          allTxns={allTxns}
          accounts={accounts}
          categories={categories}
          events={events}
          onClose={() => setViewingEvent(null)}
          onEdit={() => {
            setEditingEvent(viewingEvent);
            setViewingEvent(null);
          }}
          onEventCreated={onEventCreated}
          onEventUpdated={onEventUpdated}
          refreshTxns={refreshTxns}
          showToast={showToast}
          onCategoryCreated={onCategoryCreated}
          onCategoryUpdated={onCategoryUpdated}
          onAccountCreated={onAccountCreated}
        />
      )}
    </div>
  );
}
