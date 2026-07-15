"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Account, AccountType } from "@/lib/supabase";

const ACCOUNT_TYPE_OPTIONS: { type: AccountType; label: string }[] = [
  { type: "cash", label: "Cash" },
  { type: "bank", label: "Bank" },
  { type: "card", label: "Card" },
  { type: "savings", label: "Savings" },
  { type: "loan_given", label: "Loan Given" },
  { type: "loan", label: "Loan Taken" },
];

interface Props {
  account?: Account;
  hasTransactions?: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    name: string;
    type: AccountType;
    openingBalance: number;
    creditLimit: number;
  }) => Promise<void>;
  onArchiveToggle?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  onMature?: () => void;
}

export default function AccountFormSheet({
  account,
  hasTransactions,
  onCancel,
  onSubmit,
  onArchiveToggle,
  onDelete,
  onMature,
}: Props) {
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "cash");
  const [openingBalance, setOpeningBalance] = useState(String(account?.opening_balance ?? 0));
  const [creditLimit, setCreditLimit] = useState(String(account?.credit_limit ?? 0));
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isCard = type === "card";
  const hideOpeningBalance =
    type === "cash" || type === "savings" || type === "loan" || type === "loan_given";
  const busy = saving || archiving || deleting;

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setSaving(true);
    try {
      await onSubmit({
        name: trimmed,
        type,
        openingBalance: parseFloat(openingBalance) || 0,
        creditLimit: parseFloat(creditLimit) || 0,
      });
    } catch {
      setSaving(false);
    }
  }

  async function handleArchiveToggle() {
    if (!onArchiveToggle || busy) return;
    setArchiving(true);
    try {
      await onArchiveToggle();
    } catch {
      setArchiving(false);
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
      <div className="bg-[#2c2c2e] rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">{account ? "Edit account" : "Add account"}</h3>

        <div className="mb-4">
          <label className="text-base text-gray-400 block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cash, Bank"
            disabled={saving}
            className="w-full text-xl px-4 py-3 rounded-xl border border-white/10 bg-[#1c1c1e] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
        </div>

        {account ? (
          <div className="mb-4">
            <label className="text-base text-gray-400 block mb-1">Type</label>
            <div className="text-white text-base">
              {ACCOUNT_TYPE_OPTIONS.find((opt) => opt.type === type)?.label}
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="text-base text-gray-400 block mb-2">Type</label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setType(opt.type)}
                  disabled={saving}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    type === opt.type
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-transparent text-gray-300 border-white/15 hover:bg-white/5"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isCard ? (
          <div className="mb-5">
            <label className="text-base text-gray-400 block mb-1">Limit</label>
            <input
              type="text"
              inputMode="decimal"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              disabled={saving}
              className="w-full text-xl px-4 py-3 rounded-xl border border-white/10 bg-[#1c1c1e] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
        ) : hideOpeningBalance ? null : (
          <div className="mb-5">
            <label className="text-base text-gray-400 block mb-1">Opening balance</label>
            <input
              type="text"
              inputMode="decimal"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              disabled={saving}
              className="w-full text-xl px-4 py-3 rounded-xl border border-white/10 bg-[#1c1c1e] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
        )}

        {account && onMature && (
          <div className="mb-5 pt-4 border-t border-white/10">
            <button
              onClick={onMature}
              disabled={busy}
              className="w-full px-4 py-2.5 rounded-xl border border-green-800 text-base text-green-400 hover:bg-green-950/40 disabled:opacity-40"
            >
              Mature account
            </button>
          </div>
        )}

        {account && (onArchiveToggle || onDelete) && (
          <div className="mb-5 pt-4 border-t border-white/10 flex flex-col gap-2">
            {onArchiveToggle && (
              <button
                onClick={handleArchiveToggle}
                disabled={busy}
                className="w-full px-4 py-2.5 rounded-xl border border-white/15 text-base text-gray-300 hover:bg-white/5 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {archiving && <Loader2 size={16} className="animate-spin" />}
                {account.is_active ? "Archive account" : "Unarchive account"}
              </button>
            )}
            {onDelete && (
              <>
                {hasTransactions ? (
                  <p className="text-sm text-gray-500 text-center">
                    Can&apos;t delete: this account has transactions. Archive it instead.
                  </p>
                ) : confirmingDelete ? (
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
                    Delete account
                  </button>
                )}
              </>
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
            {account ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
