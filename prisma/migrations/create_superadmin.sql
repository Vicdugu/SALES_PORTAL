-- Create superadmin user for system administration
-- Email: admin@questbridge.com
-- Password: admin123 (bcrypt hashed)
-- Role: SUPERADMIN

INSERT INTO "User" (id, email, password, name, role, "storeId", "isActive", "createdAt", "updatedAt")
VALUES (
  'superadmin_' || gen_random_uuid()::text,
  'admin@questbridge.com',
  '$2a$10$nOUIs5kJ7naTuTFkHi8H2OPST9/PgBkqquzi.Ss7KUUgO5ZeDi9NO',
  'System Administrator',
  'SUPERADMIN',
  NULL,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
