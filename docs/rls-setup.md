# Database Row-Level Security (RLS) Setup

## Overview

Row-Level Security policies have been enabled on all tenant-scoped tables.
The policies enforce that every query can only see rows belonging to the current
store, preventing cross-tenant data leakage at the database layer — a second
wall of defence behind the existing application-level `storeId` filters.

**Tables with RLS:**
- `Order`
- `User` (nullable storeId — SUPERADMIN users are visible in any context)
- `AuditLog`
- `StoreFeature`
- `Notification`
- `InventoryItem`
- `Advert` (nullable storeId — `NULL` = global advert, visible to all stores)
- `StaffMember`

---

## How It Works

Each policy checks a transaction-local GUC variable:

```sql
current_setting('app.current_store_id', TRUE)
```

The application sets this at the start of every transaction via:

```sql
SELECT set_config('app.current_store_id', $storeId, TRUE)
```

The `TRUE` flag makes the setting **transaction-local**, so it is automatically
cleared when the transaction ends. This is safe with PgBouncer in transaction
pooling mode (Neon's default).

SUPERADMIN cross-store access uses the sentinel value `'SUPERADMIN'`.

---

## Application Helpers

```ts
import { withTenantContext, withSuperadminContext } from '@/lib/db/tenant-context';

// Store-scoped query
const orders = await withTenantContext(storeId, (tx) =>
  tx.order.findMany({ where: { storeId } })
);

// SUPERADMIN cross-store query (only in verified-admin routes)
const allOrders = await withSuperadminContext((tx) =>
  tx.order.findMany()
);
```

---

## Enabling Full Enforcement (Requires One-Time Neon Setup)

By default the app connects as the **table owner**, which has the `BYPASSRLS`
privilege. RLS policies are defined and consistent, but the table owner bypasses
them. To enforce them, connect as a restricted role.

### Step 1 — Create a restricted role in Neon

Run in the Neon SQL editor (or any Postgres client connected as the admin role):

```sql
-- Create the restricted app role
CREATE ROLE app_rls_user WITH LOGIN PASSWORD 'choose-a-strong-password' NOINHERIT;

-- Grant connect + usage
GRANT CONNECT ON DATABASE neondb TO app_rls_user;
GRANT USAGE ON SCHEMA public TO app_rls_user;

-- Grant DML on existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rls_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rls_user;

-- Ensure future tables are covered too
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rls_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_rls_user;
```

### Step 2 — Build the restricted connection string

Use the same Neon hostname but with the new role credentials:

```
postgresql://app_rls_user:choose-a-strong-password@<your-neon-host>/neondb?sslmode=require
```

For the pooler endpoint, replace `@ep-...` with `@ep-...-pooler`.

### Step 3 — Set the env var

In Vercel (and locally in `.env.local`):

```
DATABASE_URL_RLS=postgresql://app_rls_user:...@<neon-pooler-host>/neondb?sslmode=require
```

Once this is set, `withTenantContext()` and `withSuperadminContext()` will
automatically use the restricted connection. Any query that runs outside a
`withTenantContext` wrapper **and** goes through the RLS client will see no
rows (silent fail-safe).

---

## Re-applying the Policies

The SQL is idempotent — run it again at any time:

```powershell
Get-Content prisma/rls-setup.sql | npx prisma db execute --stdin --schema prisma/schema.prisma
```

---

## Extending Coverage

To add `withTenantContext` to a new route:

```ts
// Before
const items = await prisma.inventoryItem.findMany({ where: { storeId } });

// After
const items = await withTenantContext(storeId, (tx) =>
  tx.inventoryItem.findMany({ where: { storeId } })
);
```

The `tx` client is a `Prisma.TransactionClient` — all normal Prisma operations work.
