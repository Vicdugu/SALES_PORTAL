-- =============================================================================
-- Row-Level Security (RLS) Setup
-- =============================================================================
-- Apply with: npx prisma db execute --stdin < prisma/rls-setup.sql
--
-- This file is idempotent — safe to run multiple times.
--
-- Enforcement requires a restricted DB role that does NOT have BYPASSRLS.
-- See docs/rls-setup.md for full instructions on creating the role in Neon.
-- Without DATABASE_URL_RLS, the policies are defined but the main connection
-- (table owner) bypasses RLS. Set DATABASE_URL_RLS to a restricted connection
-- string for full enforcement.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- STEP 1: Enable Row-Level Security on all tenant-scoped tables
-- ---------------------------------------------------------------------------

ALTER TABLE "Order"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoreFeature"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Advert"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffMember"   ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- STEP 2: Drop any existing policies (for idempotent re-runs)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "rls_order_isolation"         ON "Order";
DROP POLICY IF EXISTS "rls_user_isolation"          ON "User";
DROP POLICY IF EXISTS "rls_auditlog_isolation"      ON "AuditLog";
DROP POLICY IF EXISTS "rls_storefeature_isolation"  ON "StoreFeature";
DROP POLICY IF EXISTS "rls_notification_isolation"  ON "Notification";
DROP POLICY IF EXISTS "rls_inventoryitem_isolation" ON "InventoryItem";
DROP POLICY IF EXISTS "rls_advert_isolation"        ON "Advert";
DROP POLICY IF EXISTS "rls_staffmember_isolation"   ON "StaffMember";


-- ---------------------------------------------------------------------------
-- STEP 3: Create isolation policies
--
-- Logic: allow access when EITHER
--   a) the row's storeId matches the transaction-local app.current_store_id, OR
--   b) the context is 'SUPERADMIN' (cross-tenant admin access)
--
-- app.current_store_id is set per-transaction via:
--   SELECT set_config('app.current_store_id', $storeId, TRUE)
-- The TRUE flag makes it transaction-local (safe with PgBouncer transaction pooling).
-- ---------------------------------------------------------------------------

-- Order: strict store isolation
CREATE POLICY "rls_order_isolation" ON "Order"
  FOR ALL
  USING (
    "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  )
  WITH CHECK (
    "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  );

-- User: nullable storeId — SUPERADMIN users have storeId IS NULL and must be
-- accessible when no store context is needed (e.g., cross-tenant lookup).
CREATE POLICY "rls_user_isolation" ON "User"
  FOR ALL
  USING (
    "storeId" IS NULL
    OR "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  )
  WITH CHECK (
    "storeId" IS NULL
    OR "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  );

-- AuditLog: strict store isolation
CREATE POLICY "rls_auditlog_isolation" ON "AuditLog"
  FOR ALL
  USING (
    "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  )
  WITH CHECK (
    "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  );

-- StoreFeature: strict store isolation
CREATE POLICY "rls_storefeature_isolation" ON "StoreFeature"
  FOR ALL
  USING (
    "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  )
  WITH CHECK (
    "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  );

-- Notification: strict store isolation
CREATE POLICY "rls_notification_isolation" ON "Notification"
  FOR ALL
  USING (
    "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  )
  WITH CHECK (
    "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  );

-- InventoryItem: strict store isolation
CREATE POLICY "rls_inventoryitem_isolation" ON "InventoryItem"
  FOR ALL
  USING (
    "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  )
  WITH CHECK (
    "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  );

-- Advert: nullable storeId — null means global (visible to all stores)
CREATE POLICY "rls_advert_isolation" ON "Advert"
  FOR ALL
  USING (
    "storeId" IS NULL
    OR "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  )
  WITH CHECK (
    "storeId" IS NULL
    OR "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  );

-- StaffMember: strict store isolation
CREATE POLICY "rls_staffmember_isolation" ON "StaffMember"
  FOR ALL
  USING (
    "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  )
  WITH CHECK (
    "storeId" = current_setting('app.current_store_id', TRUE)
    OR current_setting('app.current_store_id', TRUE) = 'SUPERADMIN'
  );
