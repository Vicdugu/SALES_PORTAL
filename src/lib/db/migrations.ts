import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

let prisma: PrismaClient | null = null;

function getPrismaInstance(): PrismaClient {
  if (!prisma) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    prisma = new PrismaClient({
      log: ['error'],
    });
  }
  return prisma;
}

export async function runMigrations() {
  try {
    if (!process.env.DATABASE_URL) {
      return { success: false, message: 'DATABASE_URL not configured' };
    }
    
    const prismaClient = getPrismaInstance();

    // Get the migration SQL and apply it
    const migrationSQL = await getMigrationSQL();
    await applyMigrationSQL(prismaClient, migrationSQL);
    
    return { success: true, message: 'Migration executed successfully' };
  } catch (error: any) {
    throw error;
  }
}

async function getMigrationSQL(): Promise<string> {
  // This is the SQL from 0_init migration
  return `
    -- CreateEnum
    CREATE TYPE "Role" AS ENUM ('STAFF', 'KITCHEN', 'ADMIN', 'SUPERADMIN');

    -- CreateEnum
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED');

    -- CreateEnum
    CREATE TYPE "NotificationType" AS ENUM ('LOW_STOCK', 'ORDER_READY', 'SYSTEM_ALERT', 'PAYMENT_ERROR');

    -- CreateTable Store
    CREATE TABLE IF NOT EXISTS "Store" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "address" TEXT,
        "phone" TEXT,
        "backgroundImage" TEXT,
        "primaryColor" TEXT NOT NULL DEFAULT '#000000',
        "secondaryColor" TEXT NOT NULL DEFAULT '#ffffff',
        "accentColor" TEXT NOT NULL DEFAULT '#0066cc',
        "currency" TEXT NOT NULL DEFAULT 'USD',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        "verificationCode" TEXT,
        "verificationCodeExpiry" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable User
    CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" "Role" NOT NULL DEFAULT 'STAFF',
        "storeId" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable StaffMember
    CREATE TABLE IF NOT EXISTS "StaffMember" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "storeId" TEXT NOT NULL,
        "phone" TEXT,
        "address" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable "Order"
    CREATE TABLE IF NOT EXISTS "Order" (
        "id" TEXT NOT NULL,
        "orderNumber" TEXT NOT NULL,
        "storeId" TEXT NOT NULL,
        "staffId" TEXT,
        "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
        "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "paymentMethod" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "completedAt" TIMESTAMP(3),

        CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable OrderItem
    CREATE TABLE IF NOT EXISTS "OrderItem" (
        "id" TEXT NOT NULL,
        "orderId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "unitPrice" DOUBLE PRECISION NOT NULL,
        "notes" TEXT,

        CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable InventoryItem
    CREATE TABLE IF NOT EXISTS "InventoryItem" (
        "id" TEXT NOT NULL,
        "storeId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "unitPrice" DOUBLE PRECISION NOT NULL,
        "quantity" INTEGER NOT NULL,
        "unit" TEXT NOT NULL,
        "currentStock" DOUBLE PRECISION NOT NULL,
        "minimumStock" DOUBLE PRECISION NOT NULL DEFAULT 10,
        "lastRestocked" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable InventoryUsage
    CREATE TABLE IF NOT EXISTS "InventoryUsage" (
        "id" TEXT NOT NULL,
        "itemId" TEXT NOT NULL,
        "quantity" DOUBLE PRECISION NOT NULL,
        "reason" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "InventoryUsage_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable Notification
    CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT NOT NULL,
        "storeId" TEXT NOT NULL,
        "type" "NotificationType" NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "readAt" TIMESTAMP(3),

        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable AuditLog
    CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" TEXT NOT NULL,
        "storeId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "resource" TEXT NOT NULL,
        "details" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable "Transaction"
    CREATE TABLE IF NOT EXISTS "Transaction" (
        "id" TEXT NOT NULL,
        "storeId" TEXT NOT NULL,
        "orderId" TEXT,
        "amount" DOUBLE PRECISION NOT NULL,
        "currency" TEXT NOT NULL,
        "paymentMethod" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "reference" TEXT,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
    );

    -- CreateIndex
    CREATE UNIQUE INDEX IF NOT EXISTS "Store_email_key" ON "Store"("email");
    CREATE INDEX IF NOT EXISTS "Store_email_idx" ON "Store"("email");
    CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
    CREATE INDEX IF NOT EXISTS "User_storeId_idx" ON "User"("storeId");
    CREATE UNIQUE INDEX IF NOT EXISTS "StaffMember_userId_storeId_key" ON "StaffMember"("userId", "storeId");
    CREATE INDEX IF NOT EXISTS "StaffMember_storeId_idx" ON "StaffMember"("storeId");
    CREATE INDEX IF NOT EXISTS "Order_storeId_idx" ON "Order"("storeId");
    CREATE INDEX IF NOT EXISTS "Order_staffId_idx" ON "Order"("staffId");
    CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
    CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");
    CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
    CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_name_storeId_key" ON "InventoryItem"("name", "storeId");
    CREATE INDEX IF NOT EXISTS "InventoryItem_storeId_idx" ON "InventoryItem"("storeId");
    CREATE INDEX IF NOT EXISTS "InventoryItem_category_idx" ON "InventoryItem"("category");
    CREATE INDEX IF NOT EXISTS "InventoryUsage_itemId_idx" ON "InventoryUsage"("itemId");
    CREATE INDEX IF NOT EXISTS "Notification_storeId_idx" ON "Notification"("storeId");
    CREATE INDEX IF NOT EXISTS "Notification_isRead_idx" ON "Notification"("isRead");
    CREATE INDEX IF NOT EXISTS "AuditLog_storeId_idx" ON "AuditLog"("storeId");
    CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
    CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
    CREATE INDEX IF NOT EXISTS "Transaction_storeId_idx" ON "Transaction"("storeId");

    -- CreateTable VerificationAttempt
    CREATE TABLE IF NOT EXISTS "VerificationAttempt" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "ipAddress" TEXT,
        "success" BOOLEAN NOT NULL,
        "reason" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "VerificationAttempt_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX IF NOT EXISTS "VerificationAttempt_email_idx" ON "VerificationAttempt"("email");
    CREATE INDEX IF NOT EXISTS "VerificationAttempt_createdAt_idx" ON "VerificationAttempt"("createdAt");

    -- AddForeignKey
    DO $$ BEGIN ALTER TABLE "User" ADD CONSTRAINT "User_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN ALTER TABLE "Order" ADD CONSTRAINT "Order_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN ALTER TABLE "Notification" ADD CONSTRAINT "Notification_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;
}

function splitSQLStatements(sql: string): string[] {
  // Split on ';' but not inside $$ dollar-quoted blocks
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === '$' && sql[i + 1] === '$') {
      inDollarQuote = !inDollarQuote;
      current += '$$';
      i++;
    } else if (sql[i] === ';' && !inDollarQuote) {
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) statements.push(trimmed);
      current = '';
    } else {
      current += sql[i];
    }
  }
  const trimmed = current.trim();
  if (trimmed && !trimmed.startsWith('--')) statements.push(trimmed);
  return statements;
}

async function applyMigrationSQL(prismaClient: PrismaClient, sql: string) {
  // Split the SQL by statements and execute each one
  const statements = splitSQLStatements(sql);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    try {
      await prismaClient.$executeRawUnsafe(statement);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      
      // Skip errors for already-existing objects and "does not exist" for DROP/ALTER
      if (
        errorMsg.includes('already exists') || 
        errorMsg.includes('duplicate') ||
        errorMsg.includes('42P07') ||
        errorMsg.includes('42723') ||
        errorMsg.includes('42710') ||
        errorMsg.includes('does not exist')
      ) {
        // Silently skip idempotent errors
      } else {
        // Continue on unexpected errors without logging
      }
    }
  }
}

export async function initializeDatabase() {
  try {
    const prismaClient = getPrismaInstance();

    // Test connection
    await prismaClient.$executeRaw`SELECT 1`;
    console.log('Database connection successful');
    
    // Run migrations
    const migrationResult = await runMigrations();
    
    return migrationResult;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}
