import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

// ---------- Types ----------
export type TransactionType = "income" | "expense" | "transfer";
export type CategoryType = "income" | "expense";

export type AccountType =
  | "cash"
  | "bank"
  | "card"
  | "savings"
  | "loan"
  | "loan_given";

export interface Account {
  id: number;
  name: string;
  color: string;
  type: AccountType;
  opening_balance: number;
  credit_limit: number;
  sort_order: number;
  is_active: boolean;
  matured: boolean;
}

export interface AccountGroup {
  type: AccountType;
  label: string;
  kind: "asset" | "liability";
}

export const ACCOUNT_GROUPS: AccountGroup[] = [
  { type: "cash", label: "Cash", kind: "asset" },
  { type: "bank", label: "Accounts", kind: "asset" },
  { type: "card", label: "Card", kind: "liability" },
  { type: "savings", label: "Savings", kind: "asset" },
  { type: "loan_given", label: "Loan Given", kind: "asset" },
  { type: "loan", label: "Loan Taken", kind: "liability" },
];

export interface Category {
  id: number;
  type: CategoryType;
  name: string;
  icon: string;
}

export const DEFAULT_CATEGORY_ICON = "🏷️";

export const ICON_CHOICES = [
  "🚕", "🍜", "🎁", "👕", "💄", "📚",
  "🪑", "🏥", "🏠", "🐾", "🛍️", "📦",
  "📱", "💳", "🎬", "✈️", "⚽", "🎓",
  "💵", "💰", "💼", "📈", "🎉", "🔧",
  "🍔", "☕", "🍺", "🎮", "🎵", "🎨",
  "🚗", "⛽", "🚌", "🚲", "🏋️", "💊",
  "🧾", "💡", "📶", "🎂", "👶", "🐶",
  "🌳", "🛒", "🍿", "📷", "💻", "🖨️",
  "🧳", "🏦", "🪙", "📄", "🧹", "🛠️",
];

export interface Transaction {
  id: number;
  type: TransactionType;
  account_id: number;
  to_account_id: number | null;
  category_id: number | null;
  note: string | null;
  amount: number;
  occurred_at: string; // "YYYY-MM-DD"
}

export type NewTransaction = Omit<Transaction, "id">;

// ---------- Helpers ----------
export const ACCOUNT_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500",
  "bg-amber-500", "bg-pink-500", "bg-teal-500",
];

export function fmtUSD(n: number) {
  return "$" + (Math.round(n) || 0).toLocaleString("en-US");
}

export function parseAmount(val: string): number {
  return parseFloat(val) || 0;
}

export function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ---------- Accounts ----------
export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addAccount(
  name: string,
  color: string,
  type: AccountType = "cash",
  openingBalance = 0,
  creditLimit = 0,
  sortOrder = 0,
): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      name,
      color,
      type,
      opening_balance: openingBalance,
      credit_limit: creditLimit,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccount(
  id: number,
  updates: { name?: string; type?: AccountType; opening_balance?: number; credit_limit?: number },
): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Persists a new display order for a set of accounts (e.g. after drag-to-reorder).
export async function reorderAccounts(
  orderedIds: number[],
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("accounts").update({ sort_order: index }).eq("id", id),
    ),
  );
}

// Archives/unarchives an account: hides it from the main list while preserving
// its transaction history, since transactions reference it by id.
export async function setAccountActive(id: number, isActive: boolean): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Matures a savings account: transfers its principal to another account,
// records any interest as income on that same destination account, then
// marks the source account matured (hidden everywhere in the UI, distinct
// from plain archiving).
export async function matureAccount(
  account: Account,
  destinationAccountId: number,
  principal: number,
  interest: number,
  occurredAt: string,
): Promise<{ account: Account; transactions: Transaction[] }> {
  const created: Transaction[] = [];

  if (principal > 0) {
    created.push(
      await addTransaction({
        type: "transfer",
        account_id: account.id,
        to_account_id: destinationAccountId,
        category_id: null,
        note: `Matured: ${account.name}`,
        amount: principal,
        occurred_at: occurredAt,
      }),
    );
  }

  if (interest > 0) {
    const interestCategory = await getOrCreateInterestCategory();
    created.push(
      await addTransaction({
        type: "income",
        account_id: destinationAccountId,
        to_account_id: null,
        category_id: interestCategory.id,
        note: `Interest: ${account.name}`,
        amount: interest,
        occurred_at: occurredAt,
      }),
    );
  }

  const { data, error } = await supabase
    .from("accounts")
    .update({ matured: true, is_active: false })
    .eq("id", account.id)
    .select()
    .single();
  if (error) throw error;

  return { account: data, transactions: created };
}

async function getOrCreateInterestCategory(): Promise<Category> {
  const { data: existing, error: findError } = await supabase
    .from("categories")
    .select("*")
    .eq("type", "income")
    .eq("name", "Interest")
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  return addCategory("income", "Interest", "📈");
}

// Hard-deletes an account. Callers must ensure it has zero transactions first
// (the caller-side check in the UI is what actually enforces this; the DB has
// no FK constraint blocking it, so calling this on an account with history
// would orphan those transactions).
export async function deleteAccount(id: number): Promise<void> {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Categories ----------
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addCategory(type: CategoryType, name: string, icon: string): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ type, name, icon })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(
  id: number,
  updates: { name?: string; icon?: string },
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- Transactions ----------
export async function getTransactions(accountId: number): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addTransaction(t: NewTransaction): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert(t)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(
  id: number,
  t: NewTransaction,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .update(t)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: number): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

// Balance = opening balance + sum(income) - sum(expense), plus transfers
// in/out. Computed client-side from transactions touching this account.
export function computeMainBalance(account: Account, txns: Transaction[]): number {
  return txns.reduce((bal, t) => {
    if (t.type === "income" && t.account_id === account.id) return bal + t.amount;
    if (t.type === "expense" && t.account_id === account.id) return bal - t.amount;
    if (t.type === "transfer") {
      if (t.account_id === account.id) return bal - t.amount;
      if (t.to_account_id === account.id) return bal + t.amount;
    }
    return bal;
  }, 0);
}

export function computeBalance(account: Account, txns: Transaction[]): number {
  const base = account.type === "card" ? account.credit_limit : account.opening_balance;
  return base + computeMainBalance(account, txns);
}
