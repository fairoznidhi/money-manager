"use client";
import { useState, useRef } from "react";
import { GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import {
  Account,
  AccountType,
  Category,
  Transaction,
  Event,
  ACCOUNT_GROUPS,
  ACCOUNT_COLORS,
  computeBalance,
  computeMainBalance,
  fmtUSD,
  addAccount,
  updateAccount,
  reorderAccounts,
  setAccountActive,
  deleteAccount,
} from "@/lib/supabase";
import AccountFormSheet from "@/components/AccountFormSheet";
import AccountTransactionScreen from "@/components/AccountTransactionScreen";
import MatureAccountSheet from "@/components/MatureAccountSheet";

interface Props {
  accounts: Account[];
  allTxns: Transaction[];
  categories: Category[];
  events: Event[];
  onAccountCreated: (account: Account) => void;
  onAccountUpdated: (account: Account) => void;
  onAccountsReordered: (accounts: Account[]) => void;
  onAccountRemoved: (id: number) => void;
  refreshTxns: () => Promise<void>;
  showToast: (msg: string) => void;
  onCategoryCreated: (category: Category) => void;
  onCategoryUpdated: (category: Category) => void;
  onEventCreated: (event: Event) => void;
  showAdd: boolean;
  onCloseAdd: () => void;
  editMode: boolean;
  matureSavingsAccount: (
    account: Account,
    destinationAccountId: number,
    principal: number,
    interest: number,
    occurredAt: string,
  ) => Promise<void>;
}

export default function AccountsScreen({
  accounts,
  allTxns,
  categories,
  events,
  onAccountCreated,
  onAccountUpdated,
  onAccountsReordered,
  onAccountRemoved,
  refreshTxns,
  showToast,
  onCategoryCreated,
  onCategoryUpdated,
  onEventCreated,
  showAdd,
  onCloseAdd,
  editMode,
  matureSavingsAccount,
}: Props) {
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [viewingAccount, setViewingAccount] = useState<Account | null>(null);
  const [maturingAccount, setMaturingAccount] = useState<Account | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const dragGroupType = useRef<AccountType | null>(null);

  const visibleAccounts = accounts.filter((a) => !a.matured);
  const activeAccounts = visibleAccounts.filter((a) => a.is_active);
  const archivedAccounts = visibleAccounts.filter((a) => !a.is_active);

  const balances = new Map<number, number>();
  const mainBalances = new Map<number, number>();
  for (const a of accounts) {
    const relevant = allTxns.filter(
      (t) => t.account_id === a.id || t.to_account_id === a.id,
    );
    balances.set(a.id, computeBalance(a, relevant));
    mainBalances.set(a.id, computeMainBalance(a, relevant));
  }

  async function handleCreate(values: {
    name: string;
    type: AccountType;
    openingBalance: number;
    creditLimit: number;
  }) {
    const color = ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length];
    const a = await addAccount(
      values.name,
      color,
      values.type,
      values.openingBalance,
      values.creditLimit,
    );
    onAccountCreated(a);
    onCloseAdd();
  }

  async function handleUpdate(values: {
    name: string;
    type: AccountType;
    openingBalance: number;
    creditLimit: number;
  }) {
    if (!editingAccount) return;
    const a = await updateAccount(editingAccount.id, {
      name: values.name,
      type: values.type,
      opening_balance: values.openingBalance,
      credit_limit: values.creditLimit,
    });
    onAccountUpdated(a);
    setEditingAccount(null);
  }

  async function handleArchiveToggle() {
    if (!editingAccount) return;
    const a = await setAccountActive(editingAccount.id, !editingAccount.is_active);
    onAccountUpdated(a);
    setEditingAccount(null);
    showToast(a.is_active ? "Account unarchived" : "Account archived");
  }

  async function handleDelete() {
    if (!editingAccount) return;
    await deleteAccount(editingAccount.id);
    onAccountRemoved(editingAccount.id);
    setEditingAccount(null);
    showToast("Account deleted");
  }

  async function handleMature(values: {
    destinationAccountId: number;
    principal: number;
    interest: number;
    occurredAt: string;
  }) {
    if (!maturingAccount) return;
    await matureSavingsAccount(
      maturingAccount,
      values.destinationAccountId,
      values.principal,
      values.interest,
      values.occurredAt,
    );
    await refreshTxns();
    setMaturingAccount(null);
    setEditingAccount(null);
  }

  function moveWithinGroup(groupType: AccountType, targetId: number) {
    if (dragId === null || dragId === targetId) return;
    const groupAccounts = activeAccounts.filter((a) => a.type === groupType);
    const fromIdx = groupAccounts.findIndex((a) => a.id === dragId);
    const toIdx = groupAccounts.findIndex((a) => a.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reorderedGroup = [...groupAccounts];
    reorderedGroup.splice(toIdx, 0, reorderedGroup.splice(fromIdx, 1)[0]);
    reorderedGroup.forEach((a, i) => {
      a.sort_order = i;
    });

    let cursor = 0;
    const next = accounts.map((a) =>
      a.is_active && a.type === groupType ? reorderedGroup[cursor++] : a,
    );
    onAccountsReordered(next);
  }

  function commitOrder(groupType: AccountType) {
    const ids = activeAccounts
      .filter((a) => a.type === groupType)
      .map((a) => a.id);
    reorderAccounts(ids).catch(() => showToast("Failed to save order"));
  }

  function handlePointerDown(a: Account, e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragId(a.id);
    dragGroupType.current = a.type;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (dragId === null || !dragGroupType.current) return;
    e.preventDefault();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest<HTMLElement>("[data-account-id]");
    const targetId = row?.dataset.accountId;
    if (targetId) moveWithinGroup(dragGroupType.current, Number(targetId));
  }

  function handlePointerUp(e: React.PointerEvent) {
    e.preventDefault();
    if (dragGroupType.current) commitOrder(dragGroupType.current);
    setDragId(null);
    dragGroupType.current = null;
  }

  return (
    <div className="pb-4">
      {/* Grouped accounts */}
      {ACCOUNT_GROUPS.map((g) => {
        const groupAccounts = activeAccounts.filter((a) => a.type === g.type);
        if (groupAccounts.length === 0) return null;
        const groupTotal = groupAccounts.reduce(
          (s, a) => s + (mainBalances.get(a.id) ?? 0),
          0,
        );
        const groupColor =
          g.kind === "asset" ? "text-blue-400" : "text-red-400";

        return (
          <div key={g.type}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/[0.08]">
              <span className="text-gray-400 text-sm">{g.label}</span>
              {g.type !== "card" && (
                <span className={`text-sm font-medium ${groupColor}`}>
                  {fmtUSD(
                    g.kind === "liability" ? Math.abs(groupTotal) : groupTotal,
                  )}
                </span>
              )}
            </div>
            {groupAccounts.map((a) => {
              const bal = balances.get(a.id) ?? 0;
              const mainBal = mainBalances.get(a.id) ?? 0;
              const isCard = a.type === "card";
              const hideOpeningBreakdown =
                a.type === "cash" ||
                a.type === "savings" ||
                a.type === "loan" ||
                a.type === "loan_given";
              const hasOpening = isCard
                ? a.credit_limit !== 0
                : !hideOpeningBreakdown && a.opening_balance !== 0;
              const balanceEl = hasOpening && isCard ? (
                <span className="text-sm text-gray-400">
                  {fmtUSD(bal)}{" "}
                  <span
                    className={mainBal < 0 ? "text-red-400" : "text-blue-400"}
                  >
                    ({mainBal < 0 ? "-" : "+"}
                    {fmtUSD(Math.abs(mainBal))})
                  </span>
                </span>
              ) : hasOpening ? (
                <span
                  className={`text-sm ${bal < 0 ? "text-red-400" : "text-gray-200"}`}
                >
                  <span className="text-gray-500">
                    {fmtUSD(bal)} - {fmtUSD(a.opening_balance)} =
                  </span>{" "}
                  {fmtUSD(mainBal)}
                </span>
              ) : (
                <span
                  className={`text-sm ${bal < 0 ? "text-red-400" : "text-gray-200"}`}
                >
                  {fmtUSD(bal)}
                </span>
              );

              return (
                <div
                  key={a.id}
                  data-account-id={a.id}
                  className={`w-full flex items-center justify-between px-4 py-3 border-b border-white/10 hover:bg-white/[0.03] select-none ${
                    editMode && dragId === a.id ? "bg-white/10" : ""
                  }`}
                >
                  {editMode && (
                    <span
                      className="mr-2 shrink-0 text-gray-500 cursor-grab select-none"
                      style={{ touchAction: "none" }}
                      onPointerDown={(e) => handlePointerDown(a, e)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                    >
                      <GripVertical size={16} />
                    </span>
                  )}
                  <button
                    onClick={() =>
                      editMode ? setEditingAccount(a) : setViewingAccount(a)
                    }
                    className="flex-1 flex items-center justify-between text-left min-w-0"
                  >
                    <span className="text-white text-sm">{a.name}</span>
                    {balanceEl}
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}

      {visibleAccounts.length === 0 && (
        <div className="text-center text-gray-500 py-16">No accounts yet</div>
      )}

      {archivedAccounts.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="w-full flex items-center gap-1 px-4 py-2 border-b border-white/10 bg-white/[0.08] text-gray-400 text-sm"
          >
            {showArchived ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
            Archived ({archivedAccounts.length})
          </button>
          {showArchived &&
            archivedAccounts.map((a) => (
              <button
                key={a.id}
                onClick={() => setEditingAccount(a)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-white/10 text-left hover:bg-white/[0.03] opacity-60"
              >
                <span className="text-white text-sm">{a.name}</span>
                <span className="text-sm text-gray-500">
                  {fmtUSD(balances.get(a.id) ?? 0)}
                </span>
              </button>
            ))}
        </div>
      )}

      {showAdd && (
        <AccountFormSheet onCancel={onCloseAdd} onSubmit={handleCreate} />
      )}

      {editingAccount && (
        <AccountFormSheet
          account={editingAccount}
          hasTransactions={allTxns.some(
            (t) =>
              t.account_id === editingAccount.id ||
              t.to_account_id === editingAccount.id,
          )}
          onCancel={() => setEditingAccount(null)}
          onSubmit={handleUpdate}
          onArchiveToggle={handleArchiveToggle}
          onDelete={handleDelete}
          onMature={
            editingAccount.type === "savings"
              ? () => setMaturingAccount(editingAccount)
              : undefined
          }
        />
      )}

      {maturingAccount && (
        <MatureAccountSheet
          account={maturingAccount}
          balance={balances.get(maturingAccount.id) ?? 0}
          destinationOptions={visibleAccounts.filter(
            (a) => a.is_active && a.id !== maturingAccount.id,
          )}
          onClose={() => setMaturingAccount(null)}
          onSubmit={handleMature}
        />
      )}

      {viewingAccount && (
        <AccountTransactionScreen
          account={viewingAccount}
          allTxns={allTxns}
          accounts={accounts}
          categories={categories}
          events={events}
          onClose={() => setViewingAccount(null)}
          onEdit={() => {
            setEditingAccount(viewingAccount);
            setViewingAccount(null);
          }}
          refreshTxns={refreshTxns}
          showToast={showToast}
          onCategoryCreated={onCategoryCreated}
          onCategoryUpdated={onCategoryUpdated}
          onAccountCreated={onAccountCreated}
          onEventCreated={onEventCreated}
        />
      )}
    </div>
  );
}
