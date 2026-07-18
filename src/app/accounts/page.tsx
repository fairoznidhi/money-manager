"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { computeBalance, computeMainBalance, fmtUSD } from "@/lib/supabase";
import { useAppData } from "@/lib/AppDataContext";
import AccountsScreen from "@/components/AccountsScreen";
import SummaryStat from "@/components/SummaryStat";

export default function AccountsPage() {
  const {
    accounts,
    categories,
    allTxns,
    events,
    dbReady,
    refreshTxns,
    showToast,
    onAccountCreated,
    onAccountUpdated,
    onAccountsReordered,
    onAccountRemoved,
    onCategoryCreated,
    onCategoryUpdated,
    onEventCreated,
    matureSavingsAccount,
  } = useAppData();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editMode, setEditMode] = useState(false);

  let baseAssets = 0;
  let cardExtra = 0;
  let liabilities = 0;
  let savingsTotal = 0;
  let loanGivenTotal = 0;
  let loanTakenTotal = 0;
  for (const a of accounts.filter((a) => a.is_active)) {
    const relevant = allTxns.filter(
      (t) => t.account_id === a.id || t.to_account_id === a.id,
    );
    if (a.type === "savings") {
      savingsTotal += computeMainBalance(a, relevant);
      continue;
    }
    if (a.type === "loan_given") {
      loanGivenTotal += computeBalance(a, relevant);
      continue;
    }
    if (a.type === "loan") {
      loanTakenTotal += computeBalance(a, relevant);
      continue;
    }
    const mainBal = computeMainBalance(a, relevant);
    const signBal = a.type === "card" ? mainBal : computeBalance(a, relevant);
    if (signBal >= 0) {
      if (a.type === "card") cardExtra += mainBal;
      else baseAssets += mainBal;
    } else {
      liabilities += mainBal;
    }
  }
  const assets = baseAssets + cardExtra;
  const totalRow1 = assets + liabilities;
  const totalRow2 = totalRow1 + loanGivenTotal + loanTakenTotal;
  const totalRow3 = totalRow2 + savingsTotal;

  return (
    <div>
      <div className="fixed top-0 left-0 right-0 z-20 bg-[#1c1c1e] border-b-[1px] border-gray-600 p-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-blue-400 leading-none">
            Accounts
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
              onClick={() => setShowAddAccount(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="fixed top-[61px] left-0 right-0 z-10 bg-[#1c1c1e] border-b border-white/10">
        <div className="max-w-2xl mx-auto flex justify-between gap-6 py-1 px-3 text-center">
          <div>
            <SummaryStat
              label="Assets"
              value={
                cardExtra !== 0 ? (
                  <>
                    {fmtUSD(baseAssets)}{" "}
                    <span className="font-normal text-gray-400">
                      + {fmtUSD(cardExtra)}
                    </span>
                  </>
                ) : (
                  fmtUSD(assets)
                )
              }
              colorClass="text-blue-400"
            />
            {loanGivenTotal !== 0 && (
              <div className="text-sm font-semibold text-blue-300 mt-0.5">
                {fmtUSD(loanGivenTotal)}
              </div>
            )}
            <div className="text-sm font-semibold text-green-400 mt-0.5">
              {fmtUSD(savingsTotal)}
            </div>
          </div>
          <div>
            <SummaryStat
              label="Liabilities"
              value={fmtUSD(Math.abs(liabilities))}
              colorClass="text-red-400"
            />
            {loanTakenTotal !== 0 && (
              <div className="text-sm font-semibold text-red-300 mt-0.5">
                {fmtUSD(Math.abs(loanTakenTotal))}
              </div>
            )}
            <div className="mt-0.5">&nbsp;</div>
          </div>
          <div>
            <SummaryStat label="Total" value={fmtUSD(totalRow1)} />
            {(loanGivenTotal !== 0 || loanTakenTotal !== 0) && (
              <div className="text-sm font-semibold text-white mt-0.5">
                {fmtUSD(totalRow2)}
              </div>
            )}
            <div className="text-sm font-semibold text-green-400 mt-0.5">
              {fmtUSD(totalRow3)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-[154px]">
        {dbReady === false && (
          <div className="mx-4 mb-4 bg-red-950 border border-red-800 rounded-xl p-4 text-red-300 text-lg">
            ⚠️ Supabase is not connected. Set NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_ANON_KEY in <strong>.env.local</strong>, and
            run <strong>supabase-setup.sql</strong> in your Supabase project.
          </div>
        )}

        <AccountsScreen
          accounts={accounts}
          allTxns={allTxns}
          categories={categories}
          events={events}
          onAccountCreated={onAccountCreated}
          onAccountUpdated={onAccountUpdated}
          onAccountsReordered={onAccountsReordered}
          onAccountRemoved={onAccountRemoved}
          refreshTxns={refreshTxns}
          showToast={showToast}
          onCategoryCreated={onCategoryCreated}
          onCategoryUpdated={onCategoryUpdated}
          onEventCreated={onEventCreated}
          showAdd={showAddAccount}
          onCloseAdd={() => setShowAddAccount(false)}
          editMode={editMode}
          matureSavingsAccount={matureSavingsAccount}
        />
      </div>
    </div>
  );
}
