"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  Account,
  Category,
  Transaction,
  Event,
  getAccounts,
  getCategories,
  getAllTransactions,
  getEvents,
  deleteTransaction,
  deleteEvent,
  matureAccount,
} from "@/lib/supabase";

interface AppData {
  accounts: Account[];
  categories: Category[];
  allTxns: Transaction[];
  events: Event[];
  loading: boolean;
  dbReady: boolean | null;
  toast: string;
  showToast: (msg: string) => void;
  refreshTxns: () => Promise<void>;
  removeTxn: (id: number) => Promise<void>;
  onCategoryCreated: (category: Category) => void;
  onCategoryUpdated: (category: Category) => void;
  onAccountCreated: (account: Account) => void;
  onAccountUpdated: (account: Account) => void;
  onAccountsReordered: (accounts: Account[]) => void;
  onAccountRemoved: (id: number) => void;
  onEventCreated: (event: Event) => void;
  onEventUpdated: (event: Event) => void;
  removeEvent: (id: number) => Promise<void>;
  matureSavingsAccount: (
    account: Account,
    destinationAccountId: number,
    principal: number,
    interest: number,
    occurredAt: string,
  ) => Promise<void>;
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTxns, setAllTxns] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbReady, setDbReady] = useState<boolean | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);
    try {
      const [accs, cats, txns, evts] = await Promise.all([
        getAccounts(),
        getCategories(),
        getAllTransactions(),
        getEvents(),
      ]);
      setAccounts(accs);
      setCategories(cats);
      setAllTxns(txns);
      setEvents(evts);
      setDbReady(true);
    } catch {
      setDbReady(false);
    }
    setLoading(false);
  }

  async function refreshTxns() {
    try {
      const t = await getAllTransactions();
      setAllTxns(t);
    } catch {
      showToast("Failed to load, try again");
    }
  }

  async function removeTxn(id: number) {
    try {
      await deleteTransaction(id);
      await refreshTxns();
      showToast("Transaction removed");
    } catch {
      showToast("Failed to remove");
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function onCategoryCreated(category: Category) {
    setCategories((prev) => [...prev, category]);
  }

  function onCategoryUpdated(category: Category) {
    setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
  }

  function onAccountCreated(account: Account) {
    setAccounts((prev) => [...prev, account]);
  }

  function onAccountUpdated(account: Account) {
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
  }

  function onAccountsReordered(next: Account[]) {
    setAccounts(next);
  }

  function onAccountRemoved(id: number) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  function onEventCreated(event: Event) {
    setEvents((prev) => [event, ...prev]);
  }

  function onEventUpdated(event: Event) {
    setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
  }

  async function removeEvent(id: number) {
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      await refreshTxns();
      showToast("Event deleted");
    } catch {
      showToast("Failed to delete event");
    }
  }

  async function matureSavingsAccount(
    account: Account,
    destinationAccountId: number,
    principal: number,
    interest: number,
    occurredAt: string,
  ) {
    const { account: updated } = await matureAccount(
      account,
      destinationAccountId,
      principal,
      interest,
      occurredAt,
    );
    onAccountUpdated(updated);
    await refreshTxns();
    const cats = await getCategories();
    setCategories(cats);
    showToast(`${account.name} matured`);
  }

  return (
    <AppDataContext.Provider
      value={{
        accounts,
        categories,
        allTxns,
        events,
        loading,
        dbReady,
        toast,
        showToast,
        refreshTxns,
        removeTxn,
        onCategoryCreated,
        onCategoryUpdated,
        onAccountCreated,
        onAccountUpdated,
        onAccountsReordered,
        onAccountRemoved,
        onEventCreated,
        onEventUpdated,
        removeEvent,
        matureSavingsAccount,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
