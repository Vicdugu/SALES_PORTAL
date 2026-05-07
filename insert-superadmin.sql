INSERT INTO "User" (id, email, password, name, role, storeId, isActive, createdAt, updatedAt)
VALUES (
  'clvpmosuvjaxbae8ccabee214573',
  'admin@questbridge.com',
  '$2b$10$MiValoj5Gi7YmeIk.y5b.OP8ANUMvzdzttuVZdlQh1GgsFK90ml.q',
  'System Administrator',
  'SUPERADMIN',
  NULL,
  1,
  datetime('now'),
  datetime('now')
)
ON CONFLICT(email) DO NOTHING;

SELECT * FROM "User" WHERE email = 'admin@questbridge.com';
