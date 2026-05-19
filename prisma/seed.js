/**
 * prisma/seed.js — Idempotent database seeder
 *
 * Ensures the SUPERADMIN user exists in the database on every deployment.
 * Safe to re-run — only creates records that are missing.
 *
 * Required env vars (set in Vercel → Settings → Environment Variables):
 *   SUPERADMIN_EMAIL     — e.g. victor.medugu@questbridge.co.uk
 *   SUPERADMIN_PASSWORD  — the admin's current password (min 8 chars)
 *
 * If SUPERADMIN_PASSWORD is not set, seeding is skipped and the build
 * continues normally. This prevents accidental overwrites and allows
 * the seed to be safe even when env vars are partially configured.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const SUPERADMIN_EMAIL =
  process.env.SUPERADMIN_EMAIL || 'victor.medugu@questbridge.co.uk';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;
const SUPERADMIN_NAME =
  process.env.SUPERADMIN_NAME || 'System Administrator';

async function seed() {
  // ── Guard: skip if password not configured ────────────────────────────────
  if (!SUPERADMIN_PASSWORD) {
    console.log(
      '[seed] ⚠️  SUPERADMIN_PASSWORD not set — skipping superadmin seed.\n' +
        '       Set it in Vercel → Settings → Environment Variables to enable.'
    );
    return;
  }

  if (SUPERADMIN_PASSWORD.length < 8) {
    console.error('[seed] ❌ SUPERADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  console.log(`[seed] Checking superadmin account (${SUPERADMIN_EMAIL})…`);

  // ── Check if a SUPERADMIN already exists ─────────────────────────────────
  const existing = await prisma.user.findFirst({
    where: { role: 'SUPERADMIN' },
    include: { store: true },
  });

  if (existing) {
    // ── Superadmin exists — sync email and password ───────────────────────
    const updates = {};
    const storeUpdates = {};

    if (existing.email !== SUPERADMIN_EMAIL) {
      updates.email = SUPERADMIN_EMAIL;
      storeUpdates.email = SUPERADMIN_EMAIL;
      console.log(`[seed] Updating email: ${existing.email} → ${SUPERADMIN_EMAIL}`);
    }

    // Always sync the password so the Vercel env var is the source of truth.
    const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);
    updates.password = hashedPassword;

    await prisma.user.update({
      where: { id: existing.id },
      data: updates,
    });

    if (Object.keys(storeUpdates).length > 0 && existing.storeId) {
      await prisma.store.update({
        where: { id: existing.storeId },
        data: storeUpdates,
      });
    }

    console.log(
      `[seed] ✅ Superadmin synced: ${SUPERADMIN_EMAIL} (password updated from env var)`
    );
    return;
  }

  // ── No superadmin found — create one ──────────────────────────────────────
  console.log('[seed] Creating superadmin…');

  const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);

  // Check if a store with this email already exists (e.g. from a previous
  // failed seed run that created the store but not the user).
  let store = await prisma.store.findUnique({
    where: { email: SUPERADMIN_EMAIL },
  });

  if (!store) {
    store = await prisma.store.create({
      data: {
        name: SUPERADMIN_NAME,
        email: SUPERADMIN_EMAIL,
        emailVerified: true,
        isApproved: true,
      },
    });
  }

  await prisma.user.create({
    data: {
      email: SUPERADMIN_EMAIL,
      password: hashedPassword,
      name: SUPERADMIN_NAME,
      role: 'SUPERADMIN',
      storeId: store.id,
      isActive: true,
    },
  });

  console.log(`[seed] ✅ Superadmin created: ${SUPERADMIN_EMAIL}`);
}

seed()
  .catch((e) => {
    console.error('[seed] ❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
