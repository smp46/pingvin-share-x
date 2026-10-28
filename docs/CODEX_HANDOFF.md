# Codex handoff — RV Files

Read first: `docs/superpowers/specs/2026-10-28-ps2-file-sharing-design.md` (why) and
`docs/superpowers/plans/2026-10-28-rv-files.md` (what, task by task).

Tick the `- [ ]` checkboxes in the plan as tasks finish, so Claude can resume at 12:30 from the
plan's state. Commit after every task with the message given in the plan.

## Prompt for Codex session 1 — backend track (run in `rv-files/` on branch `main`)

> Implement Tasks 1–6 of `docs/superpowers/plans/2026-10-28-rv-files.md` in order, following the
> Global Constraints and Review Focus sections exactly. Read the spec it links first. Run each
> task's verification steps and only tick a checkbox when its expected output is seen. Do not edit
> frontend files except `showCreateUploadModal.tsx`, `pages/upload/index.tsx` (Task 3) and
> `services/share.service.ts` (Task 5). Commit after each task. Stop after Task 6 and summarise
> what passed and anything you could not verify.

## Prompt for Codex session 2 — frontend track (separate worktree, branch `frontend`)

Setup: `git worktree add ../rv-files-frontend -b frontend` then open `../rv-files-frontend`.

> Implement Tasks 7, 8 and 9 of `docs/superpowers/plans/2026-10-28-rv-files.md`, following the
> Global Constraints exactly (Tailwind with NO preflight, do not upgrade React or Mantine, drop any
> RareUI component that needs React 19). Rely only on the Interfaces blocks for backend shapes;
> mock `share.safety` if the backend isn't ready. Do not edit `showCreateUploadModal.tsx`,
> `services/share.service.ts`, or any backend file. Commit after each task. Stop after Task 9
> (Task 10 waits for the backend merge).

## Left for Claude at 12:30

Task 10 (after merging backend), Task 11 (merge + attack demo + fresh deploy), Task 12 (README),
plus a review of whatever Codex produced.
