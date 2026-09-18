-- This is an empty migration.
UPDATE "Config" SET "order" = 4 WHERE "name" = 'defaultLanguage';

INSERT INTO "Config" ("category", "name", "order", "type", "value", "defaultValue", "updatedAt", "secret") 
VALUES ('general', 'showAuthButtons', 3, 'boolean', 'true', 'true', unixepoch(), false);