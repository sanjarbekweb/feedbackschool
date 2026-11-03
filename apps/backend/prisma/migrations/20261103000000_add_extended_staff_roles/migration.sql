-- Seed and ensure all 5 standard staff roles exist and are active
INSERT INTO "staff_roles" ("id", "name", "isActive", "createdAt")
VALUES
  ('principal', 'Direktor', true, NOW()),
  ('psychologist', 'Psixolog', true, NOW()),
  ('counselor', 'Maktab maslahatchi', true, NOW()),
  ('mmibdo', 'MMIBDO''', true, NOW()),
  ('otibdo', 'O''TIBDO''', true, NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "isActive" = true;
