"use client";
import { useState, useEffect } from "react";
import {
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  fmtUSD,
  Transaction,
  computeMainBalance,
  computeBalance,
} from "@/lib/supabase";
import { useAppData } from "@/lib/AppDataContext";
import TransactionHistory from "@/components/TransactionHistory";
import AddTransactionScreen from "@/components/AddTransactionScreen";
import EditTransactionScreen from "@/components/EditTransactionScreen";
import SummaryStat from "@/components/SummaryStat";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function Home() {
  const {
    accounts,
    categories,
    allTxns,
    loading,
    dbReady,
    refreshTxns,
    showToast,
    onCategoryCreated,
    onCategoryUpdated,
    onAccountCreated,
  } = useAppData();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [headerAccountId1, setHeaderAccountId1] = useState<number | null>(null);
  const [headerAccountId2, setHeaderAccountId2] = useState<number | null>(null);
  const [showHeaderAccountPicker, setShowHeaderAccountPicker] = useState(false);
  const [pickingHeaderSlot, setPickingHeaderSlot] = useState<1 | 2>(1);

  useEffect(() => {
    const stored1 = localStorage.getItem("headerAccountId1");
    const stored2 = localStorage.getItem("headerAccountId2");
    if (stored1) setHeaderAccountId1(Number(stored1));
    if (stored2) setHeaderAccountId2(Number(stored2));
  }, []);

  function chooseHeaderAccount(id: number | null) {
    if (pickingHeaderSlot === 1) {
      setHeaderAccountId1(id);
      if (id === null) localStorage.removeItem("headerAccountId1");
      else localStorage.setItem("headerAccountId1", String(id));
    } else {
      setHeaderAccountId2(id);
      if (id === null) localStorage.removeItem("headerAccountId2");
      else localStorage.setItem("headerAccountId2", String(id));
    }
    setShowHeaderAccountPicker(false);
  }

  function headerAccountValue(account: (typeof accounts)[number]) {
    const relevant = allTxns.filter(
      (t) => t.account_id === account.id || t.to_account_id === account.id,
    );
    if (account.type === "card") {
      return -computeMainBalance(account, relevant);
    }
    return computeBalance(account, relevant);
  }

  const headerAccount1 =
    accounts.find((a) => a.id === headerAccountId1) ?? null;
  const headerAccount2 =
    accounts.find((a) => a.id === headerAccountId2) ?? null;
  const headerRemaining =
    headerAccount1 && headerAccount2
      ? headerAccountValue(headerAccount1) - headerAccountValue(headerAccount2)
      : null;

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  async function handleTxnSaved() {
    await refreshTxns();
    setShowAddTxn(false);
    showToast("Transaction added");
  }

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthTxns = allTxns.filter((t) =>
    t.occurred_at.startsWith(monthPrefix),
  );
  const monthIncome = monthTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const monthTotal = monthIncome - monthExpense;

  return (
    <div>
      <div className="fixed top-0 left-0 right-0 z-20 h-[56px] border-b-[1px] border-gray-800 bg-[#1c1c1e] p-3">
        <div className="max-w-2xl mx-auto  ">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-blue-400 leading-none shrink-0">
              History
            </h1>
            <div className="flex items-center gap-1 min-w-0 text-sm">
              <button
                onClick={() => {
                  setPickingHeaderSlot(1);
                  setShowHeaderAccountPicker(true);
                }}
                className="flex items-center gap-0.5 min-w-0 text-gray-300 hover:text-white"
              >
                <span className="truncate">
                  {headerAccount1?.name ?? (
                    <span className="text-gray-500">Account 1</span>
                  )}
                </span>
                <ChevronDown size={14} className="shrink-0 text-gray-500" />
              </button>
              <span className="text-gray-500 shrink-0">-</span>
              <button
                onClick={() => {
                  setPickingHeaderSlot(2);
                  setShowHeaderAccountPicker(true);
                }}
                className="flex items-center gap-0.5 min-w-0 text-gray-300 hover:text-white"
              >
                <span className="truncate">
                  {headerAccount2?.name ?? (
                    <span className="text-gray-500">Account 2</span>
                  )}
                </span>
                <ChevronDown size={14} className="shrink-0 text-gray-500" />
              </button>
              {headerRemaining !== null && (
                <>
                  <span className="text-gray-500 shrink-0">=</span>
                  <span
                    className={`shrink-0 font-medium ${
                      headerRemaining < 0 ? "text-red-400" : "text-blue-400"
                    }`}
                  >
                    {fmtUSD(headerRemaining)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Month navigation + Income / Exp / Total */}
      <div className="fixed top-[56px] left-0 right-0 z-10 bg-[#1c1c1e] border-b-[1px] border-gray-800 px-3 py-2">
        <div className="flex items-center justify-between">
          <button onClick={() => changeMonth(-1)} className="text-gray-300 p-1">
            <ChevronLeft size={20} />
          </button>
          <span className="text-base font-medium text-white">
            {MONTH_NAMES[viewMonth].slice(0, 3)} {viewYear}
          </span>
          <button onClick={() => changeMonth(1)} className="text-gray-300 p-1">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <SummaryStat
            label="Income"
            value={fmtUSD(monthIncome)}
            colorClass="text-blue-400"
          />
          <SummaryStat
            label="Exp."
            value={fmtUSD(monthExpense)}
            colorClass="text-red-400"
          />
          <SummaryStat label="Total" value={fmtUSD(monthTotal)} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-[155px]">
        {dbReady === false && (
          <div className="mx-4 mb-4 bg-red-950 border border-red-800 rounded-xl p-4 text-red-300 text-lg">
            ⚠️ Supabase is not connected. Set NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_ANON_KEY in <strong>.env.local</strong>, and
            run <strong>supabase-setup.sql</strong> in your Supabase pr oject.
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center gap-2 py-10 text-gray-500 text-lg">
            <Loader2 className="animate-spin" size={24} /> Loading...
          </div>
        )}

        {!loading && accounts.length === 0 && (
          <div className="text-center text-xl text-gray-500 py-12">
            Go to the Accounts tab to create your first account
          </div>
        )}

        {!loading && accounts.length > 0 && (
          <TransactionHistory
            txns={monthTxns}
            accounts={accounts}
            categories={categories}
            onSelect={setEditingTxn}
          />
        )}
      </div>

      {/* Header account picker */}
      {showHeaderAccountPicker && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setShowHeaderAccountPicker(false)}
        >
          <div
            className="bg-[#2c2c2e] rounded-2xl p-4 w-full max-w-sm max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-3 px-1">
              Account {pickingHeaderSlot}
            </h3>
            <button
              onClick={() => chooseHeaderAccount(null)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-gray-400 hover:bg-white/5"
            >
              None
            </button>
            {accounts
              .filter((a) => a.is_active && !a.matured)
              .map((a) => {
                const selected =
                  pickingHeaderSlot === 1
                    ? headerAccountId1 === a.id
                    : headerAccountId2 === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => chooseHeaderAccount(a.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 ${
                      selected ? "text-blue-400" : "text-gray-200"
                    }`}
                  >
                    {a.name}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Floating add button */}
      {accounts.length > 0 && (
        <button
          onClick={() => setShowAddTxn(true)}
          className="fixed bottom-28 right-6 z-30 w-14 h-14 rounded-full bg-red-500 text-white shadow-xl flex items-center justify-center hover:bg-red-600"
        >
          <Plus size={26} />
        </button>
      )}

      {/* Full-screen add transaction */}
      {showAddTxn && (
        <AddTransactionScreen
          accounts={accounts}
          categories={categories}
          onClose={() => setShowAddTxn(false)}
          onSaved={handleTxnSaved}
          onCategoryCreated={onCategoryCreated}
          onCategoryUpdated={onCategoryUpdated}
          onAccountCreated={onAccountCreated}
        />
      )}

      {/* Full-screen edit transaction */}
      {editingTxn && (
        <EditTransactionScreen
          txn={editingTxn}
          accounts={accounts}
          categories={categories}
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
        />
      )}
    </div>
  );
}
