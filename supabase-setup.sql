-- Run this ONCE in Supabase → SQL Editor → New Query → Run

-- Table 1: named money accounts (Cash, Bank, Credit Card, ...)
-- type determines grouping and whether the balance counts as an asset or liability:
--   'cash', 'bank', 'savings', 'loan_given' -> asset
--   'card', 'loan'                          -> liability
-- 'loan_given' = money you lent out (owed to you); 'loan' = money you borrowed (owed by you).
create table if not exists accounts (
  id              bigserial primary key,
  name            text not null,
  color           text,
  type            text not null default 'cash' check (type in ('cash', 'bank', 'card', 'savings', 'loan', 'loan_given')),
  opening_balance numeric not null default 0,
  credit_limit    numeric not null default 0,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz default now()
);

alter table accounts add column if not exists type text not null default 'cash' check (type in ('cash', 'bank', 'card', 'savings', 'loan', 'loan_given'));
alter table accounts add column if not exists opening_balance numeric not null default 0;
-- credit_limit: for 'card' accounts, the total credit given; remaining = credit_limit - spent.
-- Unused (0) for all other account types, which continue to use opening_balance.
alter table accounts add column if not exists credit_limit numeric not null default 0;
-- sort_order: user-defined display order within each account type group (drag-to-reorder).
alter table accounts add column if not exists sort_order integer not null default 0;
-- is_active: false = archived (hidden from main list, history preserved). Hard delete is
-- only offered in the UI when an account has zero transactions.
alter table accounts add column if not exists is_active boolean not null default true;
-- matured: true once a savings account has been "matured" (principal + interest
-- transferred out to another account). Distinct from is_active: matured accounts
-- are hidden everywhere in the UI, including the archived-accounts list, since
-- their balance has already been moved elsewhere and they're not meant to be
-- unarchived/reused.
alter table accounts add column if not exists matured boolean not null default false;

-- Widen the type check constraint for databases created before 'loan_given' existed.
do $$ begin
  alter table accounts drop constraint if exists accounts_type_check;
  alter table accounts add constraint accounts_type_check
    check (type in ('cash', 'bank', 'card', 'savings', 'loan', 'loan_given'));
end $$;

-- Backfill sort_order for existing rows using creation order, once.
do $$ begin
  if exists (select 1 from accounts where sort_order = 0) then
    update accounts a set sort_order = t.rn
    from (select id, row_number() over (order by created_at, id) as rn from accounts) t
    where a.id = t.id;
  end if;
end $$;

-- Table 2: user-defined categories, separate lists for income and expense
create table if not exists categories (
  id         bigserial primary key,
  type       text not null check (type in ('income', 'expense')),
  name       text not null,
  icon       text not null default '🏷️',
  created_at timestamptz default now(),
  constraint categories_type_name_unique unique (type, name)
);

alter table categories add column if not exists icon text not null default '🏷️';

-- Table 3: transactions against accounts
-- type = 'income'   -> adds amount to account_id, has category_id
-- type = 'expense'  -> subtracts amount from account_id, has category_id
-- type = 'transfer' -> subtracts amount from account_id, adds amount to to_account_id, no category
create table if not exists transactions (
  id            bigserial primary key,
  type          text not null check (type in ('income', 'expense', 'transfer')),
  account_id    bigint not null references accounts(id),
  to_account_id bigint references accounts(id),
  category_id   bigint references categories(id),
  note          text,
  amount        numeric not null check (amount > 0),
  occurred_at   date not null default current_date,
  created_at    timestamptz default now()
);

-- Patch older versions of the transactions table that predate a column
alter table transactions add column if not exists to_account_id bigint references accounts(id);
alter table transactions add column if not exists category_id bigint references categories(id);
alter table transactions add column if not exists note text;
alter table transactions add column if not exists occurred_at date not null default current_date;

-- Older versions had a required "name" column, replaced by category_id + note.
-- Drop its NOT NULL constraint so it no longer blocks inserts (column itself is left in place).
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'transactions' and column_name = 'name'
  ) then
    alter table transactions alter column name drop not null;
  end if;
end $$;

-- Constraints can't use "if not exists", so drop-then-add each one
do $$ begin
  alter table transactions drop constraint if exists transfer_requires_to_account;
  alter table transactions add constraint transfer_requires_to_account
    check (type <> 'transfer' or to_account_id is not null);

  alter table transactions drop constraint if exists transfer_accounts_differ;
  alter table transactions add constraint transfer_accounts_differ
    check (to_account_id is null or to_account_id <> account_id);

  alter table transactions drop constraint if exists transfer_has_no_category;
  alter table transactions add constraint transfer_has_no_category
    check (type <> 'transfer' or category_id is null);

  alter table transactions drop constraint if exists income_expense_requires_category;
  alter table transactions add constraint income_expense_requires_category
    check (type = 'transfer' or category_id is not null);
end $$;

-- Allow public read/write (no login needed for this app)
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;

drop policy if exists "allow all accounts" on accounts;
drop policy if exists "allow all categories" on categories;
drop policy if exists "allow all transactions" on transactions;

create policy "allow all accounts" on accounts for all using (true) with check (true);
create policy "allow all categories" on categories for all using (true) with check (true);
create policy "allow all transactions" on transactions for all using (true) with check (true);
