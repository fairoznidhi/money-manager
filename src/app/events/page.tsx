"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useAppData } from "@/lib/AppDataContext";
import EventsScreen from "@/components/EventsScreen";

export default function EventsPage() {
  const {
    events,
    allTxns,
    accounts,
    categories,
    dbReady,
    refreshTxns,
    showToast,
    onEventCreated,
    onEventUpdated,
    removeEvent,
    onCategoryCreated,
    onCategoryUpdated,
    onAccountCreated,
  } = useAppData();
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editMode, setEditMode] = useState(false);

  return (
    <div>
      <div className="fixed top-0 left-0 right-0 z-20 bg-[#1c1c1e] border-b-[1px] border-gray-600 p-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-blue-400 leading-none">
            Events
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditMode((v) => !v)}
              className={`px-3 h-9 flex items-center justify-center rounded-full text-sm font-medium ${
                editMode
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              {editMode ? "Done" : "Edit"}
            </button>
            <button
              onClick={() => setShowAddEvent(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-[61px]">
        {dbReady === false && (
          <div className="mx-4 mb-4 bg-red-950 border border-red-800 rounded-xl p-4 text-red-300 text-lg">
            ⚠️ Supabase is not connected. Set NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_ANON_KEY in <strong>.env.local</strong>, and
            run <strong>supabase-setup.sql</strong> in your Supabase project.
          </div>
        )}

        <EventsScreen
          events={events}
          allTxns={allTxns}
          accounts={accounts}
          categories={categories}
          onEventCreated={onEventCreated}
          onEventUpdated={onEventUpdated}
          removeEvent={removeEvent}
          refreshTxns={refreshTxns}
          showToast={showToast}
          onCategoryCreated={onCategoryCreated}
          onCategoryUpdated={onCategoryUpdated}
          onAccountCreated={onAccountCreated}
          showAdd={showAddEvent}
          onCloseAdd={() => setShowAddEvent(false)}
          editMode={editMode}
        />
      </div>
    </div>
  );
}
