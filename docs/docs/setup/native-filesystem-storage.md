---
id: native-filesystem-storage
---

# Native filesystem storage

Pingvin Share X can store uploads with their **original filenames and folder structure** so administrators can browse them over SMB/NFS on a NAS (for example TrueNAS) without re-downloading through the web UI.

## Layout

New local uploads are stored under `{DATA_DIRECTORY}/uploads/`:

```
uploads/
  Incoming/
    Share-ABC123/
      Day1/
        IMG0001.CR3
      Day2/
        IMG0002.CR3
      Drone/
        DJI001.mp4
```

- Each share gets its own directory.
- Nested folder uploads are preserved (not flattened).
- Duplicate names in the same folder become `photo (1).jpg`, `photo (2).jpg`, etc.
- Temporary chunk files live in `.pingvin-tmp/` inside the share directory.

Legacy shares that still use opaque UUID filenames continue to work. Their path is treated as `uploads/shares/{shareId}/{fileId}`.

## Configuration

In **Admin → Configuration → Share** (or `config.yaml`):

| Setting | Description |
| --- | --- |
| `folderNamingScheme` | `shareId`, `dateShareId`, `shareName`, `uploaderDate`, or `custom` |
| `folderNamingTemplate` | Template when scheme is `custom` (`{id}`, `{shareName}`, `{uploader}`, `{date}`) |
| `incomingFolder` | Relative folder under uploads for new shares (default `Incoming`) |
| `displayPathPrefix` | Optional path shown in the admin UI (e.g. `/mnt/tank/media/uploads`) matching your SMB mount |

## Admin tools

On **Admin → Shares**:

- Share info shows **Filesystem location** with **Copy path**
- **Move share** relocates a share directory on disk (rename when possible) and updates the database path

## Migrating existing shares

After upgrading, new uploads use the native layout automatically. To convert existing UUID-named shares:

```bash
cd backend
npm run migrate:native-storage -- --dry-run
npm run migrate:native-storage
```

This moves `uploads/shares/{id}/` into the configured incoming folder naming scheme and renames opaque file IDs to their original relative paths.

## S3

S3 storage is unchanged. Filesystem location, move, and native folder naming apply only to local storage.
