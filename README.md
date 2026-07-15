# Money Manager

An account-based income/expense/transfer tracker. Next.js talks directly to Supabase (no custom backend).

## Setup

1. Create a Supabase project, then run `supabase-setup.sql` in the SQL Editor.
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. `npm install && npm run dev`

## Model

- **Accounts** — named money pools you create (e.g. Cash, Bank).
- **Categories** — user-defined, separate lists for income and expense (e.g. Salary, Food).
- **Transactions** — added via the floating "+" button, one of three types:
  - `income` — date, amount, category, account, note. Adds money to the account.
  - `expense` — date, amount, category, account, note. Removes money from the account.
  - `transfer` — date, amount, from account, to account, note. Moves money between accounts.
- Balances are computed from the transaction history, not stored.

## Structure

- `src/app/page.tsx` — main screen: account selector, transaction list, floating add button with the income/expense/transfer form.
- `src/components/ExpenseRow.tsx` — a single transaction line (income/expense/transfer) with delete.
- `src/lib/supabase.ts` — Supabase client, types, and data access functions.
- `supabase-setup.sql` — database schema (accounts, categories, transactions).
