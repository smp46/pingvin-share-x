INSERT INTO "Config" (
  "updatedAt",
  "name",
  "category",
  "type",
  "defaultValue",
  "value",
  "obscured",
  "secret",
  "locked",
  "order"
) VALUES (
  CURRENT_TIMESTAMP,
  'enableShareDownloadNotifications',
  'email',
  'boolean',
  'false',
  NULL,
  0,
  0,
  0,
  9
);

INSERT INTO "Config" (
  "updatedAt",
  "name",
  "category",
  "type",
  "defaultValue",
  "value",
  "obscured",
  "secret",
  "locked",
  "order"
) VALUES (
  CURRENT_TIMESTAMP,
  'shareDownloadNotificationSubject',
  'email',
  'string',
  'Your file was downloaded',
  NULL,
  0,
  1,
  0,
  10
);

INSERT INTO "Config" (
  "updatedAt",
  "name",
  "category",
  "type",
  "defaultValue",
  "value",
  "obscured",
  "secret",
  "locked",
  "order"
) VALUES (
  CURRENT_TIMESTAMP,
  'shareDownloadNotificationMessage',
  'email',
  'text',
  'Hey!\n\n{recipientEmail} downloaded {fileName} from your share: {shareUrl}\n\nPingvin Share 🐧',
  NULL,
  0,
  1,
  0,
  11
);
