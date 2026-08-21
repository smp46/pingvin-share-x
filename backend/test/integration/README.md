# Integration suite

Drives a running instance over HTTP and checks the flows the unit tests
cannot reach: signing up, signing in, uploading, downloading, password
protected shares and the antivirus verdict.

Nothing here is mocked. A share really gets uploaded, ClamAV really scans it,
and the files really come back down again.

## Running it

The stack has to be up first.

```bash
docker compose -f docker-compose.local.yml up -d
cd backend && npm run test:integration
```

Against something other than the local stack:

```bash
INTEGRATION_BASE_URL=https://transfer.example.com/api npm run test:integration
```

## Admin cases

Blocking, rescanning and the share list need a real administrator, and an
account cannot promote itself over the API. Without these two variables those
tests are skipped rather than failed:

```bash
INTEGRATION_ADMIN_EMAIL=admin@example.com \
INTEGRATION_ADMIN_PASSWORD=... \
npm run test:integration
```

## Rate limits

The auth endpoints allow 20 calls per 5 minutes per IP and the suite creates a
handful of accounts per run, so a few runs in a row will hit the limit. It
reports that clearly instead of failing on an unrelated assertion.

To run it repeatedly, start the backend with rate limiting off:

```bash
DISABLE_RATE_LIMIT=true docker compose -f docker-compose.local.yml up -d
```

Only ever on a local instance. That limit is what stops password guessing.

## Housekeeping

Every account and share is named after a per run id and removed afterwards, so
the suite can be pointed at an instance that already holds real data. A run
that is interrupted partway can leave a few behind; they all carry the run
prefix and the `@integration.invalid` domain.

These specs are excluded from `npm test` and from CI, since both run without a
server.
