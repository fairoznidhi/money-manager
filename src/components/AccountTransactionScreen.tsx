"use client";
import { useState } from "react";
import { ChevronLeft, Pencil } from "lucide-react";
import { Account, Category, Transaction } from "@/lib/supabase";
import TransactionHistory from "@/components/TransactionHistory";
import EditTransactionScreen from "@/components/EditTransactionScreen";

interface Props {
  account: Account;
  allTxns: Transaction[];
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onEdit: () => void;
  refreshTxns: () => Promise<void>;
  showToast: (msg: string) => void;
  onCategoryCreated: (category: Category) => void;
  onCategoryUpdated: (category: Category) => void;
  onAccountCreated: (account: Account) => void;
}

export default function AccountTransactionScreen({
  account,
  allTxns,
  accounts,
  categories,
  onClose,
  onEdit,
  refreshTxns,
  showToast,
  onCategoryCreated,
  onCategoryUpdated,
  onAccountCreated,
}: Props) {
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);

  const txns = allTxns.filter(
    (t) => t.account_id === account.id || t.to_account_id === account.id,
  );

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
              {account.name}
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
        <TransactionHistory
          txns={txns}
          accounts={accounts}
          categories={categories}
          onSelect={setEditingTxn}
        />
      </div>

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
