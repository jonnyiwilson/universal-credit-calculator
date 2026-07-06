# Codex backup: UC help platform work

This branch contains a backup of Codex workspace changes captured from an extracted repository archive where local `git` was unavailable.

## Restore

1. Concatenate the chunk files in numeric order:

```powershell
Get-Content codex-backup/uc-help-platform-backup.zip.b64.part-* | Set-Content uc-help-platform-backup.zip.b64 -NoNewline
[IO.File]::WriteAllBytes('uc-help-platform-backup.zip', [Convert]::FromBase64String((Get-Content -Raw uc-help-platform-backup.zip.b64)))
Expand-Archive uc-help-platform-backup.zip -DestinationPath restored-changes
```

2. Copy the restored files over a fresh checkout of `jonnyiwilson/universal-credit-calculator`.

## Notes

- This is a backup branch, not a polished PR branch.
- It includes changed source/docs/test/config files only.
- Generated build output, `node_modules`, Wrangler local state, and TypeScript build-info files were excluded.
