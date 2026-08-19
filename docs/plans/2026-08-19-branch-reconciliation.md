# Branch Reconciliation Plan — sprint_5

**Goal:** Unify all diverged work onto `sprint_5` so it contains: the chatbot upgrade (currently on main/sprint_5), the teammate work stranded on `origin/develop` (workforce Lambda, .gitignore), the feature-branch work in local `develop` (data-analysis upload flow, skeleton components, dashboard trends), and the stranded tip commit `292eeeb` (gpt-4.1-mini model fix + OrdersSkeleton wiring).

**Branch facts (verified by controller):**
- `sprint_5` == `origin/main` (48e8df3), clean worktree.
- `sprint_5` is an **ancestor** of local `develop` (c3c0799) → merging local `develop` is a fast-forward.
- `origin/develop` (c38e422, "Update workforce AI scheduling flow") has 1 commit local `develop` lacks; it adds `backend/functions/workforce/handler.py` and reworks Workforce/Orders frontend.
- `292eeeb` is the tip of `origin/feature/chatbot-upgrade`, contained in NO other branch. It changes 2 files: chatbot model string `gpt-5-nano` → `gpt-4.1-mini`, and Orders.tsx loading state → `<OrdersSkeleton />`.
- Merge preview (`git merge-tree develop origin/develop`) shows exactly ONE conflict: `.gitignore` (add/add). Everything else auto-merges.

## Global Constraints
- `backend/functions/chatbot-assistant/lambda_function.py` MUST exist after all merges and use `model="gpt-4.1-mini"` (via cherry-pick).
- `docs/plans/2026-06-02-chatbot-upgrade*.md` MUST survive.
- No history rewriting; merges and cherry-pick only. No pushes to any remote.
- Final state must build: `npx tsc -b && npx vite build` succeeds in `frontend/`; every `backend/functions/**/*.py` passes `python3 -m py_compile`.

## Task 1: Merge sequence + Lambda dedupe (single implementer)

1. On `sprint_5`: `git merge develop` (expect fast-forward; if not, plain merge is fine).
2. `git merge origin/develop`. Resolve the `.gitignore` add/add conflict as the **union** of both versions with duplicates removed (keep sprint_5's Python/Lambda-artifact sections; add origin/develop's `.env.local`, `.DS_Store`, `**/.DS_Store` entries once each). Commit the merge.
3. `git cherry-pick 292eeeb`. If `frontend/src/pages/Orders.tsx` conflicts: keep the current (merged) file's content and apply ONLY the two cherry-pick changes on top — add `import { OrdersSkeleton } from "../components/ui/Skeleton"` and replace the plain-text loading return with `if (loading) return <OrdersSkeleton />`. The chatbot lambda hunk (model string) should apply cleanly.
4. Dedupe (controller ruling, already decided): `git rm backend/functions/data-summary/handler.py backend/functions/data-uploads-list/handler.py` — the `lambda_function.py` versions in those two dirs are authoritative (they use Cognito claims for branch_id and real DynamoDB queries; the handler.py versions hardcode branch-001 / mock data). Do NOT touch `orders*/handler.py` or `workforce/handler.py` (those have no duplicates). Commit as `chore: remove superseded duplicate lambda handlers`.
5. Verify: `frontend/`: `npm run build` (node_modules already installed). Backend: `find backend -name '*.py' -exec python3 -m py_compile {} +`. Sanity greps: `grep -n 'gpt-4.1-mini' backend/functions/chatbot-assistant/lambda_function.py`; `ls docs/plans/`; `git ls-files backend/functions` shows workforce/handler.py, data-upload/lambda_function.py, data-processor/lambda_function.py, chatbot-assistant/lambda_function.py.

**Deferred/noted (do not fix):** `data-summary/lambda_function.py` filters `forecast_type = 'inventory'` where the deleted handler.py used `'demand'` — flag in report if seed data contradicts it, do not change.

## Task 2: Review (whole-branch, since Task 1 is the only task)
Reviewer verifies global constraints, merge correctness (no silent loss of either side's features), and build evidence.
