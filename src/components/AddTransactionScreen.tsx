"use client";
import { useState } from "react";
import { ChevronLeft, X, Pencil, Plus } from "lucide-react";
import {
  Account,
  Category,
  CategoryType,
  TransactionType,
  ACCOUNT_GROUPS,
  addAccount,
  addCategory,
  addTransaction,
  updateCategory,
  parseAmount,
  todayStr,
  ICON_CHOICES,
  ACCOUNT_COLORS,
} from "@/lib/supabase";
import AmountKeypad from "@/components/AmountKeypad";
import DatePicker from "@/components/DatePicker";

interface Props {
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
  onCategoryCreated: (category: Category) => void;
  onCategoryUpdated: (category: Category) => void;
  onAccountCreated: (account: Account) => void;
}

const TABS: { type: TransactionType; label: string; activeClass: string }[] = [
  { type: "income", label: "Income", activeClass: "border-green-500 text-green-500" },
  { type: "expense", label: "Expense", activeClass: "border-red-500 text-red-500" },
  { type: "transfer", label: "Transfer", activeClass: "border-blue-500 text-blue-500" },
];

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${days[d.getDay()]}, ${dd}/${mm}/${yyyy}`;
}

function emptyForm() {
  return {
    amount: "",
    categoryId: null as number | null,
    accountId: null as number | null,
    note: "",
  };
}

export default function AddTransactionScreen({
  accounts,
  categories,
  onClose,
  onSaved,
  onCategoryCreated,
  onCategoryUpdated,
  onAccountCreated,
}: Props) {
  const [tab, setTab] = useState<TransactionType>("expense");
  const [date, setDate] = useState(todayStr());
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [showKeypad, setShowKeypad] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [editingCategories, setEditingCategories] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState(ICON_CHOICES[0]);
  const [savingCategory, setSavingCategory] = useState(false);
  const [localCategories, setLocalCategories] = useState(categories);

  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [pickingFor, setPickingFor] = useState<"account" | "to">("account");
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [localAccounts, setLocalAccounts] = useState(accounts);

  function switchTab(t: TransactionType) {
    setTab(t);
    setCategoryId(null);
  }

  function resetForm() {
    const f = emptyForm();
    setAmount(f.amount);
    setCategoryId(f.categoryId);
    setAccountId(f.accountId);
    setNote(f.note);
    setDate(todayStr());
    setToAccountId(null);
  }

  const tabCategories = localCategories.filter((c) => c.type === tab);
  const selectedCategory = localCategories.find((c) => c.id === categoryId);
  const selectedAccount = localAccounts.find((a) => a.id === accountId);
  const selectedToAccount = localAccounts.find((a) => a.id === toAccountId);

  const canSave =
    parseAmount(amount) > 0 &&
    !!accountId &&
    (tab === "transfer"
      ? !!toAccountId && toAccountId !== accountId
      : !!categoryId);

  async function saveTransaction() {
    if (!accountId) return;
    await addTransaction({
      type: tab,
      account_id: accountId,
      to_account_id: tab === "transfer" ? toAccountId : null,
      category_id: tab === "transfer" ? null : categoryId,
      note: note.trim() || null,
      amount: parseAmount(amount),
      occurred_at: date,
    });
  }

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await saveTransaction();
      onSaved();
    } catch {
      setSaving(false);
    }
  }

  async function handleSaveAndContinue() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await saveTransaction();
      resetForm();
    } catch {
      // keep form as-is, allow retry
    }
    setSaving(false);
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name || savingCategory) return;
    setSavingCategory(true);
    try {
      if (editCategoryId != null) {
        const c = await updateCategory(editCategoryId, { name, icon: newCategoryIcon });
        setLocalCategories(localCategories.map((cat) => (cat.id === c.id ? c : cat)));
        onCategoryUpdated(c);
      } else {
        const c = await addCategory(tab as CategoryType, name, newCategoryIcon);
        setLocalCategories([...localCategories, c]);
        setCategoryId(c.id);
        onCategoryCreated(c);
      }
      setNewCategoryName("");
      setEditCategoryId(null);
      setShowNewCategory(false);
      setShowCategoryPicker(false);
    } catch {
      // stay on form, allow retry
    }
    setSavingCategory(false);
  }

  function openEditCategory(c: Category) {
    setEditCategoryId(c.id);
    setNewCategoryName(c.name);
    setNewCategoryIcon(c.icon);
    setShowNewCategory(true);
  }

  function openAccountPicker(target: "account" | "to") {
    setPickingFor(target);
    setShowAccountPicker(true);
  }

  function chooseAccount(id: number) {
    if (pickingFor === "account") {
      setAccountId(id);
      setShowAccountPicker(false);
      if (tab === "transfer") openAccountPicker("to");
    } else {
      setToAccountId(id);
      setShowAccountPicker(false);
    }
  }

  async function handleCreateAccount() {
    const name = newAccountName.trim();
    if (!name || savingAccount) return;
    setSavingAccount(true);
    try {
      const color = ACCOUNT_COLORS[localAccounts.length % ACCOUNT_COLORS.length];
      const a = await addAccount(name, color);
      setLocalAccounts([...localAccounts, a]);
      chooseAccount(a.id);
      setNewAccountName("");
      setShowNewAccount(false);
      onAccountCreated(a);
    } catch {
      // stay on form, allow retry
    }
    setSavingAccount(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1c1c1e] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <button onClick={onClose} className="flex items-center gap-0.5 text-gray-300">
          <ChevronLeft size={22} />
          <span className="text-base">Trans.</span>
        </button>
        <h1 className="text-lg font-semibold">{TABS.find((t) => t.type === tab)!.label}</h1>
        <div className="w-14" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-2 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.type}
            onClick={() => switchTab(t.type)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              tab === t.type ? `bg-white/5 ${t.activeClass}` : "border-white/15 text-gray-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4">
        <Row label="Date" onClick={() => setShowDatePicker(true)} active={showDatePicker}>
          <span className="text-base text-white">{fmtDate(date)}</span>
        </Row>

        <Row label="Amount" onClick={() => setShowKeypad(true)} active={showKeypad}>
          <span className="text-base text-white">
            {amount || <span className="text-gray-600">0</span>}
          </span>
        </Row>

        {tab === "transfer" ? (
          <>
            <Row
              label="From"
              onClick={() => openAccountPicker("account")}
              active={showAccountPicker && pickingFor === "account"}
            >
              <span className="text-base text-white">
                {selectedAccount?.name ?? <span className="text-gray-600">Select</span>}
              </span>
            </Row>
            <Row
              label="To"
              onClick={() => openAccountPicker("to")}
              active={showAccountPicker && pickingFor === "to"}
            >
              <span className="text-base text-white">
                {selectedToAccount?.name ?? <span className="text-gray-600">Select</span>}
              </span>
            </Row>
          </>
        ) : (
          <>
            <Row label="Category" onClick={() => setShowCategoryPicker(true)} active={showCategoryPicker}>
              <span className="text-base text-white flex items-center justify-end gap-1.5">
                {selectedCategory ? (
                  <>
                    <span>{selectedCategory.icon}</span>
                    <span>{selectedCategory.name}</span>
                  </>
                ) : (
                  <span className="text-gray-600">Select</span>
                )}
              </span>
            </Row>

            <Row
              label="Account"
              onClick={() => openAccountPicker("account")}
              active={showAccountPicker && pickingFor === "account"}
            >
              <span className="text-base text-white">
                {selectedAccount?.name ?? <span className="text-gray-600">Select</span>}
              </span>
            </Row>
          </>
        )}

        <Row label="Note">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder=""
            className="w-full bg-transparent text-right text-white text-base outline-none"
          />
        </Row>

        <div className="py-6 flex gap-3">
          <button
            onClick={handleSaveAndContinue}
            disabled={!canSave || saving}
            className="flex-1 py-3.5 rounded-xl border border-white/20 text-white text-base font-bold disabled:opacity-40"
          >
            Continue
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white text-base font-bold disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Amount keypad overlay */}
      {showKeypad && (
        <AmountKeypad
          initial={amount}
          onChange={setAmount}
          onCancel={() => setShowKeypad(false)}
          onConfirm={(val) => {
            setAmount(val);
            setShowKeypad(false);
            if (tab === "transfer") openAccountPicker("account");
            else setShowCategoryPicker(true);
          }}
        />
      )}

      {/* Date picker overlay */}
      {showDatePicker && (
        <DatePicker
          initial={date}
          onCancel={() => setShowDatePicker(false)}
          onConfirm={(iso) => { setDate(iso); setShowDatePicker(false); setShowKeypad(true); }}
        />
      )}

      {/* Category picker overlay */}
      {showCategoryPicker && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end">
          <div
            className="flex-1"
            onClick={() => { setShowCategoryPicker(false); setEditingCategories(false); }}
          />

          <div className="bg-[#2c2c2e] rounded-t-2xl flex flex-col shrink-0 shadow-2xl h-[440px] relative">
            <div className="w-9 h-1 rounded-full bg-white/20 absolute left-1/2 -translate-x-1/2 top-1.5" />

            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10 shrink-0">
              <h2 className="text-lg text-gray-200">Category</h2>
              <div className="flex items-center gap-4">
                <button onClick={() => setEditingCategories((v) => !v)} className="text-gray-300">
                  <Pencil size={18} />
                </button>
                <button onClick={() => { setShowCategoryPicker(false); setEditingCategories(false); }} className="text-gray-300">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-3">
                {tabCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (editingCategories) {
                        openEditCategory(c);
                        return;
                      }
                      setCategoryId(c.id);
                      setShowCategoryPicker(false);
                      openAccountPicker("account");
                    }}
                    className="relative h-14 flex items-center justify-center gap-1.5 px-2.5 border-b border-r border-white/5 text-xs text-gray-200"
                  >
                    {editingCategories && (
                      <Pencil size={10} className="absolute top-1 right-1 text-blue-400" />
                    )}
                    <span className="text-sm">{c.icon}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
                <button
                  onClick={() => { setEditCategoryId(null); setNewCategoryName(""); setNewCategoryIcon(ICON_CHOICES[0]); setShowNewCategory(true); }}
                  className="h-14 flex items-center justify-center gap-1.5 px-2.5 border-b border-r border-white/5 text-xs text-gray-400"
                >
                  <Plus size={14} />
                  <span>New</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New/edit category modal */}
      {showNewCategory && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 px-4"
          onClick={() => { if (!savingCategory) { setShowNewCategory(false); setEditCategoryId(null); } }}
        >
          <div
            className="bg-[#2c2c2e] rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4 capitalize">
              {editCategoryId != null ? `Edit ${tab} category` : `New ${tab} category`}
            </h3>

            <div className="mb-4">
              <label className="text-sm text-gray-400 block mb-1">Name</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Food"
                disabled={savingCategory}
                className="w-full text-base px-3 py-2.5 rounded-lg bg-[#1c1c1e] border border-white/10 text-white outline-none disabled:opacity-60"
              />
            </div>

            <div className="mb-5">
              <label className="text-sm text-gray-400 block mb-1">Icon</label>
              <input
                type="text"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                placeholder="e.g. 🍜"
                disabled={savingCategory}
                className="w-full text-xl px-3 py-2.5 rounded-lg bg-[#1c1c1e] border border-white/10 text-white outline-none disabled:opacity-60"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowNewCategory(false); setEditCategoryId(null); }}
                disabled={savingCategory}
                className="px-4 py-2.5 rounded-lg border border-white/15 text-gray-300 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim() || savingCategory}
                className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-40"
              >
                {savingCategory ? "Saving..." : editCategoryId != null ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account picker overlay */}
      {showAccountPicker && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end">
          <div className="flex-1" onClick={() => setShowAccountPicker(false)} />

          <div className="bg-[#2c2c2e] rounded-t-2xl flex flex-col shrink-0 shadow-2xl h-[440px] relative">
            <div className="w-9 h-1 rounded-full bg-white/20 absolute left-1/2 -translate-x-1/2 top-1.5" />

            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10 shrink-0">
              <h2 className="text-lg text-gray-200">Account</h2>
              <button onClick={() => setShowAccountPicker(false)} className="text-gray-300">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {ACCOUNT_GROUPS.map((g) => {
                const groupAccounts = localAccounts.filter(
                  (a) =>
                    a.type === g.type &&
                    a.is_active &&
                    !a.matured &&
                    !(tab === "transfer" && pickingFor === "to" && a.id === accountId),
                );
                if (groupAccounts.length === 0) return null;
                return (
                  <div key={g.type}>
                    <div className="px-4 py-1.5 border-b border-white/10 bg-white/[0.08] text-gray-400 text-xs">
                      {g.label}
                    </div>
                    <div className="grid grid-cols-3">
                      {groupAccounts.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => chooseAccount(a.id)}
                          className="h-14 flex items-center justify-center gap-1.5 px-2.5 border-b border-r border-white/5 text-xs text-gray-200"
                        >
                          <span className="truncate">{a.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => { setNewAccountName(""); setShowNewAccount(true); }}
                className="h-14 w-full flex items-center justify-center gap-1.5 border-b border-white/5 text-xs text-gray-400"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New account modal */}
      {showNewAccount && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 px-4"
          onClick={() => { if (!savingAccount) setShowNewAccount(false); }}
        >
          <div
            className="bg-[#2c2c2e] rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">New account</h3>
            <div className="mb-5">
              <label className="text-sm text-gray-400 block mb-1">Name</label>
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="e.g. Cash, Bank"
                disabled={savingAccount}
                className="w-full text-base px-3 py-2.5 rounded-lg bg-[#1c1c1e] border border-white/10 text-white outline-none disabled:opacity-60"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewAccount(false)}
                disabled={savingAccount}
                className="px-4 py-2.5 rounded-lg border border-white/15 text-gray-300 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                disabled={!newAccountName.trim() || savingAccount}
                className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-40"
              >
                {savingAccount ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
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
