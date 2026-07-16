"use client";
import { Transaction, Account, Category, fmtUSD } from "@/lib/supabase";

interface Props {
  txns: Transaction[];
  accounts: Account[];
  categories: Category[];
  onSelect: (txn: Transaction) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return {
    day: String(d.getDate()).padStart(2, "0"),
    weekday: WEEKDAYS[d.getDay()],
  };
}

export default function TransactionHistory({
  txns,
  accounts,
  categories,
  onSelect,
}: Props) {
  const accountName = (id: number | null) =>
    accounts.find((a) => a.id === id)?.name ?? "?";
  const categoryOf = (id: number | null) => categories.find((c) => c.id === id);

  const byDay = new Map<string, Transaction[]>();
  for (const t of txns) {
    const list = byDay.get(t.occurred_at) ?? [];
    list.push(t);
    byDay.set(t.occurred_at, list);
  }
  const days = Array.from(byDay.keys()).sort((a, b) => b.localeCompare(a));

  if (txns.length === 0) {
    return (
      <div className="text-center text-gray-500 py-16">No transactions yet</div>
    );
  }

  return (
    <div>
      {days.map((iso, i) => {
        const dayTxns = byDay.get(iso)!;
        const income = dayTxns
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + t.amount, 0);
        const expense = dayTxns
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + t.amount, 0);
        const { day, weekday } = dayLabel(iso);
        const isWeekend = weekday === "Sat" || weekday === "Sun";

        return (
          <div key={iso} className={i === 0 ? "" : "mt-2"}>
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{day}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    isWeekend
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-white/10 text-gray-300"
                  }`}
                >
                  {weekday}
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-blue-400">{fmtUSD(income)}</span>
                <span className="text-red-400">{fmtUSD(expense)}</span>
              </div>
            </div>

            {dayTxns.map((t) => (
              <TxnRow
                key={t.id}
                txn={t}
                category={
                  t.type === "transfer" ? undefined : categoryOf(t.category_id)
                }
                accountName={accountName}
                onSelect={onSelect}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TxnRow({
  txn,
  category,
  accountName,
  onSelect,
}: {
  txn: Transaction;
  category?: Category;
  accountName: (id: number | null) => string;
  onSelect: (txn: Transaction) => void;
}) {
  const sign = txn.type === "expense" ? "-" : txn.type === "income" ? "+" : "";
  const amountColor =
    txn.type === "income"
      ? "text-blue-400"
      : txn.type === "expense"
        ? "text-red-400"
        : "text-gray-300";

  const title = txn.type === "transfer" ? "Transfer" : (category?.name ?? "—");
  const icon = txn.type === "transfer" ? null : category?.icon;

  const subtitle =
    txn.type === "transfer"
      ? `${accountName(txn.account_id)} → ${accountName(txn.to_account_id)}`
      : accountName(txn.account_id);

  return (
    <button
      onClick={() => onSelect(txn)}
      className="w-full flex items-center gap-2 px-3 py-1.5 border-b border-white/5 text-left hover:bg-white/[0.03]"
    >
      <span className="w-5 text-center text-sm shrink-0">{icon ?? ""}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-white truncate">{title}</div>
        <div className="text-[11px] text-gray-500 truncate">{subtitle}</div>
      </div>
      {txn.note && (
        <span className="text-[11px] text-gray-500 shrink-0 max-w-[30%] truncate">
          {txn.note}
        </span>
      )}
      <span className={`text-[13px] shrink-0 ${amountColor}`}>
        {sign}
        {fmtUSD(txn.amount)}
      </span>
    </button>
  );
}
