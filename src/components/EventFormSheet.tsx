"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Event, todayStr } from "@/lib/supabase";

interface Props {
  event?: Event;
  onCancel: () => void;
  onSubmit: (values: { name: string; eventDate: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function EventFormSheet({ event, onCancel, onSubmit, onDelete }: Props) {
  const [name, setName] = useState(event?.name ?? "");
  const [eventDate, setEventDate] = useState(event?.event_date ?? todayStr());
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const busy = saving || deleting;

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setSaving(true);
    try {
      await onSubmit({ name: trimmed, eventDate });
    } catch {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete || busy) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={() => { if (!saving) onCancel(); }}
    >
      <div
        className="bg-[#2c2c2e] rounded-2xl p-6 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-4">{event ? "Edit event" : "New event"}</h3>

        <div className="mb-4">
          <label className="text-base text-gray-400 block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bali Trip"
            disabled={saving}
            className="w-full text-xl px-4 py-3 rounded-xl border border-white/10 bg-[#1c1c1e] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
        </div>

        <div className="mb-5">
          <label className="text-base text-gray-400 block mb-1">Date</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            disabled={saving}
            className="w-full text-xl px-4 py-3 rounded-xl border border-white/10 bg-[#1c1c1e] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
        </div>

        {event && onDelete && (
          <div className="mb-5 pt-4 border-t border-white/10">
            {confirmingDelete ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={busy}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-base text-gray-300 hover:bg-white/5 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-base font-bold hover:bg-red-700 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {deleting && <Loader2 size={16} className="animate-spin" />}
                  Confirm delete
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={busy}
                className="w-full px-4 py-2.5 rounded-xl border border-red-900 text-base text-red-400 hover:bg-red-950/40 disabled:opacity-40"
              >
                Delete event
              </button>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-5 py-3 rounded-xl border border-white/15 text-lg text-gray-300 hover:bg-white/5 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || busy}
            className="px-5 py-3 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
          >
            {saving && <Loader2 size={18} className="animate-spin" />}
            {event ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
